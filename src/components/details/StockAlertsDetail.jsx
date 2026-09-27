import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { format } from "date-fns";

/**
 * Full low-stock and/or expiring-stock list with quantities and thresholds.
 * `items` shape: { id, name, quantity, reorder_level, unit, sku, category }
 * `expiring` shape: { id, name, quantity, expiration_date, days_left }
 */
export default function StockAlertsDetail({ items = [], expiring = [], focus = "low" }) {
  const hasAnything = items.length > 0 || expiring.length > 0;

  if (!hasAnything) {
    return (
      <div className="text-center py-10 text-slate-400">
        <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Nothing needs attention right now.</p>
      </div>
    );
  }

  const suggested = (it) => {
    const reorder = it.reorder_level ?? 10;
    return Math.max(reorder * 2 - (it.quantity || 0), reorder);
  };

  return (
    <div className="space-y-5">
      {items.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h4 className="text-sm font-semibold text-slate-800">Low / Out of Stock</h4>
            <Badge variant="destructive" className="text-[10px]">{items.length}</Badge>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-600">Product</th>
                    <th className="text-left p-2 font-semibold text-slate-600">SKU</th>
                    <th className="text-right p-2 font-semibold text-slate-600">In Stock</th>
                    <th className="text-right p-2 font-semibold text-slate-600">Reorder Level</th>
                    <th className="text-right p-2 font-semibold text-slate-600">Suggested Order</th>
                    <th className="text-left p-2 font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((it) => {
                    const out = (it.quantity || 0) <= 0;
                    return (
                      <tr key={it.id}>
                        <td className="p-2 text-slate-800">{it.name}</td>
                        <td className="p-2 text-slate-600">{it.sku || "—"}</td>
                        <td className={`p-2 text-right font-medium ${out ? "text-red-600" : "text-slate-900"}`}>
                          {it.quantity ?? 0} {it.unit || ""}
                        </td>
                        <td className="p-2 text-right text-slate-600">{it.reorder_level ?? 10}</td>
                        <td className="p-2 text-right text-slate-600">{suggested(it)}</td>
                        <td className="p-2">
                          <Badge variant={out ? "destructive" : "secondary"} className="text-[10px]">
                            {out ? "Out of stock" : "Low stock"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {expiring.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="w-4 h-4 text-yellow-600" />
            <h4 className="text-sm font-semibold text-slate-800">Expiring Soon</h4>
            <Badge className="text-[10px] bg-yellow-100 text-yellow-800">{expiring.length}</Badge>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-600">Product</th>
                    <th className="text-right p-2 font-semibold text-slate-600">Quantity</th>
                    <th className="text-left p-2 font-semibold text-slate-600">Expires</th>
                    <th className="text-right p-2 font-semibold text-slate-600">Days Left</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {expiring.map((it) => (
                    <tr key={it.id}>
                      <td className="p-2 text-slate-800">{it.name}</td>
                      <td className="p-2 text-right text-slate-600">{it.quantity ?? 0}</td>
                      <td className="p-2 text-slate-600 whitespace-nowrap">
                        {it.expiration_date ? format(new Date(it.expiration_date), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="p-2 text-right font-medium text-yellow-700">
                        {it.days_left != null ? `${it.days_left} day(s)` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}