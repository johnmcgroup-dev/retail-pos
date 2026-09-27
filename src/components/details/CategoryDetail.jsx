import React, { useMemo } from "react";
import { formatCurrency } from "@/utils";
import { Layers } from "lucide-react";

/** Products grouped by category with their stock value — the data behind a category card. */
export default function CategoryDetail({ inventory = [], products = [], currency = "NGN", showSymbol = true }) {
  const stats = useMemo(() => {
    const map = {};
    inventory.forEach((inv) => {
      const product = products.find((p) => p.id === inv.product_id);
      if (!product) return;
      const category = product.category || "Uncategorized";
      if (!map[category]) map[category] = { category, value: 0, quantity: 0, rows: [] };
      const qty = inv.quantity || 0;
      const value = qty * (product.cost_price || 0);
      map[category].value += value;
      map[category].quantity += qty;
      map[category].rows.push({
        id: inv.id,
        name: product.name,
        sku: product.sku,
        quantity: qty,
        cost: product.cost_price || 0,
        value,
      });
    });
    const groups = Object.values(map).sort((a, b) => b.value - a.value);
    groups.forEach((g) => g.rows.sort((a, b) => b.value - a.value));
    return { groups, total: groups.reduce((sum, g) => sum + g.value, 0) };
  }, [inventory, products]);

  if (stats.groups.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        <Layers className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No categorised stock behind this card.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-2 font-semibold text-slate-600">Category</th>
              <th className="text-right p-2 font-semibold text-slate-600">Products</th>
              <th className="text-right p-2 font-semibold text-slate-600">Quantity</th>
              <th className="text-right p-2 font-semibold text-slate-600">Stock Value</th>
              <th className="text-right p-2 font-semibold text-slate-600">% of Value</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {stats.groups.map((g) => (
              <tr key={g.category}>
                <td className="p-2 text-slate-800">{g.category}</td>
                <td className="p-2 text-right text-slate-600">{g.rows.length}</td>
                <td className="p-2 text-right text-slate-600">{g.quantity}</td>
                <td className="p-2 text-right font-medium text-slate-900">
                  {formatCurrency(g.value, currency, showSymbol)}
                </td>
                <td className="p-2 text-right text-slate-600">
                  {stats.total > 0 ? ((g.value / stats.total) * 100).toFixed(1) : "0"}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {stats.groups.map((g) => (
        <div key={g.category}>
          <h4 className="text-sm font-semibold text-slate-800 mb-2">
            {g.category} — products
          </h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-2 font-semibold text-slate-600">Product</th>
                  <th className="text-left p-2 font-semibold text-slate-600">SKU</th>
                  <th className="text-right p-2 font-semibold text-slate-600">Quantity</th>
                  <th className="text-right p-2 font-semibold text-slate-600">Cost Price</th>
                  <th className="text-right p-2 font-semibold text-slate-600">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {g.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="p-2 text-slate-800">{r.name}</td>
                    <td className="p-2 text-slate-600">{r.sku || "—"}</td>
                    <td className="p-2 text-right text-slate-600">{r.quantity}</td>
                    <td className="p-2 text-right text-slate-600">
                      {formatCurrency(r.cost, currency, showSymbol)}
                    </td>
                    <td className="p-2 text-right font-medium text-slate-900">
                      {formatCurrency(r.value, currency, showSymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}