import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const REASONS = [
  { value: "stock_count", label: "Stock Count / Audit" },
  { value: "damage", label: "Damage" },
  { value: "expired", label: "Expired / Spoiled" },
  { value: "theft", label: "Theft / Loss" },
  { value: "return", label: "Customer Return" },
  { value: "supplier_delivery", label: "Supplier Delivery" },
  { value: "correction", label: "Correction" },
  { value: "other", label: "Other" },
];

export default function AdjustStockDialog({ open, onClose, inventoryItem, product, companyId, onSuccess }) {
  const [newQty, setNewQty] = useState(inventoryItem?.quantity ?? 0);
  const [reason, setReason] = useState("correction");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const prevQty = inventoryItem?.quantity ?? 0;
  const change = newQty - prevQty;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newQty < 0) return;
    setLoading(true);
    try {
      const user = await base44.auth.me();

      // Update inventory
      await base44.entities.Inventory.update(inventoryItem.id, { quantity: newQty });

      // Log the adjustment
      await base44.entities.InventoryAdjustmentLog.create({
        company_id: companyId,
        inventory_id: inventoryItem.id,
        product_id: product?.id,
        product_name: product?.name,
        adjusted_by: user.full_name || user.email,
        adjusted_by_email: user.email,
        previous_quantity: prevQty,
        new_quantity: newQty,
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock — {product?.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg text-sm">
            <div>
              <p className="text-slate-500">Current Stock</p>
              <p className="text-xl font-bold text-slate-900">{prevQty}</p>
            </div>
            <div className="text-slate-400">→</div>
            <div>
              <p className="text-slate-500">New Stock</p>
              <p className={`text-xl font-bold ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                {newQty} {change !== 0 && <span className="text-sm">({change > 0 ? '+' : ''}{change})</span>}
              </p>
            </div>
          </div>

          <div>
            <Label>New Quantity *</Label>
            <Input
              type="number"
              min="0"
              value={newQty}
              onChange={e => setNewQty(parseInt(e.target.value) || 0)}
              required
              className="mt-1"
            />
          </div>

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
            <Button type="submit" disabled={loading || newQty === prevQty} className="bg-blue-600 hover:bg-blue-700">
              {loading ? "Saving..." : "Save Adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}