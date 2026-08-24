import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function BulkEditDialog({ open, onClose, selectedProducts, inventory, companyId, onSaved }) {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const invByProduct = {};
    (inventory || []).forEach((inv) => {
      invByProduct[inv.product_id] = inv;
    });
    setRows(
      selectedProducts.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.selling_price ?? 0,
        stock: invByProduct[p.id]?.quantity ?? 0,
        invId: invByProduct[p.id]?.id || null,
        origPrice: p.selling_price ?? 0,
        origStock: invByProduct[p.id]?.quantity ?? 0,
      }))
    );
  }, [open, selectedProducts, inventory]);

  const updateRow = (id, field, value) => {
    setRows((rs) =>
      rs.map((r) => (r.id === id ? { ...r, [field]: value === "" ? "" : Number(value) } : r))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const priceUpdates = rows
        .filter((r) => r.price !== "" && Number(r.price) !== Number(r.origPrice))
        .map((r) => ({ id: r.id, selling_price: Number(r.price) }));
      if (priceUpdates.length) {
        await base44.entities.Product.bulkUpdate(priceUpdates);
      }

      const stockUpdates = [];
      const stockCreates = [];
      rows.forEach((r) => {
        if (r.stock === "" || Number(r.stock) === Number(r.origStock)) return;
        if (r.invId) {
          stockUpdates.push({ id: r.invId, quantity: Number(r.stock) });
        } else {
          stockCreates.push({ company_id: companyId, product_id: r.id, quantity: Number(r.stock) });
        }
      });
      if (stockUpdates.length) await base44.entities.Inventory.bulkUpdate(stockUpdates);
      if (stockCreates.length) await base44.entities.Inventory.bulkCreate(stockCreates);

      onSaved?.();
      onClose();
    } catch (e) {
      console.error("Bulk edit failed", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Edit — {rows.length} products</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">
          Update prices and stock levels for all selected items at once.
        </p>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2 pr-2">Product</th>
                <th className="py-2 px-2 text-right">Price</th>
                <th className="py-2 px-2 text-right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 pr-2 font-medium text-slate-800 truncate max-w-[220px]">
                    {r.name}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={r.price}
                      onChange={(e) => updateRow(r.id, "price", e.target.value)}
                      className="w-24 h-8 text-right"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={r.stock}
                      onChange={(e) => updateRow(r.id, "stock", e.target.value)}
                      className="w-20 h-8 text-right"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}