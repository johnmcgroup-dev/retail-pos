import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DrawerSelect from "@/components/shared/DrawerSelect";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Truck, Package, DollarSign, ClipboardList, Plus, Trash2, PackagePlus, Building2, CreditCard, Banknote, CheckCircle, Search } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { logActivity } from "@/lib/logActivity";
import ProductSearchBox from "@/components/stocking/ProductSearchBox";
import SearchResultsPanel from "@/components/stocking/SearchResultsPanel";
import StockProductDialog from "@/components/inventory/StockProductDialog";
import ProductDialog from "@/components/products/ProductDialog";

const EMPTY_ITEM = {
  product_id: "", quantity: 1, unit_cost: 0,
  batch_number: "", manufacturing_date: "", expiration_date: ""
};

function generateBatchNumber() {
  const stamp = format(new Date(), "yyyyMMddHHmm");
  const rand = Math.floor(Math.random() * 999).toString().padStart(3, '0');
  return `BATCH-${stamp}-${rand}`;
}

function PayPurchaseDialog({ open, onClose, purchase, vendor, companyId }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(purchase ? (purchase.total_amount - (purchase.amount_paid || 0)).toFixed(2) : "");
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");

  React.useEffect(() => {
    if (purchase) setAmount((purchase.total_amount - (purchase.amount_paid || 0)).toFixed(2));
  }, [purchase]);

  const payMutation = useMutation({
    mutationFn: async () => {
      const paid = parseFloat(amount);
      const newAmountPaid = (purchase.amount_paid || 0) + paid;
      const newStatus = newAmountPaid >= purchase.total_amount ? "paid" : "partial";

      await base44.entities.Purchase.update(purchase.id, {
        amount_paid: newAmountPaid,
        payment_status: newStatus
      });

      await base44.entities.Payment.create({
        company_id: companyId,
        reference_type: "purchase",
        reference_id: purchase.id,
        payer_type: "vendor",
        payer_id: vendor?.id,
        payer_name: vendor?.name || purchase.vendor_name,
        payment_date: new Date().toISOString(),
        amount: paid,
        payment_method: method,
        transaction_reference: reference,
        payment_status: "completed",
        notes: `Payment for PO: ${purchase.po_number}`
      });

      if (vendor?.id) {
        await base44.entities.Vendor.update(vendor.id, {
          outstanding_balance: Math.max(0, (vendor.outstanding_balance || 0) - paid)
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["purchases"]);
      queryClient.invalidateQueries(["vendors"]);
      queryClient.invalidateQueries(["payments"]);
      onClose();
    }
  });

  if (!purchase) return null;
  const amountDue = purchase.total_amount - (purchase.amount_paid || 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pay for {purchase.po_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {vendor?.bank_name && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm space-y-1">
              <p className="font-semibold text-green-800 flex items-center gap-1"><Banknote className="w-4 h-4" /> Vendor Bank Details</p>
              <p className="text-green-700"><b>Bank:</b> {vendor.bank_name}</p>
              {vendor.bank_account_number && <p className="text-green-700"><b>Account:</b> {vendor.bank_account_number}</p>}
              {vendor.bank_account_name && <p className="text-green-700"><b>Name:</b> {vendor.bank_account_name}</p>}
              {vendor.bank_sort_code && <p className="text-green-700"><b>Sort Code:</b> {vendor.bank_sort_code}</p>}
            </div>
          )}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm flex justify-between">
            <span className="text-orange-700">Amount Due:</span>
            <span className="font-bold text-orange-900">₦{amountDue.toLocaleString()}</span>
          </div>
          <div>
            <Label>Amount to Pay</Label>
            <Input className="mt-1" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Payment Method</Label>
            <DrawerSelect
              value={method}
              onValueChange={setMethod}
              options={[
                { value: "bank_transfer", label: "Bank Transfer" },
                { value: "cash", label: "Cash" },
                { value: "check", label: "Cheque" },
                { value: "mobile_money", label: "Mobile Money" },
              ]}
              triggerClassName="mt-1 w-full h-9 text-sm rounded-md border px-3"
              label="Payment Method"
            />
          </div>
          <div>
            <Label>Reference</Label>
            <Input className="mt-1" value={reference} onChange={e => setReference(e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => payMutation.mutate()} disabled={!amount || parseFloat(amount) <= 0 || payMutation.isPending} className="bg-green-600 hover:bg-green-700">
              {payMutation.isPending ? "Processing..." : "Record Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Stocking() {
  const queryClient = useQueryClient();
  const [vendorId, setVendorId] = useState("");
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [notes, setNotes] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [successMsg, setSuccessMsg] = useState("");
  const [payingPurchase, setPayingPurchase] = useState(null);
  // Product search is completely independent of the product records and of the
  // order form below: its own local list of picked products, never a filter that
  // rewrites shared data.
  const [searchResults, setSearchResults] = useState([]);
  const [stockingProduct, setStockingProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date"),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => base44.entities.Vendor.list("-created_date"),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => base44.entities.Purchase.list("-purchase_date"),
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.Inventory.list(),
  });

  const companyId = companies[0]?.id;
  const selectedVendor = vendors.find(v => v.id === vendorId);
  const getProduct = (pid) => products.find(p => p.id === pid);

  const activeProducts = products.filter(p => p.status === 'active' || !p.status);

  // Search-result helpers — display only, no product record is ever written.
  const addSearchResult = (product) => {
    setSearchResults(prev => (prev.some(p => p.id === product.id) ? prev : [...prev, product]));
  };
  const removeSearchResult = (id) => setSearchResults(prev => prev.filter(p => p.id !== id));
  const clearSearchResults = () => setSearchResults([]);
  const getInventoryForProduct = (productId) => inventory.find(i => i.product_id === productId);

  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_cost)), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "product_id") {
      const product = getProduct(value);
      if (product) {
        newItems[index].unit_cost = product.cost_price || 0;
        if (!newItems[index].batch_number) newItems[index].batch_number = generateBatchNumber();
      }
    }
    setItems(newItems);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Company not loaded. Please reload and try again.");
      const user = await base44.auth.me();
      const vendor = vendors.find(v => v.id === vendorId);
      const now = new Date().toISOString();
      const poNumber = `PO-${format(new Date(), "yyyyMMdd")}-${Date.now().toString().slice(-4)}`;

      const purchaseItems = items.map(item => {
        const product = getProduct(item.product_id);
        return {
          product_id: item.product_id,
          product_name: product?.name || "",
          quantity: Number(item.quantity),
          unit_cost: Number(item.unit_cost),
          total: Number(item.quantity) * Number(item.unit_cost),
          batch_number: item.batch_number,
          manufacturing_date: item.manufacturing_date,
          expiration_date: item.expiration_date
        };
      });

      const purchase = await base44.entities.Purchase.create({
        company_id: companyId,
        po_number: poNumber,
        vendor_id: vendorId,
        vendor_name: vendor?.name || "",
        purchase_date: now,
        items: purchaseItems,
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        payment_status: "unpaid",
        amount_paid: 0,
        status: "received",
        notes
      });

      for (const item of items) {
        const product = getProduct(item.product_id);
        if (!product) continue;

        let existingInv = [];
        if (item.batch_number) {
          existingInv = await base44.entities.Inventory.filter({
            product_id: item.product_id,
            batch_number: item.batch_number
          });
        }

        let inventoryId, prevQty = 0;
        if (existingInv.length > 0) {
          prevQty = existingInv[0].quantity || 0;
          const updated = await base44.entities.Inventory.update(existingInv[0].id, {
            quantity: prevQty + Number(item.quantity),
            manufacturing_date: item.manufacturing_date || existingInv[0].manufacturing_date,
            expiration_date: item.expiration_date || existingInv[0].expiration_date,
            last_updated: now
          });
          inventoryId = updated.id;
        } else {
          const newInv = await base44.entities.Inventory.create({
            company_id: companyId,
            product_id: item.product_id,
            quantity: Number(item.quantity),
            batch_number: item.batch_number,
            manufacturing_date: item.manufacturing_date,
            expiration_date: item.expiration_date,
            last_updated: now
          });
          inventoryId = newInv.id;
        }

        await base44.entities.InventoryAdjustmentLog.create({
          company_id: companyId,
          inventory_id: inventoryId,
          product_id: item.product_id,
          product_name: product.name,
          adjusted_by: user.full_name || user.email,
          adjusted_by_email: user.email,
          previous_quantity: prevQty,
          new_quantity: prevQty + Number(item.quantity),
          change: Number(item.quantity),
          reason: "supplier_delivery",
          notes: `PO: ${poNumber}, Batch: ${item.batch_number}, Vendor: ${vendor?.name || ""}`,
          adjustment_date: now
        });

        // Audit: unified activity log for this inventory restock
        await logActivity({
          companyId,
          entityType: "inventory",
          action: "restock",
          entityId: inventoryId,
          referenceNumber: product.name,
          performedBy: user.email,
          performedByName: user.full_name,
          description: `Restock via ${poNumber}: ${product.name} ${prevQty} → ${prevQty + Number(item.quantity)} (+${item.quantity}, batch ${item.batch_number || "—"})`,
          details: { product_id: item.product_id, previous_quantity: prevQty, new_quantity: prevQty + Number(item.quantity), change: Number(item.quantity), vendor: vendor?.name, po_number: poNumber },
        });
      }

      if (vendor) {
        await base44.entities.Vendor.update(vendor.id, {
          total_purchases: (vendor.total_purchases || 0) + total,
          outstanding_balance: (vendor.outstanding_balance || 0) + total
        });
      }

      return purchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["purchases"]);
      queryClient.invalidateQueries(["inventory"]);
      queryClient.invalidateQueries(["vendors"]);
      queryClient.invalidateQueries(["products"]);
      setVendorId("");
      setItems([{ ...EMPTY_ITEM }]);
      setNotes("");
      setTaxRate(0);
      setSuccessMsg("Stock order created and inventory updated!");
      setTimeout(() => setSuccessMsg(""), 4000);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!companyId) {
      alert("Company not loaded yet. Please wait a moment and try again."); return;
    }
    if (!vendorId) { alert("Please select a vendor/supplier"); return; }
    if (items.some(i => !i.product_id || !i.quantity || i.quantity <= 0)) {
      alert("Please select products and enter quantities for all line items"); return;
    }
    saveMutation.mutate();
  };

  const totalStockValue = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
  const pendingOrders = purchases.filter(p => p.status === 'pending').length;
  const unpaidOrders = purchases.filter(p => p.payment_status === 'unpaid' || p.payment_status === 'partial').length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Stocking & Purchases</h1>
          <p className="text-slate-500 mt-1">Record supplier deliveries, manage vendor accounts</p>
        </div>
        <Link to="/StockingReport">
          <Button variant="outline" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            View Report
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-slate-500">Total Purchases</p><p className="text-xl font-bold text-slate-900">₦{totalStockValue.toLocaleString()}</p></div>
          <DollarSign className="w-8 h-8 text-green-500" />
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-slate-500">Total Orders</p><p className="text-xl font-bold text-slate-900">{purchases.length}</p></div>
          <Package className="w-8 h-8 text-blue-500" />
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-slate-500">Pending</p><p className="text-xl font-bold text-slate-900">{pendingOrders}</p></div>
          <Truck className="w-8 h-8 text-orange-500" />
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-slate-500">Unpaid Orders</p><p className="text-xl font-bold text-red-600">{unpaidOrders}</p></div>
          <CreditCard className="w-8 h-8 text-red-500" />
        </CardContent></Card>
      </div>

      {/* Product search — read-only. It only fills the Search Results panel below;
          the product catalog and the supply order form are never touched. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Find Products
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ProductSearchBox products={activeProducts} onSelect={addSearchResult} />
          <p className="text-xs text-slate-500">
            Searching only filters the suggestions. It never edits, saves or deletes a product.
          </p>
          <SearchResultsPanel
            products={searchResults}
            getInventory={getInventoryForProduct}
            onRemove={removeSearchResult}
            onClearAll={clearSearchResults}
            onStock={setStockingProduct}
            onEdit={setEditingProduct}
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="new-order">
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="new-order">New Supply Order</TabsTrigger>
          <TabsTrigger value="history">Order History</TabsTrigger>
        </TabsList>

        {/* New Order Form */}
        <TabsContent value="new-order">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-blue-600" />
                Record Supply from Vendor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {successMsg && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  {successMsg}
                </div>
              )}

              {vendors.length === 0 ? (
                <div className="text-center py-10 bg-yellow-50 rounded-lg border border-yellow-200">
                  <Building2 className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No vendors yet</p>
                  <p className="text-sm text-slate-500 mt-1">Add vendors from the Vendors page first.</p>
                  <Link to="/Vendors"><Button className="mt-3 gap-2" size="sm"><Plus className="w-4 h-4" />Add Vendor</Button></Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Vendor Selection */}
                  <div>
                    <Label>Vendor / Supplier *</Label>
                    <DrawerSelect
                      value={vendorId}
                      onValueChange={setVendorId}
                      options={vendors.filter(v => v.status === 'active' || !v.status).map(v => ({
                        value: v.id,
                        label: v.contact_person ? `${v.name} — ${v.contact_person}` : v.name
                      }))}
                      placeholder="Select a vendor"
                      triggerClassName="mt-1 w-full h-9 text-sm rounded-md border px-3"
                      label="Select Vendor"
                    />
                    {selectedVendor && (
                      <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-800 flex flex-wrap gap-3">
                        {selectedVendor.phone && <span>📞 {selectedVendor.phone}</span>}
                        {selectedVendor.bank_name && <span>🏦 {selectedVendor.bank_name} — {selectedVendor.bank_account_number}</span>}
                        <span className="text-orange-700 font-semibold">Outstanding: ₦{(selectedVendor.outstanding_balance || 0).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Line items */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b">
                          <tr>
                            <th className="text-left p-2 font-semibold text-slate-700 min-w-[160px]">Product</th>
                            <th className="text-right p-2 font-semibold text-slate-700 w-20">Qty</th>
                            <th className="text-right p-2 font-semibold text-slate-700 w-28">Unit Cost (₦)</th>
                            <th className="text-left p-2 font-semibold text-slate-700 w-36">Batch #</th>
                            <th className="text-left p-2 font-semibold text-slate-700 w-32">Mfg Date</th>
                            <th className="text-left p-2 font-semibold text-slate-700 w-32">Exp Date</th>
                            <th className="text-right p-2 font-semibold text-slate-700 w-24">Total</th>
                            <th className="w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {items.map((item, index) => {
                            const lineTotal = Number(item.quantity) * Number(item.unit_cost);
                            return (
                              <tr key={index}>
                                <td className="p-2">
                                  <DrawerSelect
                                    value={item.product_id}
                                    onValueChange={v => updateItem(index, "product_id", v)}
                                    options={activeProducts.map(p => ({
                                      value: p.id,
                                      label: p.name
                                    }))}
                                    placeholder="Select"
                                    triggerClassName="text-xs w-full h-8 rounded-md border px-2"
                                    label="Select Product"
                                  />
                                </td>
                                <td className="p-2">
                                  <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(index, "quantity", parseInt(e.target.value) || 0)} className="text-xs text-right w-20" />
                                </td>
                                <td className="p-2">
                                  <Input type="number" step="0.01" value={item.unit_cost} onChange={e => updateItem(index, "unit_cost", parseFloat(e.target.value) || 0)} className="text-xs text-right w-28" />
                                </td>
                                <td className="p-2">
                                  <Input value={item.batch_number} onChange={e => updateItem(index, "batch_number", e.target.value)} placeholder="Auto" className="text-xs w-36" />
                                </td>
                                <td className="p-2">
                                  <Input type="date" value={item.manufacturing_date} onChange={e => updateItem(index, "manufacturing_date", e.target.value)} className="text-xs w-32" />
                                </td>
                                <td className="p-2">
                                  <Input type="date" value={item.expiration_date} onChange={e => updateItem(index, "expiration_date", e.target.value)} className="text-xs w-32" />
                                </td>
                                <td className="p-2 text-right font-medium">₦{lineTotal.toLocaleString()}</td>
                                <td className="p-2">
                                  <Button type="button" variant="ghost" size="icon" onClick={() => items.length > 1 && setItems(items.filter((_, i) => i !== index))} disabled={items.length === 1} className="text-red-500 h-8 w-8">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-2 bg-slate-50 border-t">
                      <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { ...EMPTY_ITEM }])} className="gap-2">
                        <Plus className="w-4 h-4" /> Add Item
                      </Button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Notes</Label>
                      <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1" placeholder="Delivery notes, invoice number..." />
                    </div>
                    <div>
                      <Label>Tax Rate (%)</Label>
                      <Input type="number" step="0.01" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} className="mt-1" />
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 space-y-1.5">
                    <div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal</span><span>₦{subtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-600">Tax ({taxRate}%)</span><span>₦{taxAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between text-base font-bold border-t pt-2"><span>Total</span><span className="text-blue-600">₦{total.toLocaleString()}</span></div>
                  </div>

                  <Button type="submit" disabled={saveMutation.isPending} className="w-full bg-blue-600 hover:bg-blue-700">
                    <PackagePlus className="w-4 h-4 mr-2" />
                    {saveMutation.isPending ? "Processing..." : "Create Stock Order & Update Inventory"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Order History */}
        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>All Supply Orders</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-semibold text-slate-700">PO Number</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Vendor</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Date</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Items</th>
                      <th className="text-right p-3 font-semibold text-slate-700">Total</th>
                      <th className="text-right p-3 font-semibold text-slate-700">Paid</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Payment</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {purchases.map(purchase => {
                      const vendor = vendors.find(v => v.id === purchase.vendor_id);
                      const amountDue = purchase.total_amount - (purchase.amount_paid || 0);
                      return (
                        <tr key={purchase.id} className="hover:bg-slate-50">
                          <td className="p-3 font-medium text-blue-600">{purchase.po_number}</td>
                          <td className="p-3 text-slate-900">{purchase.vendor_name}</td>
                          <td className="p-3 text-slate-600">{purchase.purchase_date ? format(new Date(purchase.purchase_date), "MMM d, yyyy") : "-"}</td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {(purchase.items || []).slice(0, 2).map((item, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">{item.product_name}</Badge>
                              ))}
                              {(purchase.items || []).length > 2 && <Badge variant="outline" className="text-xs">+{purchase.items.length - 2}</Badge>}
                            </div>
                          </td>
                          <td className="p-3 text-right font-bold">₦{(purchase.total_amount || 0).toLocaleString()}</td>
                          <td className="p-3 text-right text-green-700 font-medium">₦{(purchase.amount_paid || 0).toLocaleString()}</td>
                          <td className="p-3">
                            <Badge className={
                              purchase.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                              purchase.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }>
                              {purchase.payment_status || 'unpaid'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {amountDue > 0 && (
                              <Button size="sm" variant="outline" className="gap-1 text-xs border-green-500 text-green-700 hover:bg-green-50" onClick={() => setPayingPurchase(purchase)}>
                                <CreditCard className="w-3 h-3" /> Pay
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {purchases.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-14 h-14 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500">No stock orders yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {stockingProduct && (
        <StockProductDialog
          open={!!stockingProduct}
          onClose={() => setStockingProduct(null)}
          product={stockingProduct}
          inventoryItem={getInventoryForProduct(stockingProduct.id)}
          companyId={companyId}
          onSuccess={() => {
            queryClient.invalidateQueries(["inventory"]);
            queryClient.invalidateQueries(["alerts"]);
          }}
        />
      )}

      <ProductDialog
        open={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        product={editingProduct}
        companies={companies}
        products={products}
        inventoryItem={editingProduct ? getInventoryForProduct(editingProduct.id) : null}
      />

      {payingPurchase && (
        <PayPurchaseDialog
          open={!!payingPurchase}
          onClose={() => setPayingPurchase(null)}
          purchase={payingPurchase}
          vendor={vendors.find(v => v.id === payingPurchase.vendor_id)}
          companyId={companyId}
        />
      )}
    </div>
  );
}