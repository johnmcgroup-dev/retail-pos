import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatCurrency } from "@/utils";

export default function ReorderSuggestionsDialog({
  open,
  onClose,
  inventory = [],
  products = [],
  vendors = [],
  purchases = [],
  company,
  onSuccess,
}) {
  const [isCreating, setIsCreating] = useState(false);

  const lowStockItems = useMemo(() => {
    return inventory
      .map((inv) => ({
        ...inv,
        product: products.find((p) => p.id === inv.product_id),
      }))
      .filter((inv) => {
        if (!inv.product) return false;
        const reorderLevel = inv.product.reorder_level ?? 10;
        return inv.quantity <= reorderLevel;
      });
  }, [inventory, products]);

  const findVendorForProduct = (productId) => {
    const sorted = [...purchases].sort(
      (a, b) =>
        new Date(b.purchase_date || b.created_date || 0) -
        new Date(a.purchase_date || a.created_date || 0)
    );
    const vendorById = new Map(vendors.map((v) => [v.id, v]));
    for (const p of sorted) {
      if (
        (p.items || []).some((it) => it.product_id === productId) &&
        p.vendor_id &&
        vendorById.has(p.vendor_id)
      ) {
        return vendorById.get(p.vendor_id);
      }
    }
    return null;
  };

  const { groups, noVendor } = useMemo(() => {
    const groups = {};
    const noVendor = [];
    for (const inv of lowStockItems) {
      const reorderLevel = inv.product.reorder_level ?? 10;
      const suggestedQty = Math.max(reorderLevel * 2 - inv.quantity, reorderLevel);
      const vendor = findVendorForProduct(inv.product_id);
      if (!vendor) {
        noVendor.push({ product: inv.product, suggestedQty });
        continue;
      }
      if (!groups[vendor.id]) groups[vendor.id] = { vendor, items: [] };
      groups[vendor.id].items.push({
        product: inv.product,
        suggestedQty,
        unitCost: inv.product.cost_price || 0,
        currentStock: inv.quantity,
        reorderLevel,
      });
    }
    return { groups, noVendor };
  }, [lowStockItems, vendors, purchases]);

  const totalEstimatedCost = Object.values(groups).reduce(
    (sum, g) => sum + g.items.reduce((s, it) => s + it.suggestedQty * it.unitCost, 0),
    0
  );

  const handleGenerateAll = async () => {
    setIsCreating(true);
    try {
      const companyId = company?.id;
      const now = new Date().toISOString();
      let created = 0;

      for (const vid of Object.keys(groups)) {
        const g = groups[vid];
        const items = g.items.map((it) => ({
          product_id: it.product.id,
          product_name: it.product.name,
          quantity: it.suggestedQty,
          unit_cost: it.unitCost,
          total: it.suggestedQty * it.unitCost,
        }));
        const subtotal = items.reduce((s, i) => s + i.total, 0);
        const poNumber = `PO-${format(new Date(), "yyyyMMdd")}-${Date.now()
          .toString()
          .slice(-4)}-${vid.slice(-3)}`;
        await base44.entities.Purchase.create({
          company_id: companyId,
          po_number: poNumber,
          vendor_id: vid,
          vendor_name: g.vendor.name,
          purchase_date: now,
          items,
          subtotal,
          tax_amount: 0,
          total_amount: subtotal,
          payment_status: "unpaid",
          amount_paid: 0,
          status: "pending",
          notes: "Auto-generated from low stock reorder suggestions",
        });
        created++;
      }

      if (created === 0) {
        toast.error("No reorderable items — low-stock products have no linked vendor.");
      } else {
        toast.success(
          `Created ${created} purchase order(s) for ${Object.keys(groups).length} vendor(s).`
        );
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      toast.error("Failed to create purchase orders: " + (error?.message || "unknown error"));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            Reorder Suggestions
          </DialogTitle>
        </DialogHeader>

        {lowStockItems.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-green-300 mx-auto mb-4" />
            <p className="text-slate-700 font-medium">All stock levels are healthy!</p>
            <p className="text-sm text-slate-500 mt-1">
              No products need reordering right now.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  {lowStockItems.length} product(s) at or below reorder level
                </p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Estimated total cost:{" "}
                  {formatCurrency(
                    totalEstimatedCost,
                    company?.currency || "NGN",
                    company?.show_currency_symbol !== false
                  )}
                </p>
              </div>
              {noVendor.length > 0 && (
                <Badge className="bg-amber-100 text-amber-700 text-xs">
                  {noVendor.length} without vendor
                </Badge>
              )}
            </div>

            {Object.entries(groups).map(([vendorId, group]) => {
              const groupTotal = group.items.reduce(
                (s, it) => s + it.suggestedQty * it.unitCost,
                0
              );
              return (
                <div key={vendorId} className="border rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{group.vendor.name}</p>
                      <p className="text-xs text-slate-500">
                        {group.items.length} item(s) ·{" "}
                        {formatCurrency(
                          groupTotal,
                          company?.currency || "NGN",
                          company?.show_currency_symbol !== false
                        )}
                      </p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 text-xs">PO Draft</Badge>
                  </div>
                  <div className="divide-y">
                    {group.items.map((item) => (
                      <div
                        key={item.product.id}
                        className="px-4 py-2 flex items-center justify-between gap-2 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900 truncate">
                            {item.product.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            Stock: {item.currentStock} · Reorder at: {item.reorderLevel}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-blue-600">
                            Qty: {item.suggestedQty}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatCurrency(
                              item.suggestedQty * item.unitCost,
                              company?.currency || "NGN",
                              company?.show_currency_symbol !== false
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {noVendor.length > 0 && (
              <div className="border border-amber-200 rounded-lg overflow-hidden">
                <div className="bg-amber-50 px-4 py-2">
                  <p className="text-sm font-medium text-amber-800">
                    No vendor linked ({noVendor.length} item(s))
                  </p>
                </div>
                <div className="divide-y">
                  {noVendor.map((item) => (
                    <div
                      key={item.product.id}
                      className="px-4 py-2 flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-700">{item.product.name}</span>
                      <span className="text-amber-600 text-xs">
                        Assign a vendor to reorder
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {lowStockItems.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateAll}
              disabled={isCreating || Object.keys(groups).length === 0}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Truck className="w-4 h-4" />
              )}
              Generate {Object.keys(groups).length} Purchase Order(s)
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}