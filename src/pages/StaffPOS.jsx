import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, Package, Plus, Minus, Trash2, LogOut, CheckCircle, History, Keyboard } from "lucide-react";
import SaleHistoryDialog from "@/components/pos/SaleHistoryDialog";
import PinnedItems from "@/components/pos/PinnedItems";
import { offlineCache, CACHE_KEYS } from "@/components/utils";
import { useOnlineStatus } from "@/components/shared/useOnlineStatus";
import { playScanBeep, playErrorBuzz } from "@/components/pos/scanSound";
import SearchInput from "@/components/shared/SearchInput";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DrawerSelect from "@/components/shared/DrawerSelect";

export default function StaffPOS() {
  const queryClient = useQueryClient();
  const { isOnline } = useOnlineStatus();
  const searchInputRef = useRef(null);
  const createSaleRef = useRef(null);
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
  const [companyLoading, setCompanyLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [scanWarning, setScanWarning] = useState("");
  const lastScanRef = useRef({ productId: null, time: 0 });
  const cartRef = useRef([]);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      // Load company by the user's company_id — more reliable than list() which depends on RLS
      if (u?.company_id) {
        base44.entities.Company.filter({ id: u.company_id })
          .then(cs => {
            if (cs.length > 0) setCompany(cs[0]);
            setCompanyLoading(false);
          })
          .catch(() => setCompanyLoading(false));
      } else {
        setCompanyLoading(false);
      }
    }).catch(() => setCompanyLoading(false));
    const timer = setTimeout(() => searchInputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!checkoutOpen) setTimeout(() => searchInputRef.current?.focus(), 100);
  }, [checkoutOpen]);

  // Global keyboard shortcuts — only function keys and Esc, safe while typing in inputs
  useEffect(() => {
    const handler = (e) => {
      const key = e.key;
      // F1: toggle shortcuts help
      if (key === "F1") { e.preventDefault(); setShowShortcuts(s => !s); return; }
      // F2: focus search bar
      if (key === "F2") { e.preventDefault(); searchInputRef.current?.focus(); searchInputRef.current?.select(); return; }
      // F9: complete sale
      if (key === "F9") {
        e.preventDefault();
        if (saleComplete || createSaleRef.current?.isPending) return;
        if (checkoutOpen) {
          if (company || user?.company_id) createSaleRef.current?.mutate();
        } else if (cart.length > 0) {
          setCheckoutOpen(true);
        }
        return;
      }
      // F4: clear cart
      if (key === "F4") {
        e.preventDefault();
        if (!checkoutOpen && cart.length > 0) setCart([]);
        return;
      }
      // Escape handled by search input already; here close dialogs when not focused on input
      if (key === "Escape") {
        if (checkoutOpen) { setCheckoutOpen(false); setSaleError(""); }
        else if (showDropdown) setShowDropdown(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [checkoutOpen, cart.length, saleComplete, company, user, showDropdown]);

  // Products — online-first, cache fallback
  const { data: products = [] } = useQuery({
    queryKey: ["products", company?.id || user?.company_id],
    queryFn: async () => {
      const cid = company?.id || user?.company_id;
      if (!cid) return offlineCache.get(CACHE_KEYS.PRODUCTS) || [];
      if (isOnline) {
        try {
          const data = await base44.entities.Product.filter({ company_id: cid, status: "active" });
          offlineCache.set(CACHE_KEYS.PRODUCTS, data);
          return data;
        } catch (_) {}
      }
      return offlineCache.get(CACHE_KEYS.PRODUCTS) || [];
    },
    enabled: !!(company?.id || user?.company_id),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory", company?.id || user?.company_id],
    queryFn: async () => {
      const cid = company?.id || user?.company_id;
      if (!cid) return offlineCache.get(CACHE_KEYS.INVENTORY) || [];
      if (isOnline) {
        try {
          const data = await base44.entities.Inventory.filter({ company_id: cid });
          offlineCache.set(CACHE_KEYS.INVENTORY, data);
          return data;
        } catch (_) {}
      }
      return offlineCache.get(CACHE_KEYS.INVENTORY) || [];
    },
    enabled: !!(company?.id || user?.company_id),
    staleTime: 2 * 60 * 1000,
  });

  const stockByProduct = inventory.reduce((acc, inv) => {
    if (inv.quantity > 0) acc[inv.product_id] = (acc[inv.product_id] || 0) + inv.quantity;
    return acc;
  }, {});

  // Recent sales for favorites/best-sellers calculation
  const { data: sales = [] } = useQuery({
    queryKey: ["staff_sales", company?.id || user?.company_id],
    queryFn: () => base44.entities.Sale.filter({ company_id: company?.id || user?.company_id }, "-sale_date", 100),
    enabled: !!(company?.id || user?.company_id),
    staleTime: 5 * 60 * 1000,
  });

  const activeProducts = products.filter(p => p.status === "active" || !p.status);

  // Categories for filtering
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", company?.id || user?.company_id],
    queryFn: () => base44.entities.Category.filter(
      { company_id: company?.id || user?.company_id, is_active: true },
      "sort_order"
    ),
    enabled: !!(company?.id || user?.company_id),
    staleTime: 5 * 60 * 1000,
  });

  const categoryFilteredProducts = selectedCategory
    ? activeProducts.filter(p => p.category === selectedCategory)
    : activeProducts;

  const filteredProducts = categoryFilteredProducts.filter(p => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      p.name?.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term) ||
      (p.barcodes || []).some(b => b.toLowerCase().includes(term))
    );
  });

  const searchResults = filteredProducts.slice(0, 10);

  // Resolve a scanned barcode/SKU to a single product.
  // If multiple products share the same barcode, pick the one with the highest
  // stock and delete the duplicates that have zero stock (data cleanup).
  const resolveScanMatch = (text) => {
    const trimmed = text.trim();
    if (trimmed.length < 4) return null;
    const matches = activeProducts.filter(p =>
      p.sku === trimmed || (p.barcodes || []).some(b => b === trimmed)
    );
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0];
    // Multiple products share the same barcode — sort by stock descending
    const sorted = matches
      .map(p => ({ product: p, stock: stockByProduct[p.id] || 0 }))
      .sort((a, b) => b.stock - a.stock);
    const best = sorted[0].product;
    const companyId = company?.id || user?.company_id;
    // Delete zero-stock duplicates to prevent future confusion
    const dupes = sorted.slice(1).filter(({ stock }) => stock <= 0);
    if (companyId && dupes.length > 0) {
      setScanWarning(`Removed ${dupes.length} duplicate product(s) with zero stock sharing barcode "${trimmed}".`);
      setTimeout(() => setScanWarning(""), 5000);
      dupes.forEach(({ product }) => {
        base44.entities.Product.delete(product.id)
          .then(() => queryClient.invalidateQueries(["products"]))
          .catch(() => {});
      });
    }
    return best;
  };

  cartRef.current = cart;

  const addToCart = (product) => {
    // Prevent double-add when a hardware scanner fires onChange + Enter rapidly
    const now = Date.now();
    if (lastScanRef.current.productId === product.id && (now - lastScanRef.current.time) < 800) {
      return;
    }
    lastScanRef.current = { productId: product.id, time: now };
    // Block adding more than available stock — no negative-inventory sales
    const currentQty = cartRef.current.find(i => i.product_id === product.id)?.quantity || 0;
    const available = stockByProduct[product.id] || 0;
    if (available <= 0 || currentQty >= available) {
      playErrorBuzz();
      setSaleError(`"${product.name}" — only ${available} in stock.`);
      setTimeout(() => setSaleError(""), 3000);
      return;
    }
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
    if (delta > 0) {
      const item = cartRef.current.find(i => i.product_id === productId);
      const available = stockByProduct[productId] || 0;
      if (item && item.quantity + delta > available) {
        playErrorBuzz();
        setSaleError(`Only ${available} of this item in stock.`);
        setTimeout(() => setSaleError(""), 3000);
        return;
      }
    }
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
    // Instant barcode match (resolves duplicates by stock)
    const exact = resolveScanMatch(val);
    if (exact) {
      addToCart(exact);
      setSearchTerm("");
      setShowDropdown(false);
      setHighlightedIndex(0);
      setTimeout(() => searchInputRef.current?.focus(), 50);
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
    const exact = resolveScanMatch(term);
    if (exact) { addToCart(exact); setSearchTerm(""); setShowDropdown(false); e.preventDefault(); }
    else if (term) playErrorBuzz();
  };

  const subtotal = cart.reduce((s, i) => s + i.total, 0);
  const taxTotal = cart.reduce((s, i) => s + i.tax * i.quantity, 0);
  const grandTotal = subtotal + taxTotal;

  const createSaleMutation = useMutation({
    mutationFn: async () => {
      const companyId = company?.id || user?.company_id;
      if (!companyId) {
        throw new Error("Company not loaded yet. Please wait a moment and try again.");
      }
      // Final stock guard — block the sale if any line exceeds available quantity
      for (const item of cartRef.current) {
        const available = stockByProduct[item.product_id] || 0;
        if (item.quantity < 1) {
          throw new Error(`"${item.product_name}" has an invalid quantity.`);
        }
        if (item.quantity > available) {
          throw new Error(`"${item.product_name}" — only ${available} in stock (requested ${item.quantity}).`);
        }
      }
      const invoiceNumber = `INV-${Date.now()}`;
      const saleData = {
        company_id: companyId,
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
        const records = await base44.entities.Inventory.filter({ product_id: item.product_id, company_id: companyId });
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

  // Keep ref in sync so the keyboard shortcut handler can call mutate without a TDZ issue
  createSaleRef.current = createSaleMutation;

  const currency = company?.currency || "NGN";
  const fmt = (n) => `${currency === "NGN" ? "₦" : currency}${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleScanResult = (text) => {
    setSearchTerm(text);
    setShowDropdown(true);
    setHighlightedIndex(0);
    const exact = resolveScanMatch(text);
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
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowHistory(true)} className="text-white hover:bg-white/20 gap-2 text-xs">
            <History className="w-4 h-4" />
            History
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowShortcuts(true)} className="text-white hover:bg-white/20 gap-2 text-xs">
            <Keyboard className="w-4 h-4" />
            <span className="hidden sm:inline">Shortcuts</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => base44.auth.logout()} className="text-white hover:bg-white/20 gap-2 text-xs">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Sale success banner */}
      {saleComplete && (
        <div className="bg-green-600 text-white px-4 py-2 flex items-center gap-2 shrink-0 text-sm font-semibold">
          <CheckCircle className="w-4 h-4" /> Sale completed successfully!
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Left: Product search */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Search bar */}
          <div className="p-3 bg-white border-b shrink-0">
            <div className="relative">
              <SearchInput
                inputRef={searchInputRef}
                placeholder="Search product or scan barcode...  (F2)"
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

          {/* Favorites bar */}
          <PinnedItems
            products={activeProducts}
            sales={sales}
            onAddToCart={addToCart}
            currency={currency}
            stockByProduct={stockByProduct}
          />

          {/* Category filter bar */}
          {categories.length > 0 && (
            <div className="border-b border-slate-200 bg-white px-3 py-2 shrink-0">
              <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedCategory === null
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      selectedCategory === cat.name
                        ? "text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    style={selectedCategory === cat.name ? { backgroundColor: cat.color } : {}}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selectedCategory === cat.name ? "#fff" : cat.color }} />
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {scanWarning && (
            <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 text-xs text-amber-700 shrink-0">
              {scanWarning}
            </div>
          )}

          {/* Product grid */}
          <div className="flex-1 overflow-auto p-3 min-h-0 overscroll-contain touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(searchTerm ? filteredProducts : categoryFilteredProducts).map(product => {
                const stock = stockByProduct[product.id] || 0;
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="bg-white rounded-xl p-3 text-left shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-md active:scale-95 transition-[transform,box-shadow] cv-auto"
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
                Complete Sale <span className="ml-1 text-xs opacity-70 bg-white/20 px-1.5 py-0.5 rounded">F9</span>
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
              <DrawerSelect
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                options={[
                  { value: "cash", label: "Cash" },
                  { value: "card", label: "Card" },
                  { value: "mobile_money", label: "Mobile Money" },
                  { value: "bank_transfer", label: "Bank Transfer" },
                ]}
                placeholder="Select payment method"
                label="Payment Method"
                triggerClassName="w-full h-9 border border-input bg-background rounded-md px-3 text-sm font-medium"
              />
            </div>
            {saleError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {saleError}
              </div>
            )}
            {!company && !companyLoading && !user?.company_id && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                Company data not found. Please contact your administrator.
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setCheckoutOpen(false); setSaleError(""); }}>Cancel</Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => createSaleMutation.mutate()} disabled={createSaleMutation.isPending || (!company && !user?.company_id)}>
                {createSaleMutation.isPending ? "Processing..." : companyLoading ? "Loading..." : "Confirm Sale"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sale History — view & reprint past receipts */}
      <SaleHistoryDialog
        open={showHistory}
        onClose={() => setShowHistory(false)}
        companyId={company?.id || user?.company_id}
        company={company}
        user={user}
      />

      {/* Keyboard shortcuts help */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="w-4 h-4" /> Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2 text-sm">
            {[
              { keys: "F1", label: "Show/hide this help" },
              { keys: "F2", label: "Focus search bar to add product" },
              { keys: "Enter", label: "Add highlighted product to cart" },
              { keys: "↑ / ↓", label: "Navigate search results" },
              { keys: "F9", label: "Complete sale (open checkout / confirm)" },
              { keys: "F4", label: "Clear cart" },
              { keys: "Esc", label: "Close dialog / clear search" },
            ].map(s => (
              <div key={s.keys} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                <span className="text-slate-600">{s.label}</span>
                <kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 text-xs font-mono font-semibold text-slate-700">{s.keys}</kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}