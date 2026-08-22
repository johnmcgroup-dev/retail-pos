import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  ShoppingCart,
  Plus,
  DollarSign,
  AlertCircle,
  Package,
  Award,
  Calculator
} from "lucide-react";
import ProductGrid from "../components/pos/ProductGrid";
import CartPanel from "../components/pos/CartPanel";
import PaymentGatewayDialog from "../components/pos/PaymentGatewayDialog";
import DiscountPanel from "../components/pos/DiscountPanel";
import CustomerSelector from "../components/pos/CustomerSelector";
import ConnectionStatus from "../components/shared/ConnectionStatus";
import { formatCurrency, getCurrencySymbol, offlineCache, CACHE_KEYS } from "../components/utils";
import { useOnlineStatus } from "../components/shared/useOnlineStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AlertBanner from "../components/notifications/AlertBanner";
import { playScanBeep, playErrorBuzz } from "../components/pos/scanSound";
import SearchInput from "../components/shared/SearchInput";
import VoiceOrderingButton from "../components/pos/VoiceOrderingButton";
import PinnedItems from "../components/pos/PinnedItems";
import QuickCalculator from "../components/pos/QuickCalculator";
import { logActivity } from "@/lib/logActivity";

export default function POS() {
  const queryClient = useQueryClient();
  const { isOnline, wasOffline } = useOnlineStatus();
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchInputRef = useRef(null);
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [mobileTab, setMobileTab] = useState("products");
  const [orderDiscount, setOrderDiscount] = useState({ type: "percentage", value: 0 });
  const [loyaltyRedeem, setLoyaltyRedeem] = useState({ enabled: false, points: 0 });
  const [saleCompleted, setSaleCompleted] = useState(null);
  const [stockWarning, setStockWarning] = useState("");
  const [showCalculator, setShowCalculator] = useState(false);
  const loyaltyRedeemRef = useRef(loyaltyRedeem);

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me(), staleTime: 5 * 60 * 1000 });
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
    enabled: isOnline,
  });

  const currency = selectedCompany?.currency || companies[0]?.currency || 'NGN';
  const posCompanyId = selectedCompany?.id || companies[0]?.id;

  // Products query: always try online first, fall back to cache
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products", posCompanyId],
    queryFn: async () => {
      if (isOnline && posCompanyId) {
        try {
          const data = await base44.entities.Product.filter({ company_id: posCompanyId });
          offlineCache.set(CACHE_KEYS.PRODUCTS, data);
          offlineCache.updateLastSync();
          setUsingCachedData(false);
          return data;
        } catch (_) {
          // fall through to cache
        }
      }
      const cached = offlineCache.get(CACHE_KEYS.PRODUCTS);
      if (cached) {
        setUsingCachedData(true);
        return cached;
      }
      return [];
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: isOnline ? 5 * 60 * 1000 : false,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      if (!isOnline || !posCompanyId) {
        const cached = offlineCache.get(CACHE_KEYS.CUSTOMERS);
        return cached || [];
      }

      const data = await base44.entities.Customer.filter({ company_id: posCompanyId });
      offlineCache.set(CACHE_KEYS.CUSTOMERS, data);
      return data;
    },
    enabled: isOnline,
    initialData: () => offlineCache.get(CACHE_KEYS.CUSTOMERS) || []
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      if (!isOnline) {
        const cached = offlineCache.get(CACHE_KEYS.INVENTORY);
        return cached || [];
      }

      const data = await base44.entities.Inventory.filter({ company_id: posCompanyId });
      offlineCache.set(CACHE_KEYS.INVENTORY, data);
      return data;
    },
    enabled: isOnline,
    initialData: () => offlineCache.get(CACHE_KEYS.INVENTORY) || []
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => base44.entities.Alert.filter({ is_dismissed: false }),
  });

  const { data: loyaltyPrograms = [] } = useQuery({
    queryKey: ["loyaltyPrograms", selectedCompany?.id],
    queryFn: () =>
      selectedCompany
        ? base44.entities.LoyaltyProgram.filter({ company_id: selectedCompany.id, active: true })
        : [],
    enabled: !!selectedCompany && isOnline,
  });
  const loyaltyProgram = loyaltyPrograms[0];

  const { data: sales = [] } = useQuery({
    queryKey: ["sales", posCompanyId],
    queryFn: () => base44.entities.Sale.filter({ company_id: posCompanyId }, "-sale_date", 200),
    enabled: isOnline && !!posCompanyId,
  });

  useEffect(() => {
    setLoyaltyRedeem({ enabled: false, points: 0 });
  }, [selectedCustomer?.id]);

  useEffect(() => {
    loyaltyRedeemRef.current = loyaltyRedeem;
  }, [loyaltyRedeem]);

  const dismissAlertMutation = useMutation({
    mutationFn: (alertId) => base44.entities.Alert.update(alertId, { is_dismissed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(["alerts"]);
    },
  });

  // Auto-focus search on mount
  useEffect(() => {
    const timer = setTimeout(() => searchInputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  // Keep search focused: refocus when window regains focus (e.g. scanner input)
  useEffect(() => {
    const handleWindowFocus = () => {
      // Don't steal focus if checkout dialog or a modal is open
      if (!showCheckout) {
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [showCheckout]);

  // Refocus search when returning to products tab on mobile
  useEffect(() => {
    if (mobileTab === "products") {
      searchInputRef.current?.focus();
    }
  }, [mobileTab]);

  // Refocus search after checkout dialog closes
  useEffect(() => {
    if (!showCheckout) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [showCheckout]);

  useEffect(() => {
    if (companies.length > 0 && user && !selectedCompany) {
      const myId = user.company_id || user.tenant_id;
      setSelectedCompany(companies.find(c => c.id === myId) || companies[0]);
    }
  }, [companies, selectedCompany, user]);

  useEffect(() => {
    if (wasOffline && isOnline) {
      syncOfflineSales();
    }
  }, [wasOffline, isOnline]);

  // When coming back online, force-refresh products and inventory from server
  useEffect(() => {
    if (isOnline) {
      queryClient.invalidateQueries(["products"]);
      queryClient.invalidateQueries(["inventory"]);
    }
  }, [isOnline]);

  useEffect(() => {
    const pending = offlineCache.getPendingOfflineSales();
    setPendingSyncCount(pending.length);
  }, []);

  // Real-time sync: subscribe to Inventory & Product changes so that scanning
  // and manual searches reflect the latest shared state across all linked devices.
  useEffect(() => {
    const unsubInventory = base44.entities.Inventory.subscribe(() => {
      queryClient.invalidateQueries(["inventory"]);
    });
    const unsubProducts = base44.entities.Product.subscribe(() => {
      queryClient.invalidateQueries(["products"]);
    });
    return () => {
      if (unsubInventory) unsubInventory();
      if (unsubProducts) unsubProducts();
    };
  }, [queryClient]);

  const syncOfflineSales = async () => {
    const pendingSales = offlineCache.getPendingOfflineSales();
    
    for (const sale of pendingSales) {
      try {
        await base44.entities.Sale.create(sale);
        offlineCache.markSaleSynced(sale.offlineTimestamp);
        
        for (const item of sale.items) {
          const inventoryRecords = await base44.entities.Inventory.filter({
            product_id: item.product_id,
            company_id: selectedCompany?.id || companies[0]?.id
          });

          // FEFO: sort by expiration_date ascending (nulls last)
          const sorted = [...inventoryRecords].sort((a, b) => {
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
            await base44.entities.Inventory.update(inv.id, {
              quantity: inv.quantity - deduct
            });
            remaining -= deduct;
          }
        }
      } catch (error) {
        console.error("Error syncing offline sale:", error);
      }
    }

    queryClient.invalidateQueries(["sales"]);
    queryClient.invalidateQueries(["inventory"]);
    setPendingSyncCount(0);
  };

  // Build a map of net available stock per product from inventory (includes negative adjustments)
  const stockByProduct = inventory.reduce((acc, inv) => {
    acc[inv.product_id] = (acc[inv.product_id] || 0) + (inv.quantity || 0);
    return acc;
  }, {});

  const getAvailableStock = (productId) => stockByProduct[productId] || 0;

  const filteredProducts = products.filter(p => {
    // Hide products with zero or negative stock
    if (getAvailableStock(p.id) <= 0) return false;
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      p.name?.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term) ||
      (p.barcodes || []).some(b => b.toLowerCase().includes(term))
    );
  });

  // Dropdown search results (top 8) — show all products even with empty search
  const searchResults = filteredProducts.slice(0, 8);

  const handleScanResult = (text) => {
    setSearchTerm(text);
    setHighlightedIndex(0);
    setShowSearchDropdown(true);

    const exact = products.find(p =>
      p.sku === text || (p.barcodes || []).some(b => b === text)
    );
    if (exact) {
      addToCart(exact);
      setSearchTerm("");
      setShowSearchDropdown(false);
      setHighlightedIndex(0);
      searchInputRef.current?.focus();
    } else {
      playErrorBuzz();
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, searchResults.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Escape") {
      setShowSearchDropdown(false);
      return;
    }
    if (e.key !== "Enter") return;

    const term = searchTerm.trim();

    // If dropdown is open and item highlighted, add that item
    if (showSearchDropdown && searchResults.length > 0) {
      const item = searchResults[highlightedIndex] || searchResults[0];
      addToCart(item);
      setSearchTerm("");
      setShowSearchDropdown(false);
      setHighlightedIndex(0);
      searchInputRef.current?.focus();
      e.preventDefault();
      return;
    }

    // Barcode/SKU exact match
    const exact = products.find(p =>
      p.sku === term ||
      (p.barcodes || []).some(b => b === term)
    );
    if (exact) {
      addToCart(exact);
      setSearchTerm("");
      setShowSearchDropdown(false);
      setHighlightedIndex(0);
      searchInputRef.current?.focus();
      e.preventDefault();
    } else if (term) {
      // Scanned/typed code not found — play error buzz
      playErrorBuzz();
    }
  };

  const addToCart = (product) => {
    const availableStock = getAvailableStock(product.id);
    const existingItem = cart.find(item => item.product_id === product.id);
    const currentQtyInCart = existingItem?.quantity || 0;

    // Disallow adding more than available stock — alert staff
    if (availableStock <= 0 || currentQtyInCart + 1 > availableStock) {
      playErrorBuzz();
      setStockWarning(`"${product.name}" is out of stock.`);
      setTimeout(() => setStockWarning(""), 3000);
      return;
    }

    playScanBeep();
    if (existingItem) {
      const newQty = existingItem.quantity + 1;
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: newQty, total: item.unit_price * newQty }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        image_url: product.image_url,
        unit_price: product.selling_price,
        quantity: 1,
        tax: (product.selling_price * (product.tax_rate || 0)) / 100,
        discount: 0,
        total: product.selling_price
      }]);
    }
  };

  const updateQuantity = (productId, newQuantity) => {
    const availableStock = getAvailableStock(productId);
    // Disallow setting quantity above available stock — alert staff
    if (availableStock <= 0 || newQuantity > availableStock) {
      playErrorBuzz();
      setStockWarning(`Only ${availableStock} in stock.`);
      setTimeout(() => setStockWarning(""), 3000);
      return;
    }
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item =>
        item.product_id === productId
          ? { ...item, quantity: newQuantity, total: item.unit_price * newQuantity }
          : item
      ));
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  // Voice-ordered add: supports adding a specific quantity in one call
  const handleVoiceAddToCart = (product, quantity = 1) => {
    const availableStock = getAvailableStock(product.id);
    const existingItem = cart.find(item => item.product_id === product.id);
    const currentQty = existingItem?.quantity || 0;

    if (currentQty + quantity > availableStock) {
      playErrorBuzz();
      return { success: false, reason: "stock" };
    }

    playScanBeep();

    if (existingItem) {
      const newQty = currentQty + quantity;
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: newQty, total: item.unit_price * newQty }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        image_url: product.image_url,
        unit_price: product.selling_price,
        quantity: quantity,
        tax: (product.selling_price * (product.tax_rate || 0)) / 100,
        discount: 0,
        total: product.selling_price * quantity,
      }]);
    }

    return { success: true };
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setOrderDiscount({ type: "percentage", value: 0 });
    setLoyaltyRedeem({ enabled: false, points: 0 });
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = cart.reduce((sum, item) => sum + (item.tax * item.quantity), 0);
    const itemDiscount = cart.reduce((sum, item) => sum + item.discount, 0);
    const orderDiscountAmount =
      orderDiscount.type === "percentage"
        ? subtotal * ((orderDiscount.value || 0) / 100)
        : orderDiscount.value || 0;
    const loyaltyDiscountAmount = loyaltyRedeem.enabled
      ? Math.min(loyaltyRedeem.points, selectedCustomer?.loyalty_points || 0) *
        (loyaltyProgram?.redemption_value || 0)
      : 0;
    const discountAmount = itemDiscount + orderDiscountAmount + loyaltyDiscountAmount;
    const total = Math.max(0, subtotal + taxAmount - discountAmount);
    return { subtotal, taxAmount, discountAmount, orderDiscountAmount, loyaltyDiscountAmount, total };
  };

  const createSaleMutation = useMutation({
    mutationFn: async (saleData) => {
      if (!isOnline && saleData.payment_method !== 'cash') {
        throw new Error("Card payments require internet connection");
      }

      if (!isOnline) {
        offlineCache.saveOfflineSale(saleData);
        setPendingSyncCount(prev => prev + 1);
        return { offline: true };
      }

      const sale = await base44.entities.Sale.create(saleData);
      
      if (saleData.payment_data) {
        await base44.entities.Payment.create({
          company_id: saleData.company_id,
          reference_type: "sale",
          reference_id: sale.id,
          payer_type: "customer",
          payer_id: saleData.customer_id,
          payer_name: saleData.customer_name,
          payment_date: new Date().toISOString(),
          amount: saleData.total_amount,
          payment_method: saleData.payment_data.method,
          payment_gateway: saleData.payment_data.gateway,
          transaction_id: saleData.payment_data.transaction_id,
          transaction_reference: saleData.payment_data.transaction_reference,
          payment_status: saleData.payment_data.payment_status,
          card_last_four: saleData.payment_data.card_last_four,
          card_brand: saleData.payment_data.card_brand
        });
      }
      
      if (saleData.customer_id && selectedCompany) {
        const loyaltyPrograms = await base44.entities.LoyaltyProgram.filter({
          company_id: selectedCompany.id,
          active: true
        });

        if (loyaltyPrograms.length > 0) {
          const program = loyaltyPrograms[0];
          const pointsEarned = Math.floor(saleData.total_amount * program.points_per_dollar);
          const redeem = loyaltyRedeemRef.current;
          const customer = customers.find(c => c.id === saleData.customer_id);
          const pointsRedeemed = (redeem?.enabled && redeem.points > 0 && customer)
            ? Math.min(redeem.points, customer.loyalty_points || 0)
            : 0;

          if (customer && (pointsEarned > 0 || pointsRedeemed > 0)) {
            let newBalance = customer.loyalty_points || 0;

            if (pointsEarned > 0) {
              newBalance += pointsEarned;
              await base44.entities.LoyaltyTransaction.create({
                company_id: selectedCompany.id,
                customer_id: customer.id,
                transaction_type: "earned",
                points: pointsEarned,
                reference_type: "sale",
                reference_id: sale.id,
                description: `Earned from purchase ${sale.invoice_number}`,
                balance_after: newBalance,
                transaction_date: new Date().toISOString()
              });
            }

            if (pointsRedeemed > 0) {
              newBalance -= pointsRedeemed;
              await base44.entities.LoyaltyTransaction.create({
                company_id: selectedCompany.id,
                customer_id: customer.id,
                transaction_type: "redeemed",
                points: -pointsRedeemed,
                reference_type: "sale",
                reference_id: sale.id,
                description: `Redeemed for discount on ${sale.invoice_number}`,
                balance_after: newBalance,
                transaction_date: new Date().toISOString()
              });
            }

            await base44.entities.Customer.update(customer.id, {
              loyalty_points: newBalance
            });

            await base44.entities.Sale.update(sale.id, {
              loyalty_points_earned: pointsEarned
            });
          }
        }
      }
      
      // FEFO deduction: deduct from earliest-expiring batches first
      for (const item of cart) {
        const inventoryRecords = await base44.entities.Inventory.filter({
          product_id: item.product_id,
          company_id: saleData.company_id
        });

        // Sort by expiration_date ascending (nulls last)
        const sorted = [...inventoryRecords].sort((a, b) => {
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
          await base44.entities.Inventory.update(inv.id, {
            quantity: inv.quantity - deduct
          });
          remaining -= deduct;
        }
      }
      
      return sale;
    },
    onSuccess: async (result, saleData) => {
      queryClient.invalidateQueries(["sales"]);
      queryClient.invalidateQueries(["inventory"]);
      queryClient.invalidateQueries(["customers"]);
      queryClient.invalidateQueries(["loyaltyTransactions"]);
      queryClient.invalidateQueries(["payments"]);
      logActivity({
        companyId: saleData.company_id,
        entityType: "sale",
        action: "create",
        entityId: result?.id,
        referenceNumber: saleData.invoice_number,
        amount: saleData.total_amount,
        performedBy: saleData.cashier,
        description: `Sale ${saleData.invoice_number} — ${saleData.items?.length || 0} item(s), ${saleData.payment_method}`,
        details: { customer: saleData.customer_name, items: saleData.items?.length || 0, payment_method: saleData.payment_method },
      });
      // Refresh and re-cache inventory so offline view stays accurate
      if (isOnline) {
        try {
          const freshInventory = await base44.entities.Inventory.list();
          offlineCache.set(CACHE_KEYS.INVENTORY, freshInventory);
          const freshProducts = await base44.entities.Product.filter({ status: "active" });
          offlineCache.set(CACHE_KEYS.PRODUCTS, freshProducts);
        } catch (_) {}
      }
      // Voice checkout: announce completion
      setSaleCompleted(`Sale completed for ${formatCurrency(saleData?.total_amount || 0, currency)}`);
      setTimeout(() => setSaleCompleted(null), 200);
      clearCart();
      setShowCheckout(false);
    },
  });

  const handleCheckout = async (paymentData) => {
    const totals = calculateTotals();
    // Block the sale if any cart line is out of stock or below requested qty
    for (const item of cart) {
      const available = getAvailableStock(item.product_id);
      if (item.quantity < 1 || available <= 0 || item.quantity > available) {
        setShowCheckout(false);
        playErrorBuzz();
        setStockWarning(`"${item.product_name}" is out of stock (only ${available} available). Sale blocked.`);
        setTimeout(() => setStockWarning(""), 5000);
        throw new Error(`Out of stock: ${item.product_name}`);
      }
    }
    const invoiceNumber = `INV-${Date.now()}`;
    
    let cashierEmail = "offline_user";
    let companyId = selectedCompany?.id || companies[0]?.id;
    if (isOnline) {
      try {
        const currentUser = await base44.auth.me();
        cashierEmail = currentUser.email;
        if (!companyId) {
          companyId = currentUser.company_id || currentUser.tenant_id;
        }
      } catch (error) {
        console.error("Error getting user:", error);
      }
    }
    
    const saleData = {
      company_id: companyId,
      invoice_number: invoiceNumber,
      customer_id: selectedCustomer?.id,
      customer_name: selectedCustomer?.name || "Walk-in Customer",
      sale_date: new Date().toISOString(),
      items: cart,
      subtotal: totals.subtotal,
      tax_amount: totals.taxAmount,
      discount_amount: totals.discountAmount,
      total_amount: totals.total,
      payment_method: paymentData.payment_method,
      payment_status: "paid",
      amount_paid: paymentData.amount_paid || totals.total,
      amount_due: 0,
      cashier: cashierEmail,
    };

    const result = await createSaleMutation.mutateAsync(saleData);
    return { ...saleData, ...result };
  };

  const totals = calculateTotals();

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-slate-50">

      {/* Mobile tab bar */}
      <div className="md:hidden flex bg-white border-b border-slate-200 shrink-0 safe-area-top">
        <button
          onClick={() => setMobileTab("products")}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 ${
            mobileTab === "products" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500"
          }`}
        >
          <Search className="w-4 h-4" />
          Products
        </button>
        <button
          onClick={() => setMobileTab("cart")}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 relative ${
            mobileTab === "cart" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500"
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Cart
          {cart.length > 0 && (
            <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* Main content row */}
      <div className="flex-1 flex flex-row overflow-hidden min-h-0">

        {/* Products Panel */}
        <div className={`flex-1 flex flex-col overflow-hidden ${mobileTab === "cart" ? "hidden md:flex" : "flex"}`}>
          <div className="p-3 bg-white border-b border-slate-200 shrink-0">
            <ConnectionStatus usingCache={usingCachedData && isOnline} />
            <AlertBanner
              alerts={alerts.filter(a => a.severity === 'critical')}
              onDismiss={(id) => dismissAlertMutation.mutate(id)}
              onViewAll={() => {}}
            />
            {stockWarning && (
              <div className="mt-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">{stockWarning}</span>
              </div>
            )}
            {pendingSyncCount > 0 && (
              <Alert className="mb-2 bg-yellow-50 border-yellow-300">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 text-xs">
                  <span className="font-semibold">{pendingSyncCount} offline sale(s)</span> waiting to sync
                  {isOnline && " - Syncing now..."}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="p-3 bg-white border-b border-slate-200 shrink-0">
            <div className="relative">
              <SearchInput
                inputRef={searchInputRef}
                placeholder="Search or scan barcode (Enter to add)..."
                value={searchTerm}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchTerm(val);
                  setHighlightedIndex(0);
                  setShowSearchDropdown(true);
                  // Instant barcode match — barcode scanners emit full code quickly
                  // Check for exact barcode/SKU match on every change
                  const trimmed = val.trim();
                  if (trimmed.length >= 4) {
                    const exact = products.find(p =>
                      p.sku === trimmed || (p.barcodes || []).some(b => b === trimmed)
                    );
                    if (exact) {
                      addToCart(exact);
                      setTimeout(() => {
                        setSearchTerm("");
                        setShowSearchDropdown(false);
                        setHighlightedIndex(0);
                        searchInputRef.current?.focus();
                      }, 50);
                    }
                  }
                }}
                onKeyDown={handleSearchKeyDown}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 150)}
                onFocus={() => setShowSearchDropdown(true)}
                onScan={handleScanResult}
                className="h-10 text-sm"
              />
              {/* Live search dropdown — shows all products on focus, filters as you type/scan */}
              {showSearchDropdown && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-[60vh] overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-slate-400">
                      <Package className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      No matching products
                    </div>
                  ) : searchResults.map((product, idx) => (
                    <div
                      key={product.id}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                        idx === highlightedIndex ? "bg-blue-50" : "hover:bg-slate-50"
                      }`}
                      onMouseDown={() => {
                        addToCart(product);
                        setSearchTerm("");
                        setShowSearchDropdown(false);
                        setHighlightedIndex(0);
                        searchInputRef.current?.focus();
                      }}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                    >
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {product.image_url
                          ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          : <Package className="w-4 h-4 text-slate-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{product.name}</p>
                        {product.category && <p className="text-xs text-slate-500 truncate">{product.category}</p>}
                      </div>
                      <span className="font-bold text-blue-600 text-sm flex-shrink-0">
                        {formatCurrency(product.selling_price || 0, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {usingCachedData && offlineCache.getLastSync() && (
              <p className="text-xs text-slate-500 mt-1">
                Last synced: {new Date(offlineCache.getLastSync()).toLocaleString()}
              </p>
            )}
          </div>

          <PinnedItems
            products={products}
            sales={sales}
            onAddToCart={(product) => { addToCart(product); setMobileTab("cart"); }}
            currency={currency}
            stockByProduct={stockByProduct}
          />

          <div className="flex-1 overflow-auto p-3">
            <ProductGrid
              products={filteredProducts}
              onAddToCart={(product) => { addToCart(product); setMobileTab("cart"); }}
              currency={currency}
              stockByProduct={stockByProduct}
            />
          </div>
        </div>

        {/* Cart Panel */}
        <div className={`w-full md:w-[420px] bg-white border-l border-slate-200 flex flex-col shrink-0 ${mobileTab === "products" ? "hidden md:flex" : "flex"}`}>
          <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-600 shrink-0">
            <div className="flex items-center justify-between text-white">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Cart <span className="text-sm opacity-80">({cart.length} items)</span>
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setShowCalculator(true)} className="text-white hover:bg-white/20 text-xs gap-1">
                  <Calculator className="w-4 h-4" /> Calc
                </Button>
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCart} className="text-white hover:bg-white/20 text-xs">
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="p-3 border-b border-slate-200 bg-slate-50 shrink-0">
            <CustomerSelector
              customers={customers}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={setSelectedCustomer}
            />
          </div>

          {selectedCustomer && loyaltyProgram && (
            <div className="px-3 py-2 bg-purple-50 border-b border-purple-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-purple-700">
                <Award className="w-3.5 h-3.5" />
                <span className="font-medium">Current Balance: {selectedCustomer.loyalty_points || 0} pts</span>
              </div>
              {totals.total > 0 && (
                <span className="text-purple-600 font-medium">
                  +{Math.floor(totals.total * (loyaltyProgram.points_per_dollar || 0))} pts this sale
                </span>
              )}
            </div>
          )}

          <div className="flex-1 overflow-auto min-h-0">
            <CartPanel
              cart={cart}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeFromCart}
              currency={currency}
            />
          </div>

          <div className="border-t border-slate-200 p-4 bg-slate-50 shrink-0 space-y-3">
            <DiscountPanel
              subtotal={totals.subtotal}
              customer={selectedCustomer}
              loyaltyProgram={loyaltyProgram}
              orderDiscount={orderDiscount}
              setOrderDiscount={setOrderDiscount}
              loyaltyRedeem={loyaltyRedeem}
              setLoyaltyRedeem={setLoyaltyRedeem}
              currency={currency}
            />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-semibold">{formatCurrency(totals.subtotal, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tax:</span>
                <span className="font-semibold">{formatCurrency(totals.taxAmount, currency)}</span>
              </div>
              {totals.orderDiscountAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Order Discount:</span>
                  <span className="font-semibold text-green-600">-{formatCurrency(totals.orderDiscountAmount, currency)}</span>
                </div>
              )}
              {totals.loyaltyDiscountAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600 flex items-center gap-1"><Award className="w-3 h-3 text-purple-600" /> Reward:</span>
                  <span className="font-semibold text-purple-600">-{formatCurrency(totals.loyaltyDiscountAmount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-300">
                <span>Total:</span>
                <span className="text-blue-600">{formatCurrency(totals.total, currency)}</span>
              </div>
            </div>

            <Button
              className="w-full h-12 text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
              disabled={cart.length === 0}
              onClick={() => setShowCheckout(true)}
            >
              <DollarSign className="w-5 h-5 mr-2" />
              Complete Sale {!isOnline && "(Cash Only)"}
            </Button>
          </div>
        </div>
      </div>

      <QuickCalculator open={showCalculator} onClose={() => setShowCalculator(false)} />

      <PaymentGatewayDialog
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        total={totals.total}
        onComplete={handleCheckout}
        isProcessing={createSaleMutation.isPending}
        isOffline={!isOnline}
        currency={currency}
      />

      <VoiceOrderingButton
        products={products}
        cart={cart}
        onAddToCart={handleVoiceAddToCart}
        onRemoveFromCart={removeFromCart}
        onClearCart={clearCart}
        onCheckout={handleCheckout}
        totals={totals}
        currency={currency}
        formatCurrency={formatCurrency}
        isProcessing={createSaleMutation.isPending}
        saleCompleted={saleCompleted}
      />
    </div>
  );
}