
import React, { useState, useEffect } from "react";
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
  AlertCircle
} from "lucide-react";
import ProductGrid from "../components/pos/ProductGrid";
import CartPanel from "../components/pos/CartPanel";
import CheckoutDialog from "../components/pos/CheckoutDialog";
import CustomerSelector from "../components/pos/CustomerSelector";
import ConnectionStatus from "../components/shared/ConnectionStatus";
import { offlineCache, CACHE_KEYS, useOnlineStatus } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AlertBanner from "../components/notifications/AlertBanner";

export default function POS() {
  const queryClient = useQueryClient();
  const { isOnline, wasOffline } = useOnlineStatus();
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
    enabled: isOnline,
  });

  // Products query with offline support
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      if (!isOnline) {
        // Try to load from cache when offline
        const cached = offlineCache.get(CACHE_KEYS.PRODUCTS);
        if (cached) {
          setUsingCachedData(true);
          return cached;
        }
        return [];
      }

      // Fetch from server when online
      const data = await base44.entities.Product.filter({ status: "active" });
      // Cache the data
      offlineCache.set(CACHE_KEYS.PRODUCTS, data);
      offlineCache.updateLastSync();
      setUsingCachedData(false);
      return data;
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    initialData: () => {
      // Try to load from cache immediately
      const cached = offlineCache.get(CACHE_KEYS.PRODUCTS);
      if (cached) {
        setUsingCachedData(true);
        return cached;
      }
      return [];
    }
  });

  // Customers query with offline support
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      if (!isOnline) {
        const cached = offlineCache.get(CACHE_KEYS.CUSTOMERS);
        return cached || [];
      }

      const data = await base44.entities.Customer.list();
      offlineCache.set(CACHE_KEYS.CUSTOMERS, data);
      return data;
    },
    enabled: isOnline,
    initialData: () => offlineCache.get(CACHE_KEYS.CUSTOMERS) || []
  });

  // Inventory query with offline support
  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      if (!isOnline) {
        const cached = offlineCache.get(CACHE_KEYS.INVENTORY);
        return cached || [];
      }

      const data = await base44.entities.Inventory.list();
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

  const dismissAlertMutation = useMutation({
    mutationFn: (alertId) => base44.entities.Alert.update(alertId, { is_dismissed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(["alerts"]);
    },
  });

  useEffect(() => {
    if (companies.length > 0 && !selectedCompany) {
      setSelectedCompany(companies[0]);
    }
  }, [companies, selectedCompany]);

  // Sync pending sales when back online
  useEffect(() => {
    if (wasOffline && isOnline) {
      syncOfflineSales();
    }
  }, [wasOffline, isOnline]);

  // Check for pending sales on mount
  useEffect(() => {
    const pending = offlineCache.getPendingOfflineSales();
    setPendingSyncCount(pending.length);
  }, []);

  const syncOfflineSales = async () => {
    const pendingSales = offlineCache.getPendingOfflineSales();
    
    for (const sale of pendingSales) {
      try {
        await base44.entities.Sale.create(sale);
        offlineCache.markSaleSynced(sale.offlineTimestamp);
        
        // Update inventory
        for (const item of sale.items) {
          const inventoryRecords = await base44.entities.Inventory.filter({
            product_id: item.product_id,
            company_id: selectedCompany?.id || companies[0]?.id
          });
          
          if (inventoryRecords.length > 0) {
            const inv = inventoryRecords[0];
            await base44.entities.Inventory.update(inv.id, {
              quantity: inv.quantity - item.quantity
            });
          }
        }
      } catch (error) {
        console.error("Error syncing offline sale:", error);
      }
    }

    // Refresh data after sync
    queryClient.invalidateQueries(["sales"]);
    queryClient.invalidateQueries(["inventory"]);
    setPendingSyncCount(0);
  };

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcodes?.some(b => b.includes(searchTerm))
  );

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        unit_price: product.selling_price,
        quantity: 1,
        tax: (product.selling_price * (product.tax_rate || 0)) / 100,
        discount: 0,
        total: product.selling_price
      }]);
    }
  };

  const updateQuantity = (productId, newQuantity) => {
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

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = cart.reduce((sum, item) => sum + (item.tax * item.quantity), 0);
    const discountAmount = cart.reduce((sum, item) => sum + item.discount, 0);
    const total = subtotal + taxAmount - discountAmount;
    return { subtotal, taxAmount, discountAmount, total };
  };

  const createSaleMutation = useMutation({
    mutationFn: async (saleData) => {
      if (!isOnline) {
        // Save to offline queue
        offlineCache.saveOfflineSale(saleData);
        setPendingSyncCount(prev => prev + 1);
        return { offline: true };
      }

      // Process online
      const sale = await base44.entities.Sale.create(saleData);
      
      // Award loyalty points if customer is registered
      if (saleData.customer_id && selectedCompany) {
        const loyaltyPrograms = await base44.entities.LoyaltyProgram.filter({
          company_id: selectedCompany.id,
          active: true
        });

        if (loyaltyPrograms.length > 0) {
          const program = loyaltyPrograms[0];
          const pointsEarned = Math.floor(saleData.total_amount * program.points_per_dollar);
          
          if (pointsEarned > 0) {
            // Find customer
            const customer = customers.find(c => c.id === saleData.customer_id);
            if (customer) {
              const newBalance = (customer.loyalty_points || 0) + pointsEarned;
              
              // Create loyalty transaction
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

              // Update customer points
              await base44.entities.Customer.update(customer.id, {
                loyalty_points: newBalance
              });

              // Update sale with loyalty points info
              await base44.entities.Sale.update(sale.id, {
                loyalty_points_earned: pointsEarned
              });
            }
          }
        }
      }
      
      // Update inventory
      for (const item of cart) {
        const inventoryRecords = await base44.entities.Inventory.filter({
          product_id: item.product_id,
          company_id: selectedCompany.id
        });
        
        if (inventoryRecords.length > 0) {
          const inv = inventoryRecords[0];
          await base44.entities.Inventory.update(inv.id, {
            quantity: inv.quantity - item.quantity
          });
        }
      }
      
      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["sales"]);
      queryClient.invalidateQueries(["inventory"]);
      queryClient.invalidateQueries(["customers"]);
      queryClient.invalidateQueries(["loyaltyTransactions"]);
      clearCart();
      setShowCheckout(false);
    },
  });

  const handleCheckout = async (paymentData) => {
    const totals = calculateTotals();
    const invoiceNumber = `INV-${Date.now()}`;
    
    let cashierEmail = "offline_user";
    if (isOnline) {
      try {
        const currentUser = await base44.auth.me();
        cashierEmail = currentUser.email;
      } catch (error) {
        console.error("Error getting user:", error);
      }
    }
    
    const saleData = {
      company_id: selectedCompany?.id || companies[0]?.id,
      invoice_number: invoiceNumber,
      customer_id: selectedCustomer?.id,
      customer_name: selectedCustomer?.name || "Walk-in Customer",
      sale_date: new Date().toISOString(),
      items: cart,
      subtotal: totals.subtotal,
      tax_amount: totals.taxAmount,
      discount_amount: totals.discountAmount,
      total_amount: totals.total,
      payment_method: paymentData.method,
      payment_status: "paid",
      amount_paid: totals.total,
      amount_due: 0,
      cashier: cashierEmail
    };

    await createSaleMutation.mutateAsync(saleData);
  };

  const totals = calculateTotals();

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-slate-50">
      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Connection Status Bar */}
        <div className="p-4 bg-white border-b border-slate-200">
          <ConnectionStatus usingCache={usingCachedData && isOnline} />
          
          {/* Alert Banners */}
          <AlertBanner 
            alerts={alerts.filter(a => a.severity === 'critical')} 
            onDismiss={(id) => dismissAlertMutation.mutate(id)}
            onViewAll={() => {}}
          />
          
          {pendingSyncCount > 0 && (
            <Alert className="mb-2 bg-yellow-50 border-yellow-300">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <span className="font-semibold">{pendingSyncCount} offline sale(s)</span> waiting to sync
                {isOnline && " - Syncing now..."}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-white border-b border-slate-200 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search products by name, SKU, or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-lg"
              autoFocus
            />
          </div>
          {usingCachedData && offlineCache.getLastSync() && (
            <p className="text-xs text-slate-500 mt-2">
              Last synced: {new Date(offlineCache.getLastSync()).toLocaleString()}
            </p>
          )}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-auto p-4">
          <ProductGrid products={filteredProducts} onAddToCart={addToCart} />
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-full md:w-[450px] bg-white border-l border-slate-200 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center justify-between text-white">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <ShoppingCart className="w-6 h-6" />
                Cart
              </h2>
              <p className="text-sm opacity-90">{cart.length} items</p>
            </div>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-white hover:bg-white/20"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <CustomerSelector
            customers={customers}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
          />
        </div>

        <div className="flex-1 overflow-auto">
          <CartPanel
            cart={cart}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeFromCart}
          />
        </div>

        <div className="border-t border-slate-200 p-6 bg-slate-50">
          <div className="space-y-3 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-semibold">${totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Tax:</span>
              <span className="font-semibold">${totals.taxAmount.toFixed(2)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Discount:</span>
                <span className="font-semibold text-green-600">-${totals.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold pt-3 border-t border-slate-300">
              <span>Total:</span>
              <span className="text-blue-600">${totals.total.toFixed(2)}</span>
            </div>
          </div>

          <Button
            className="w-full h-14 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
            disabled={cart.length === 0}
            onClick={() => setShowCheckout(true)}
          >
            <DollarSign className="w-5 h-5 mr-2" />
            Complete Sale {!isOnline && "(Offline)"}
          </Button>
          
          {!isOnline && cart.length > 0 && (
            <p className="text-xs text-center text-slate-500 mt-2">
              Sale will be saved locally and synced when online
            </p>
          )}
        </div>
      </div>

      <CheckoutDialog
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        total={totals.total}
        onComplete={handleCheckout}
        isProcessing={createSaleMutation.isPending}
        isOffline={!isOnline}
      />
    </div>
  );
}
