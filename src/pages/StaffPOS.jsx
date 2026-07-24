import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, Package, Plus, Minus, Trash2, LogOut, CheckCircle } from "lucide-react";
import { offlineCache, CACHE_KEYS } from "@/components/utils";
import { useOnlineStatus } from "@/components/shared/useOnlineStatus";
import { playScanBeep, playErrorBuzz } from "@/components/pos/scanSound";
import SearchInput from "@/components/shared/SearchInput";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StaffPOS() {
  const queryClient = useQueryClient();
  const { isOnline } = useOnlineStatus();
  const searchInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [cart, setCart] = useState([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saleComplete, setSaleComplete] = useState(false);
  const [saleError, setSaleError] = useState("");
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.Company.list().then(cs => cs.length > 0 && setCompany(cs[0])).catch(() => {});
    const timer = setTimeout(() => searchInputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!checkoutOpen) setTimeout(() => searchInputRef.current?.focus(), 100);
  }, [checkoutOpen]);

  // Products — online-first, cache fallback
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      if (isOnline) {
        try {
          const data = await base44.entities.Product.filter({ status: "active" });
          offlineCache.set(CACHE_KEYS.PRODUCTS, data);
          return data;
        } catch (_) {}
      }
      return offlineCache.get(CACHE_KEYS.PRODUCTS) || [];
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      if (isOnline) {
        try {
          const data = await base44.entities.Inventory.list();
          offlineCache.set(CACHE_KEYS.INVENTORY, data);
          return data;
        } catch (_) {}
      }
      return offlineCache.get(CACHE_KEYS.INVENTORY) || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const stockByProduct = inventory.reduce((acc, inv) => {
    if (inv.quantity > 0) acc[inv.product_id] = (acc[inv.product_id] || 0) + inv.quantity;
    return acc;
  }, {});

  const activeProducts = products.filter(p => p.status === "active" || !p.status);

  const filteredProducts = activeProducts.filter(p => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      p.name?.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term) ||
      (p.barcodes || []).some(b => b.toLowerCase().includes(term))
    );
  });

  const searchResults = filteredProducts.slice(0, 10);

  const addToCart = (product) => {
    playScanBeep();
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id
          ? { ...i, quantity: i.quantity + 1, total: i.unit_price * (i.quantity + 1) }
          : i
        );
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        unit_price: product.selling_price,
        quantity: 1,
        tax: (product.selling_price * (product.tax_rate || 0)) / 100,
        discount: 0,
        total: product.selling_price,
      }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart(prev => prev
      .map(i => i.product_id === productId ? { ...i, quantity: i.quantity + delta, total: i.unit_price * (i.quantity + delta) } : i)
      .filter(i => i.quantity > 0)
    );
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setHighlightedIndex(0);
    setShowDropdown(true);
    // Instant barcode match
    const trimmed = val.trim();
    if (trimmed.length >= 4) {
      const exact = activeProducts.find(p =>
        p.sku === trimmed || (p.barcodes || []).some(b => b === trimmed)
      );
      if (exact) {
        addToCart(exact);
        setTimeout(() => { setSearchTerm(""); setShowDropdown(false); setHighlightedIndex(0); searchInputRef.current?.focus(); }, 50);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlightedIndex(i => Math.min(i + 1, searchResults.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlightedIndex(i => Math.max(i - 1, 0)); return; }
    if (e.key === "Escape") { setShowDropdown(false); return; }
    if (e.key !== "Enter") return;
    const term = searchTerm.trim();
    if (showDropdown && searchResults.length > 0) {
      addToCart(searchResults[highlightedIndex] || searchResults[0]);
      setSearchTerm(""); setShowDropdown(false); setHighlightedIndex(0);
      e.preventDefault(); return;
    }
    const exact = activeProducts.find(p => p.sku === term || (p.barcodes || []).some(b => b === term));
    if (exact) { addToCart(exact); setSearchTerm(""); setShowDropdown(false); e.preventDefault(); }
    else if (term) playErrorBuzz();
  };

  const subtotal = cart.reduce((s, i) => s + i.total, 0);
  const taxTotal = cart.reduce((s, i) => s + i.tax * i.quantity, 0);
  const grandTotal = subtotal + taxTotal;

  const createSaleMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) {
        throw new Error("Company not loaded yet. Please wait a moment and try again.");
      }
      const invoiceNumber = `INV-${Date.now()}`;
      const saleData = {
        company_id: company.id,
        invoice_number: invoiceNumber,
        customer_name: "Walk-in Customer",
        sale_date: new Date().toISOString(),
        items: cart,
        subtotal,
        tax_amount: taxTotal,
        discount_amount: 0,
        total_amount: grandTotal,
        payment_method: paymentMethod,
        payment_status: "paid",
        amount_paid: grandTotal,
        amount_due: 0,
        cashier: user?.email || "staff",
      };
      const sale = await base44.entities.Sale.create(saleData);

      // FEFO deduction
      for (const item of cart) {
        const records = await base44.entities.Inventory.filter({ product_id: item.product_id, company_id: company.id });
        const sorted = [...records].sort((a, b) => {
          if (!a.expiration_date && !b.expiration_date) return 0;
          if (!a.expiration_date) return 1;
          if (!b.expiration_date) return -1;
          return new Date(a.expiration_date) - new Date(b.expiration_date);
        });
        let remaining = item.quantity;
        for (const inv of sorted) {
          if (remaining <= 0) break;
          if ((inv.quantity || 0) <= 0) continue;
          const deduct = Math.min(inv.quantity, remaining);
          await base44.entities.Inventory.update(inv.id, { quantity: inv.quantity - deduct });
          remaining -= deduct;
        }
      }
      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["inventory"]);
      setCart([]);
      setCheckoutOpen(false);
      setSaleComplete(true);
      setSaleError("");
      setTimeout(() => setSaleComplete(false), 3000);
    },
    onError: (error) => {
      setSaleError(error?.message || "Sale failed. Please try again.");
    }
  });

  const currency = company?.currency || "NGN";
  const fmt = (n) => `${currency === "NGN" ? "₦" : currency}${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleScanResult = (text) => {
    setSearchTerm(text);
    setShowDropdown(true);
    setHighlightedIndex(0);
    const exact = activeProducts.find(p =>
      p.sku === text || (p.barcodes || []).some(b => b === text)
    );
    if (exact) {
      addToCart(exact);
      setSearchTerm("");
      setShowDropdown(false);
      setHighlightedIndex(0);
      searchInputRef.current?.focus();
    } else {
      playErrorBuzz();
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-lg safe-area-top">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">Staff POS</p>
            {user && <p className="text-xs text-blue-200">{user.full_name || user.email}</p>}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => base44.auth.logout()} className="text-white hover:bg-white/20 gap-2 text-xs">
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </header>

      {/* Sale success banner */}
      {saleComplete && (
        <div className="bg-green-600 text-white px-4 py-2 flex items-center gap-2 shrink-0 text-sm font-semibold">
          <CheckCircle className="w-4 h-4" /> Sale completed successfully!
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Left: Product search */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search bar */}
          <div className="p-3 bg-white border-b shrink-0">
            <div className="relative">
              <SearchInput
                inputRef={searchInputRef}
                placeholder="Search product or scan barcode..."
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                onScan={handleScanResult}
                className="h-10 text-sm"
              />
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-[50vh] overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-slate-400">
                      <Package className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      No matching products
                    </div>
                  ) : searchResults.map((product, idx) => (
                    <div
                      key={product.id}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${idx === highlightedIndex ? "bg-blue-50" : "hover:bg-slate-50"}`}
                      onMouseDown={() => { addToCart(product); setSearchTerm(""); setShowDropdown(false); setHighlightedIndex(0); searchInputRef.current?.focus(); }}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                    >
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {product.image_url
                          ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          : <Package className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{product.name}</p>
                        <p className="text-xs text-slate-500">{product.category || "Product"}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-blue-600 text-sm">{fmt(product.selling_price || 0)}</p>
                        <p className={`text-xs ${(stockByProduct[product.id] || 0) < 5 ? "text-red-500" : "text-slate-400"}`}>
                          Stock: {stockByProduct[product.id] || 0}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-auto p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(searchTerm ? filteredProducts : activeProducts.slice(0, 40)).map(product => {
                const stock = stockByProduct[product.id] || 0;
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="bg-white rounded-xl p-3 text-left shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-md active:scale-95 transition-all"
                  >
                    <div className="w-full aspect-square rounded-lg bg-slate-100 mb-2 overflow-hidden flex items-center justify-center">
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        : <Package className="w-8 h-8 text-slate-300" />}
                    </div>
                    <p className="font-semibold text-slate-900 text-xs truncate">{product.name}</p>
                    <p className="text-blue-600 font-bold text-sm mt-0.5">{fmt(product.selling_price || 0)}</p>
                    {stock < 5 && <p className="text-red-500 text-xs mt-0.5">Low stock: {stock}</p>}
                  </button>
                );
              })}
            </div>
            {activeProducts.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Package className="w-14 h-14 mx-auto mb-3 text-slate-200" />
                <p>No products available</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="w-full md:w-[360px] bg-white border-l border-slate-200 flex flex-col shrink-0 max-h-[50vh] md:max-h-full">
          <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Cart <span className="text-sm opacity-75">({cart.length})</span>
              </h2>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-white/70 hover:text-white">Clear</button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2">
                <ShoppingCart className="w-12 h-12" />
                <p className="text-sm">Cart is empty</p>
              </div>
            ) : (
              <div className="divide-y">
                {cart.map(item => (
                  <div key={item.product_id} className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{item.product_name}</p>
                      <p className="text-xs text-slate-500">{fmt(item.unit_price)} each</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => updateQty(item.product_id, -1)} className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                        <Minus className="w-3 h-3 text-slate-600" />
                      </button>
                      <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
                      <button onClick={() => updateQty(item.product_id, 1)} className="w-6 h-6 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center">
                        <Plus className="w-3 h-3 text-blue-600" />
                      </button>
                    </div>
                    <p className="text-sm font-bold text-slate-900 w-20 text-right shrink-0">{fmt(item.total)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-4 border-t bg-slate-50 shrink-0">
              <div className="flex justify-between text-lg font-bold mb-3">
                <span>Total</span>
                <span className="text-blue-600">{fmt(grandTotal)}</span>
              </div>
              <Button className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 font-bold" onClick={() => setCheckoutOpen(true)}>
                Complete Sale
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Checkout dialog */}
      <Dialog open={checkoutOpen} onOpenChange={(o) => { setCheckoutOpen(o); if (!o) setSaleError(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Complete Sale</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Subtotal</span><span>{fmt(subtotal)}</span>
              </div>
              {taxTotal > 0 && (
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">Tax</span><span>{fmt(taxTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t pt-2 mt-2">
                <span>Total</span><span className="text-blue-600">{fmt(grandTotal)}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Payment Method</p>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {saleError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {saleError}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setCheckoutOpen(false); setSaleError(""); }}>Cancel</Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => createSaleMutation.mutate()} disabled={createSaleMutation.isPending || !company}>
                {createSaleMutation.isPending ? "Processing..." : "Confirm Sale"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}