import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Calculator,
  PackagePlus,
  Tag
} from "lucide-react";
import ProductGrid from "../components/pos/ProductGrid";
import CartPanel from "../components/pos/CartPanel";
import PaymentGatewayDialog from "../components/pos/PaymentGatewayDialog";
import DiscountPanel from "../components/pos/DiscountPanel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import AddStockDialog from "../components/pos/AddStockDialog";
import { logActivity } from "@/lib/logActivity";
import { getVarietyPrice, getVarietyQuantity, DEFAULT_VARIETY_QTY } from "@/lib/varieties";
import { loadCart, saveCart, clearSavedCart } from "@/lib/posCartStorage";

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
  const [showAddStock, setShowAddStock] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const loyaltyRedeemRef = useRef(loyaltyRedeem);
  const cartOwnerRef = useRef(null);
  const cartTouchedRef = useRef(false);
  // Guards against a hardware scanner's trailing Enter re-adding the same item.
  // Records the last scan value + timestamp so the Enter key can be swallowed
  // reliably even on scanners with longer key latency.
  const justScannedRef = useRef({ at: 0, value: null });

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me(), staleTime: 5 * 60 * 1000 });

  // Admin/owner roles are not blocked by the POS selling restrictions (stock limits).
  // Every other role keeps the standard restrictions exactly as they were.
  const isAdmin = ["admin", "owner", "super_admin"].includes(user?.role);
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

  // Restore this user's saved cart once per page load. Every cart change persists
  // itself through persistCart below, so the cart is only ever emptied by an
  // explicit Clear or a completed sale — never by navigation, refresh, restocking,
  // variant changes or discounts.
  useEffect(() => {
    if (cartOwnerRef.current) return;
    const owner = user?.id || user?.email;
    if (!owner) return;
    cartOwnerRef.current = owner;
    if (cartTouchedRef.current) return;
    const saved = loadCart(owner);
    if (saved && saved.length > 0) setCart(saved);
  }, [user]);

  // Single entry point for cart changes: updates the cart and the user's saved copy
  // together, so the two can never drift apart.
  const persistCart = (next) => {
    cartTouchedRef.current = true;
    setCart(next);
    if (cartOwnerRef.current) saveCart(cartOwnerRef.current, next);
  };

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
    // Hide products with zero or negative stock (admins may still sell them)
    if (!isAdmin && getAvailableStock(p.id) <= 0) return false;
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      p.name?.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term) ||
      (p.barcodes || []).some(b => b.toLowerCase().includes(term))
    );
  });

  // Dropdown search results (top 8) — includes out-of-stock products so they stay
  // visible (greyed out) instead of silently disappearing from the list.
  const searchResults = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return products
      .filter(p =>
        !term ||
        p.name?.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term) ||
        (p.barcodes || []).some(b => b.toLowerCase().includes(term))
      )
      .slice(0, 8);
  }, [products, searchTerm]);

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

    // Swallow the trailing Enter emitted by a hardware scanner — the onChange
    // exact-match already added the item; this prevents the double-count bug.
    const sinceScan = Date.now() - justScannedRef.current.at;
    if (justScannedRef.current.value != null && sinceScan < 1500) {
      justScannedRef.current = { at: 0, value: null };
      e.preventDefault();
      return;
    }

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

    // Disallow adding more than available stock — alert staff (admins are exempt)
    if (!isAdmin && (availableStock <= 0 || currentQtyInCart + 1 > availableStock)) {
      playErrorBuzz();
      setStockWarning(`"${product.name}" is out of stock.`);
      setTimeout(() => setStockWarning(""), 3000);
      return;
    }

    playScanBeep();
    if (existingItem) {
      const newQty = existingItem.quantity + 1;
      persistCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: newQty, total: item.unit_price * newQty }
          : item
      ));
    } else {
      persistCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        image_url: product.image_url,
        variety: "Pieces",
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
    // Disallow setting quantity above available stock — alert staff (admins are exempt)
    if (!isAdmin && (availableStock <= 0 || newQuantity > availableStock)) {
      playErrorBuzz();
      setStockWarning(`Only ${availableStock} in stock.`);
      setTimeout(() => setStockWarning(""), 3000);
      return;
    }
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      persistCart(cart.map(item =>
        item.product_id === productId
          ? { ...item, quantity: newQuantity, total: item.unit_price * newQuantity }
          : item
      ));
    }
  };

  const removeFromCart = (productId) => {
    persistCart(cart.filter(item => item.product_id !== productId));
  };

  // Change the selling variety (Pieces / Roll / Bundle / Dozen / Carton) for a cart line.
  // Pulls the saved per-variety price from the product so it auto-fills when switched.
  const updateVariety = (productId, variety) => {
    const product = products.find(p => p.id === productId);
    persistCart(cart.map(item => {
      if (item.product_id !== productId) return item;
      const price = getVarietyPrice(product, variety) ?? item.unit_price;
      const tax = item.unit_price ? item.tax * (price / item.unit_price) : item.tax;
      // Switching variety changes the unit, so reset quantity to 1 of the new variety
      return { ...item, variety, unit_price: price, quantity: 1, tax, total: price };
    }));

    // Variety/price changes stay LOCAL to the cart here — they are only
    // written to the product when the cashier clicks Save in the cart.
  };

  // Cart lines whose variety/price no longer match the product's saved values.
  // Shown as "unsaved changes" until Save persists them to the product.
  const unsavedVarietyIds = useMemo(() =>
    cart
      .filter(item => {
        const product = products.find(p => p.id === item.product_id);
        if (!product) return false;
        const v = item.variety || "Pieces";
        if (v === "Pieces") return item.unit_price !== product.selling_price;
        const cfg = product.varieties?.[v];
        if (!cfg) return true;
        return item.unit_price !== cfg.price;
      })
      .map(item => item.product_id),
    [cart, products]
  );
  const hasUnsavedVarieties = unsavedVarietyIds.length > 0;

  // Warn before leaving the page with unsaved variety/price changes
  useEffect(() => {
    if (!hasUnsavedVarieties) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedVarieties]);

  // Clearing is always an explicit, confirmed action
  const handleClearCart = () => {
    if (cart.length === 0) return;
    const message = hasUnsavedVarieties
      ? "You have unsaved variety/price changes. Clear all items from the cart?"
      : "Clear all items from the cart?";
    if (!window.confirm(message)) return;
    clearCart();
  };

  // Save the current variety price back onto the product so it auto-fills next time.
  // "Pieces" maps to selling_price; other varieties are stored in the product's varieties map.
  const saveVarietyPrice = async (productId, variety, price, quantity) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    try {
      if (variety === "Pieces") {
        await base44.entities.Product.update(productId, { selling_price: price });
      } else {
        const existing = product.varieties?.[variety];
        const baseQty = (typeof existing === "object" && existing?.quantity)
          ? existing.quantity
          : (DEFAULT_VARIETY_QTY[variety] ?? 1);
        const varieties = { ...(product.varieties || {}), [variety]: { price, quantity: quantity || baseQty } };
        await base44.entities.Product.update(productId, { varieties });
      }
      queryClient.invalidateQueries(["products"]);
    } catch (error) {
      console.error("Error saving variety price:", error);
    }
  };

  // Edit the per-variety unit price; recalculates proportional tax and line total
  const updateUnitPrice = (productId, newPrice) => {
    persistCart(cart.map(item => {
      if (item.product_id !== productId) return item;
      const price = Math.max(0, Number(newPrice) || 0);
      const tax = item.unit_price ? item.tax * (price / item.unit_price) : item.tax;
      return { ...item, unit_price: price, tax, total: price * item.quantity };
    }));
  };

  // Voice-ordered add: supports adding a specific quantity in one call
  const handleVoiceAddToCart = (product, quantity = 1) => {
    const availableStock = getAvailableStock(product.id);
    const existingItem = cart.find(item => item.product_id === product.id);
    const currentQty = existingItem?.quantity || 0;

    if (!isAdmin && currentQty + quantity > availableStock) {
      playErrorBuzz();
      return { success: false, reason: "stock" };
    }

    playScanBeep();

    if (existingItem) {
      const newQty = currentQty + quantity;
      persistCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: newQty, total: item.unit_price * newQty }
          : item
      ));
    } else {
      persistCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        image_url: product.image_url,
        variety: "Pieces",
        unit_price: product.selling_price,
        quantity: quantity,
        tax: (product.selling_price * (product.tax_rate || 0)) / 100,
        discount: 0,
        total: product.selling_price * quantity,
      }]);
    }

    return { success: true };
  };

  // Empties the cart and its saved copy — only called by a confirmed Clear or a completed sale
  const clearCart = () => {
    persistCart([]);
    setSelectedCustomer(null);
    setOrderDiscount({ type: "percentage", value: 0 });
    setLoyaltyRedeem({ enabled: false, points: 0 });
    if (cartOwnerRef.current) clearSavedCart(cartOwnerRef.current);
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

        const product = products.find(p => p.id === item.product_id);
        const perUnit = getVarietyQuantity(product, item.variety);
        let remaining = item.quantity * perUnit;
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

      // Persist each cart line's selected variety price onto the product table
      // so the chosen variety becomes a saved selling option for future sales.
      for (const item of cart) {
        try {
          const product = products.find(p => p.id === item.product_id);
          if (!product) continue;
          const variety = item.variety || "Pieces";
          if (variety !== "Pieces" && item.unit_price > 0 && product.varieties?.[variety] == null) {
            const quantity = getVarietyQuantity(product, variety);
            const varieties = { ...(product.varieties || {}), [variety]: { price: item.unit_price, quantity } };
            await base44.entities.Product.update(item.product_id, { varieties });
          }
        } catch (e) {
          console.error("Error persisting variety price:", e);
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
    // Stock floor for every role: a sale can never take an item's stock below zero.
    // Admins keep their other exemptions (discounts, price overrides, amount limits);
    // only the offending line is blocked, with the available quantity shown, and the
    // rest of the cart is left untouched so it can be adjusted or removed.
    for (const item of cart) {
      const available = getAvailableStock(item.product_id);
      const product = products.find(p => p.id === item.product_id);
      const perUnit = getVarietyQuantity(product, item.variety);
      const needed = item.quantity * perUnit;
      if (item.quantity < 1 || available <= 0 || needed > available) {
        setShowCheckout(false);
        playErrorBuzz();
        const availableLabel = perUnit > 1
          ? `${available} pieces (${Math.floor(available / perUnit)} ${item.variety})`
          : `${available}`;
        setStockWarning(
          available <= 0
            ? `"${item.product_name}" has no stock left — remove it from the cart to continue.`
            : `Only ${availableLabel} of "${item.product_name}" in stock — reduce the quantity or remove it to continue.`
        );
        setTimeout(() => setStockWarning(""), 6000);
        throw new Error(`Not enough stock: ${item.product_name}`);
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
      company_name: selectedCompany?.name || companies[0]?.name || "",
      tenant_id: user?.tenant_id || companyId,
      invoice_number: invoiceNumber,
      customer_id: selectedCustomer?.id,
      customer_name: selectedCustomer?.name || "Walk-in Customer",
      sale_date: new Date().toISOString(),
      items: cart.map(i => ({
        ...i,
        product_name: i.variety && i.variety !== "Pieces" ? `${i.product_name} (${i.variety})` : i.product_name,
      })),
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
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">

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
                      setSearchTerm("");
                      setShowSearchDropdown(false);
                      setHighlightedIndex(0);
                      searchInputRef.current?.focus();
                      // Record the scan so the trailing Enter is swallowed (one scan = one add)
                      justScannedRef.current = { at: Date.now(), value: trimmed };
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
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        getAvailableStock(product.id) <= 0
                          ? "opacity-50 cursor-not-allowed"
                          : `cursor-pointer ${idx === highlightedIndex ? "bg-blue-50" : "hover:bg-slate-50"}`
                      }`}
                      onMouseDown={() => {
                        if (getAvailableStock(product.id) <= 0) return;
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
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getAvailableStock(product.id) <= 0 && (
                          <span className="text-[10px] font-semibold text-red-700 bg-red-100 border border-red-200 rounded-full px-2 py-0.5">
                            Out of stock
                          </span>
                        )}
                        <span className={`font-bold text-sm ${getAvailableStock(product.id) <= 0 ? "text-slate-500" : "text-blue-600"}`}>
                          {formatCurrency(product.selling_price || 0, currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddStock(true)}
                className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <PackagePlus className="w-4 h-4" />
                Add Stock
              </Button>
            </div>
            {usingCachedData && offlineCache.getLastSync() && (
              <p className="text-xs text-slate-500 mt-1">
                Last synced: {new Date(offlineCache.getLastSync()).toLocaleString()}
              </p>
            )}
          </div>

          {/* Favorites (PinnedItems) panel intentionally hidden from the POS layout —
              component and data kept so it can be restored by re-adding it here. */}

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
        <div className={`w-full md:w-[440px] lg:w-[520px] xl:w-[580px] bg-white border-l border-slate-200 flex flex-col shrink-0 ${mobileTab === "products" ? "hidden md:flex" : "flex"}`}>
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
                  <Button variant="ghost" size="sm" onClick={handleClearCart} className="text-white hover:bg-white/20 text-xs">
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

          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 overscroll-contain">
            <CartPanel
              cart={cart}
              products={products}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeFromCart}
              onUpdateVariety={updateVariety}
              onUpdateUnitPrice={updateUnitPrice}
              onSaveVarietyPrice={saveVarietyPrice}
              unsavedIds={unsavedVarietyIds}
              currency={currency}
            />
          </div>

          <div className="border-t border-slate-200 p-3 md:p-4 bg-slate-50 shrink-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Popover open={showDiscount} onOpenChange={setShowDiscount}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 border-blue-200 bg-white text-slate-700 hover:bg-blue-50"
                  >
                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                    Discount
                    {totals.discountAmount > 0 && (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        -{formatCurrency(totals.discountAmount, currency)}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  side="top"
                  className="w-[19rem] max-w-[calc(100vw-2rem)] p-3 max-h-[70vh] overflow-y-auto"
                >
                  <DiscountPanel
                    subtotal={totals.subtotal}
                    customer={selectedCustomer}
                    loyaltyProgram={loyaltyProgram}
                    orderDiscount={orderDiscount}
                    setOrderDiscount={setOrderDiscount}
                    loyaltyRedeem={loyaltyRedeem}
                    setLoyaltyRedeem={setLoyaltyRedeem}
                    currency={currency}
                    alwaysExpanded
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5 text-sm">
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
                  <span className="text-slate-600">Discount:</span>
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

      <AddStockDialog
        open={showAddStock}
        onClose={() => setShowAddStock(false)}
        products={products}
        inventory={inventory}
        companyId={posCompanyId}
        onSuccess={() => {
          queryClient.invalidateQueries(["inventory"]);
          queryClient.invalidateQueries(["products"]);
        }}
      />

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
        onClearCart={handleClearCart}
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