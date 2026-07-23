import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, Equal, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const REASONS = [
  { value: "stock_count", label: "Stock Count" },
  { value: "damage", label: "Damage" },
  { value: "expired", label: "Expired" },
  { value: "theft", label: "Theft" },
  { value: "return", label: "Return" },
  { value: "supplier_delivery", label: "Supplier Delivery" },
  { value: "correction", label: "Correction" },
  { value: "other", label: "Other" },
];

const ADJUSTMENT_TYPES = [
  { value: "add", label: "Add Stock", icon: Plus, color: "text-green-600", desc: "Increase quantity by" },
  { value: "remove", label: "Remove Stock", icon: Minus, color: "text-red-600", desc: "Decrease quantity by" },
  { value: "set", label: "Set To", icon: Equal, color: "text-blue-600", desc: "Set quantity to" },
];

export default function BulkAdjustDialog({ open, onClose, selectedItems = [], companyId, onSuccess }) {
  const [adjustmentType, setAdjustmentType] = useState("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("stock_count");
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty < 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (adjustmentType === "set" && qty < 0) {
      toast.error("Quantity cannot be negative");
      return;
    }

    setIsProcessing(true);
    try {
      const now = new Date().toISOString();
      let successCount = 0;
      let failCount = 0;

      for (const item of selectedItems) {
        try {
          const prevQty = item.quantity ?? 0;
          let newQty;
          if (adjustmentType === "add") newQty = prevQty + qty;
          else if (adjustmentType === "remove") newQty = prevQty - qty;
          else newQty = qty;

          if (newQty < 0) newQty = 0;

          await base44.entities.Inventory.update(item.id, {
            quantity: newQty,
            last_updated: now,
          });

          await base44.entities.InventoryAdjustmentLog.create({
            company_id: companyId,
            inventory_id: item.id,
            product_id: item.product_id,
            product_name: item.product?.name || "Unknown",
            adjusted_by: "Bulk Adjustment",
            previous_quantity: prevQty,
            new_quantity: newQty,
            change: newQty - prevQty,
            reason,
            notes: notes || `Bulk ${adjustmentType}: ${qty}`,
            adjustment_date: now,
          });

          successCount++;
        } catch (err) {
          console.error("Failed to adjust:", item.product?.name, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Updated ${successCount} item${successCount !== 1 ? "s" : ""}${failCount > 0 ? ` (${failCount} failed)` : ""}`);
      } else {
        toast.error("No items were updated");
      }

      if (onSuccess) onSuccess();
      // Reset form
      setQuantity("");
      setNotes("");
      onClose();
    } catch (error) {
      toast.error("Bulk adjustment failed: " + (error?.message || ""));
    } finally {
      setIsProcessing(false);
    }
  };

  const previewCount = selectedItems.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Bulk Adjust Stock
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Selected items summary */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>{previewCount}</strong> item{previewCount !== 1 ? "s" : ""} selected for bulk adjustment
            </p>
          </div>

          {/* Adjustment type */}
          <div>
            <Label>Adjustment Type</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {ADJUSTMENT_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setAdjustmentType(type.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                      adjustmentType === type.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${type.color}`} />
                    <span className="text-xs font-medium text-slate-700">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <Label>{ADJUSTMENT_TYPES.find(t => t.value === adjustmentType)?.desc}</Label>
            <Input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="mt-1 text-lg font-semibold"
              placeholder="0"
              min="0"
            />
          </div>

          {/* Reason */}
          <div>
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REASONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="mt-1"
              placeholder="e.g. Monthly stock count, damaged in transit..."
              rows={2}
            />
          </div>

          {/* Warning for remove/set */}
          {adjustmentType === "remove" && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800">
                Quantities will not go below zero. Items already at zero will remain at zero.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={isProcessing || !quantity || previewCount === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isProcessing ? `Adjusting...` : `Adjust ${previewCount} Item${previewCount !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}