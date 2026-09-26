import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PackagePlus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { logActivity } from "@/lib/logActivity";

/**
 * Quick "Add Stock" popup used from the POS screen.
 * Adds quantity to a product's inventory and records it in the stock history —
 * exactly like the Stocking page — without touching the current cart.
 */
export default function AddStockDialog({ open, onClose, products = [], inventory = [], companyId, onSuccess }) {
  const { toast } = useToast();
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const sortedProducts = [...products].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const selectedProduct = products.find(p => p.id === productId);
  const currentStock = inventory
    .filter(i => i.product_id === productId)
    .reduce((sum, i) => sum + (i.quantity || 0), 0);

  useEffect(() => {
    if (open) {
      setProductId("");
      setQty("");
      setError("");
      setSaving(false);
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = Number(qty);
    if (!productId) {
      setError("Select a product first.");
      return;
    }
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
      setError("Enter a positive whole number to add.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const user = await base44.auth.me();

      // Add to the product's existing stock record, or create one if none exists
      const records = await base44.entities.Inventory.filter({ product_id: productId, company_id: companyId });
      const target = records[0];
      const previous = records.reduce((sum, r) => sum + (r.quantity || 0), 0);
      const newTotal = previous + amount;

      if (target) {
        await base44.entities.Inventory.update(target.id, {
          quantity: (target.quantity || 0) + amount,
          last_updated: new Date().toISOString(),
        });
      } else {
        await base44.entities.Inventory.create({
          company_id: companyId,
          product_id: productId,
          quantity: amount,
          last_updated: new Date().toISOString(),
        });
      }

      // Stock history entry (same log the Stocking page writes)
      await base44.entities.InventoryAdjustmentLog.create({
        company_id: companyId,
        inventory_id: target?.id,
        product_id: productId,
        product_name: selectedProduct?.name,
        adjusted_by: user?.full_name || user?.email,
        adjusted_by_email: user?.email,
        previous_quantity: previous,
        new_quantity: newTotal,
        change: amount,
        reason: "supplier_delivery",
        notes: "Added from POS",
        adjustment_date: new Date().toISOString(),
      });

      logActivity({
        companyId,
        entityType: "inventory",
        action: "restock",
        entityId: target?.id,
        referenceNumber: selectedProduct?.name,
        description: `Added ${amount} unit(s) to ${selectedProduct?.name} from POS`,
        performedBy: user?.email,
        performedByName: user?.full_name,
        details: { previous_quantity: previous, new_quantity: newTotal },
      });

      toast({
        title: "Stock updated",
        description: `Added ${amount} to ${selectedProduct?.name}.`,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError("Could not update stock. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-blue-600" />
            Add Stock
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label>Product *</Label>
            <select
              value={productId}
              onChange={(e) => { setProductId(e.target.value); setError(""); }}
              className="mt-1 h-9 w-full text-sm border border-slate-300 rounded-md px-2 bg-white"
              required
            >
              <option value="">Select a product...</option>
              {sortedProducts.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {selectedProduct && (
              <p className="text-xs text-slate-500 mt-1">Current stock: {currentStock}</p>
            )}
          </div>

          <div>
            <Label>Quantity to Add *</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={qty}
              onChange={(e) => { setQty(e.target.value); setError(""); }}
              className="mt-1"
              placeholder="e.g. 20"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? "Saving..." : "Add Stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}