import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PackagePlus, AlertTriangle } from "lucide-react";

const REASONS = [
  { value: "supplier_delivery", label: "Supplier Delivery / New Stock" },
  { value: "stock_count", label: "Stock Count / Audit" },
  { value: "return", label: "Customer Return" },
  { value: "correction", label: "Correction" },
  { value: "damage", label: "Damage" },
  { value: "theft", label: "Theft / Loss" },
  { value: "other", label: "Other" },
];

export default function StockProductDialog({ open, onClose, product, inventoryItem, companyId, onSuccess }) {
  const [mode, setMode] = useState("set"); // "set" = exact count, "add" = add to existing
  const [newQty, setNewQty] = useState(0);
  const [addQty, setAddQty] = useState(0);
  const [reason, setReason] = useState("supplier_delivery");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const prevQty = inventoryItem?.quantity ?? 0;
  const hasInventory = !!inventoryItem;

  useEffect(() => {
    if (open) {
      setMode(hasInventory ? "add" : "set");
      setNewQty(prevQty);
      setAddQty(0);
      setReason("supplier_delivery");
      setNotes("");
    }
  }, [open]);

  const finalQty = mode === "set" ? newQty : prevQty + addQty;
  const change = finalQty - prevQty;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (finalQty < 0) return;
    setLoading(true);
    try {
      const user = await base44.auth.me();

      if (hasInventory) {
        // Update existing inventory
        await base44.entities.Inventory.update(inventoryItem.id, { quantity: finalQty, last_updated: new Date().toISOString() });
      } else {
        // Create new inventory record
        await base44.entities.Inventory.create({
          company_id: companyId,
          product_id: product?.id,
          quantity: finalQty,
          last_updated: new Date().toISOString(),
        });
      }

      // Log the adjustment
      await base44.entities.InventoryAdjustmentLog.create({
        company_id: companyId,
        inventory_id: inventoryItem?.id,
        product_id: product?.id,
        product_name: product?.name,
        adjusted_by: user.full_name || user.email,
        adjusted_by_email: user.email,
        previous_quantity: prevQty,
        new_quantity: finalQty,
        change,
        reason,
        notes,
        adjustment_date: new Date().toISOString(),
      });

      onSuccess?.();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const isLowStock = product?.reorder_level && finalQty <= product.reorder_level;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-blue-600" />
            {hasInventory ? "Adjust Stock" : "Add Stock"} — {product?.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Current → New display */}
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg text-sm">
            <div>
              <p className="text-slate-500 text-xs">Current Stock</p>
              <p className="text-xl font-bold text-slate-900">{prevQty}</p>
            </div>
            <div className="text-slate-400 text-lg">→</div>
            <div>
              <p className="text-slate-500 text-xs">New Stock</p>
              <p className={`text-xl font-bold ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                {finalQty} {change !== 0 && <span className="text-sm">({change > 0 ? '+' : ''}{change})</span>}
              </p>
            </div>
          </div>

          {/* Mode toggle - only if inventory exists */}
          {hasInventory && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "add" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setMode("add")}
              >
                Add to Stock
              </Button>
              <Button
                type="button"
                variant={mode === "set" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setMode("set")}
              >
                Set Exact Count
              </Button>
            </div>
          )}

          {/* Input */}
          {mode === "add" ? (
            <div>
              <Label>Quantity to Add *</Label>
              <Input
                type="number"
                min="0"
                value={addQty}
                onChange={e => setAddQty(parseInt(e.target.value) || 0)}
                required
                className="mt-1"
                placeholder="e.g. 50"
              />
            </div>
          ) : (
            <div>
              <Label>Total Quantity *</Label>
              <Input
                type="number"
                min="0"
                value={newQty}
                onChange={e => setNewQty(parseInt(e.target.value) || 0)}
                required
                className="mt-1"
                placeholder="e.g. 100"
              />
            </div>
          )}

          {/* Low stock warning */}
          {isLowStock && finalQty > 0 && (
            <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              This will still be below the reorder level ({product.reorder_level}).
            </div>
          )}

          <div>
            <Label>Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Add any additional notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="mt-1 resize-none"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={loading || (mode === "set" ? newQty === prevQty : addQty === 0)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Saving..." : hasInventory ? "Save Adjustment" : "Add Stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}