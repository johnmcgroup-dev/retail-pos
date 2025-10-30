import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  User,
  CreditCard,
  Smartphone
} from "lucide-react";
import ProductGrid from "../components/pos/ProductGrid";
import CartPanel from "../components/pos/CartPanel";
import CheckoutDialog from "../components/pos/CheckoutDialog";
import CustomerSelector from "../components/pos/CustomerSelector";

export default function POS() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.filter({ status: "active" }),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  useEffect(() => {
    if (companies.length > 0 && !selectedCompany) {
      setSelectedCompany(companies[0]);
    }
  }, [companies, selectedCompany]);

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
      const sale = await base44.entities.Sale.create(saleData);
      
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
      clearCart();
      setShowCheckout(false);
    },
  });

  const handleCheckout = async (paymentData) => {
    const totals = calculateTotals();
    const invoiceNumber = `INV-${Date.now()}`;
    
    const saleData = {
      company_id: selectedCompany.id,
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
      cashier: (await base44.auth.me()).email
    };

    await createSaleMutation.mutateAsync(saleData);
  };

  const totals = calculateTotals();

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-slate-50">
      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-auto p-4">
          <ProductGrid products={filteredProducts} onAddToCart={addToCart} />
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-full md:w-[450px] bg-white border-l border-slate-200 flex flex-col shadow-2xl">
        {/* Cart Header */}
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

        {/* Customer Selector */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <CustomerSelector
            customers={customers}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
          />
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto">
          <CartPanel
            cart={cart}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeFromCart}
          />
        </div>

        {/* Cart Footer */}
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
            Complete Sale
          </Button>
        </div>
      </div>

      {/* Checkout Dialog */}
      <CheckoutDialog
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        total={totals.total}
        onComplete={handleCheckout}
        isProcessing={createSaleMutation.isPending}
      />
    </div>
  );
}