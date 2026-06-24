import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, PackagePlus, Building2 } from "lucide-react";
import { format } from "date-fns";

const EMPTY_ITEM = { product_id: "", quantity: 1, unit_cost: 0, batch_number: "", manufacturing_date: "", expiration_date: "" };

export default function StockOrderForm({ products, vendors, companyId, onSuccess }) {
  const queryClient = useQueryClient();
  const [vendorId, setVendorId] = useState("");
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [notes, setNotes] = useState("");
  const [taxRate, setTaxRate] = useState(0);

  const getProduct = (pid) => products.find(p => p.id === pid);

  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_cost)), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const generateBatchNumber = () => {
    const stamp = format(new Date(), "yyyyMMddHHmmss");
    const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BATCH-${stamp}-${rand}`;
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "product_id") {
      const product = getProduct(value);
      if (product) {
        newItems[index].unit_cost = product.cost_price || 0;
        if (!newItems[index].batch_number) {
          newItems[index].batch_number = generateBatchNumber();
        }
      }
    }

    setItems(newItems);
  };

  const addLineItem = () => {
    setItems([...items, { ...EMPTY_ITEM }]);
  };

  const removeLineItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
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

      // Create Purchase record linked to vendor
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

      // Create/update inventory with batch info + adjustment logs
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

        let inventoryId;
        let prevQty = 0;
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
      }

      // Update vendor account totals
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
      onSuccess?.();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!vendorId) {
      alert("Please select a vendor/supplier");
      return;
    }
    if (items.some(i => !i.product_id || !i.quantity || i.quantity <= 0)) {
      alert("Please select products and enter quantities for all line items");
      return;
    }
    saveMutation.mutate();
  };

  if (vendors.length === 0) {
    return (
      <div className="text-center py-12 bg-yellow-50 rounded-lg border border-yellow-200">
        <Building2 className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
        <p className="text-slate-700 font-medium">No vendors found</p>
        <p className="text-sm text-slate-500 mt-1">Please add vendors first before creating stock orders.</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12 bg-yellow-50 rounded-lg border border-yellow-200">
        <PackagePlus className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
        <p className="text-slate-700 font-medium">No products found</p>
        <p className="text-sm text-slate-500 mt-1">Please add products first before creating stock orders.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Vendor / Supplier *</Label>
        <Select value={vendorId} onValueChange={setVendorId}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select a vendor/supplier" />
          </SelectTrigger>
          <SelectContent>
            {vendors.filter(v => v.status === 'active' || !v.status).map(vendor => (
              <SelectItem key={vendor.id} value={vendor.id}>
                {vendor.name}{vendor.contact_person ? ` — ${vendor.contact_person}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-2 font-semibold text-slate-700">Product</th>
                <th className="text-right p-2 font-semibold text-slate-700 w-20">Qty</th>
                <th className="text-right p-2 font-semibold text-slate-700 w-24">Unit Cost</th>
                <th className="text-left p-2 font-semibold text-slate-700 w-40">Batch #</th>
                <th className="text-left p-2 font-semibold text-slate-700 w-36">Mfg Date</th>
                <th className="text-left p-2 font-semibold text-slate-700 w-36">Exp Date</th>
                <th className="text-right p-2 font-semibold text-slate-700 w-24">Total</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, index) => {
                const lineTotal = Number(item.quantity) * Number(item.unit_cost);
                return (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="p-2">
                      <Select value={item.product_id} onValueChange={(v) => updateItem(index, "product_id", v)}>
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.filter(p => p.status === 'active' || !p.status).map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                        className="text-xs text-right w-20"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_cost}
                        onChange={e => updateItem(index, "unit_cost", parseFloat(e.target.value) || 0)}
                        className="text-xs text-right w-24"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={item.batch_number}
                        onChange={e => updateItem(index, "batch_number", e.target.value)}
                        placeholder="Auto-generated"
                        className="text-xs w-40"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="date"
                        value={item.manufacturing_date}
                        onChange={e => updateItem(index, "manufacturing_date", e.target.value)}
                        className="text-xs w-36"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="date"
                        value={item.expiration_date}
                        onChange={e => updateItem(index, "expiration_date", e.target.value)}
                        className="text-xs w-36"
                      />
                    </td>
                    <td className="p-2 text-right font-medium text-slate-900">
                      ₦{lineTotal.toFixed(2)}
                    </td>
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(index)}
                        disabled={items.length === 1}
                        className="text-red-500 hover:text-red-700 h-8 w-8"
                      >
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
          <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Line Item
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Order notes..."
            rows={2}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Tax Rate (%)</Label>
          <Input
            type="number"
            step="0.01"
            value={taxRate}
            onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Subtotal</span>
          <span className="font-medium text-slate-900">₦{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Tax ({taxRate}%)</span>
          <span className="font-medium text-slate-900">₦{taxAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t pt-2">
          <span className="text-slate-900">Total</span>
          <span className="text-blue-600">₦{total.toFixed(2)}</span>
        </div>
      </div>

      <Button
        type="submit"
        disabled={saveMutation.isPending}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        <PackagePlus className="w-4 h-4 mr-2" />
        {saveMutation.isPending ? "Processing..." : "Create Stock Order"}
      </Button>
    </form>
  );
}