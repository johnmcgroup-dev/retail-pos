import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

/** In-stock / low-stock / out-of-stock product groups behind a stock status card. */
export default function StockStatusDetail({ inventory = [], products = [] }) {
  const groups = useMemo(() => {
    const inStock = [];
    const low = [];
    const out = [];

    inventory.forEach((inv) => {
      const product = products.find((p) => p.id === inv.product_id);
      if (!product) return;
      const reorder = product.reorder_level ?? 10;
      const row = {
        id: inv.id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        unit: product.unit,
        quantity: inv.quantity || 0,
        reorder,
      };
      if (row.quantity <= 0) out.push(row);
      else if (row.quantity <= reorder) low.push(row);
      else inStock.push(row);
    });

    return { inStock, low, out };
  }, [inventory, products]);

  const table = (rows, emptyText) => (
    <div className="border rounded-lg overflow-hidden">
      <div className="max-h-64 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="text-left p-2 font-semibold text-slate-600">Product</th>
              <th className="text-left p-2 font-semibold text-slate-600">SKU</th>
              <th className="text-left p-2 font-semibold text-slate-600">Category</th>
              <th className="text-right p-2 font-semibold text-slate-600">Quantity</th>
              <th className="text-right p-2 font-semibold text-slate-600">Reorder Level</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="p-2 text-slate-800">{r.name}</td>
                <td className="p-2 text-slate-600">{r.sku || "—"}</td>
                <td className="p-2 text-slate-600">{r.category || "—"}</td>
                <td className="p-2 text-right font-medium text-slate-900">
                  {r.quantity} {r.unit || ""}
                </td>
                <td className="p-2 text-right text-slate-600">{r.reorder}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-slate-400">{emptyText}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-lg bg-green-50 border border-green-200">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">In Stock</p>
          <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5">{groups.inStock.length}</p>
        </div>
        <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Low Stock</p>
          <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5">{groups.low.length}</p>
        </div>
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Out of Stock</p>
          <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5">{groups.out.length}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <XCircle className="w-4 h-4 text-red-500" />
          <h4 className="text-sm font-semibold text-slate-800">Out of Stock</h4>
          <Badge variant="destructive" className="text-[10px]">{groups.out.length}</Badge>
        </div>
        {table(groups.out, "No products are out of stock.")}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <h4 className="text-sm font-semibold text-slate-800">Low Stock</h4>
          <Badge className="text-[10px] bg-yellow-100 text-yellow-800">{groups.low.length}</Badge>
        </div>
        {table(groups.low, "No products are below their reorder level.")}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <h4 className="text-sm font-semibold text-slate-800">In Stock</h4>
          <Badge variant="secondary" className="text-[10px]">{groups.inStock.length}</Badge>
        </div>
        {table(groups.inStock, "No products above their reorder level.")}
      </div>
    </div>
  );
}