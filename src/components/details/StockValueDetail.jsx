import React, { useMemo } from "react";
import { formatCurrency } from "@/utils";
import { DollarSign, Boxes, Package, Warehouse as WarehouseIcon, RotateCw } from "lucide-react";

function Stat({ label, value, hint, icon: Icon, highlight }) {
  return (
    <div className={`p-3 rounded-lg border ${highlight ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5">{value}</p>
          {hint && <p className="text-[10px] text-slate-500 mt-0.5">{hint}</p>}
        </div>
        {Icon && <Icon className="w-5 h-5 text-slate-400 flex-shrink-0" />}
      </div>
    </div>
  );
}

/**
 * Full stock valuation data behind an inventory value / quantity / SKU / warehouse card.
 * Read-only: every figure is derived from the inventory + product records passed in.
 */
export default function StockValueDetail({
  inventory = [],
  products = [],
  warehouses = [],
  currency = "NGN",
  showSymbol = true,
  focus = "value",
  turnover = null,
}) {
  const stats = useMemo(() => {
    const byProduct = {};
    const byCategory = {};
    const byLocation = {};
    let totalValue = 0;
    let retailValue = 0;
    let totalQty = 0;

    inventory.forEach((inv) => {
      const product = products.find((p) => p.id === inv.product_id);
      if (!product) return;
      const qty = inv.quantity || 0;
      const cost = product.cost_price || 0;
      const retail = product.selling_price || 0;
      const value = qty * cost;

      totalValue += value;
      retailValue += qty * retail;
      totalQty += qty;

      if (!byProduct[product.id]) {
        byProduct[product.id] = {
          id: product.id,
          name: product.name,
          sku: product.sku,
          category: product.category,
          unit: product.unit,
          qty: 0,
          cost,
          retail,
          value: 0,
          retailValue: 0,
        };
      }
      byProduct[product.id].qty += qty;
      byProduct[product.id].value += value;
      byProduct[product.id].retailValue += qty * retail;

      const cat = product.category || "Uncategorized";
      if (!byCategory[cat]) byCategory[cat] = { category: cat, qty: 0, value: 0, skus: new Set() };
      byCategory[cat].qty += qty;
      byCategory[cat].value += value;
      byCategory[cat].skus.add(product.id);

      const locId = inv.warehouse_id || "unassigned";
      const locName = locId === "unassigned"
        ? "Main / Unassigned"
        : (warehouses.find((w) => w.id === locId)?.name || "Unknown location");
      if (!byLocation[locId]) byLocation[locId] = { id: locId, name: locName, qty: 0, value: 0, skus: new Set() };
      byLocation[locId].qty += qty;
      byLocation[locId].value += value;
      byLocation[locId].skus.add(product.id);
    });

    return {
      totalValue,
      retailValue,
      totalQty,
      rows: Object.values(byProduct).sort((a, b) => b.value - a.value),
      categories: Object.values(byCategory)
        .map((c) => ({ ...c, skus: c.skus.size }))
        .sort((a, b) => b.value - a.value),
      locations: Object.values(byLocation)
        .map((l) => ({ ...l, skus: l.skus.size }))
        .sort((a, b) => b.value - a.value),
    };
  }, [inventory, products, warehouses]);

  if (inventory.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        <Boxes className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No inventory records behind this card.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat
          label="Stock Value (cost)"
          value={formatCurrency(stats.totalValue, currency, showSymbol)}
          hint="At product cost price"
          icon={DollarSign}
          highlight={focus === "value"}
        />
        <Stat
          label="Stock Value (retail)"
          value={formatCurrency(stats.retailValue, currency, showSymbol)}
          hint="At selling price"
          icon={Package}
          highlight={focus === "retail"}
        />
        <Stat
          label="Total Quantity"
          value={stats.totalQty.toLocaleString()}
          hint="Units in stock"
          icon={Boxes}
          highlight={focus === "quantity"}
        />
        <Stat
          label="Unique SKUs"
          value={stats.rows.length}
          hint={`${stats.locations.length} location(s)`}
          icon={WarehouseIcon}
          highlight={focus === "skus" || focus === "locations"}
        />
      </div>

      {turnover && (
        <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <RotateCw className="w-4 h-4 text-purple-600" />
            <h4 className="text-sm font-semibold text-slate-800">Inventory Turnover</h4>
          </div>
          <p className="text-sm text-slate-700">
            {turnover.rate}x turnover — about {turnover.days} days of stock on hand.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Cost of goods sold {formatCurrency(turnover.cogs || 0, currency, showSymbol)} ÷ average stock value{" "}
            {formatCurrency(turnover.value || 0, currency, showSymbol)}
          </p>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-slate-800 mb-2">Stock by Product</h4>
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-semibold text-slate-600">Product</th>
                  <th className="text-left p-2 font-semibold text-slate-600">SKU</th>
                  <th className="text-right p-2 font-semibold text-slate-600">Qty</th>
                  <th className="text-right p-2 font-semibold text-slate-600">Cost</th>
                  <th className="text-right p-2 font-semibold text-slate-600">Value</th>
                  <th className="text-right p-2 font-semibold text-slate-600">% of Value</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.rows.map((p) => (
                  <tr key={p.id}>
                    <td className="p-2 text-slate-800">{p.name}</td>
                    <td className="p-2 text-slate-600">{p.sku || "—"}</td>
                    <td className="p-2 text-right text-slate-600">
                      {p.qty} {p.unit || ""}
                    </td>
                    <td className="p-2 text-right text-slate-600">
                      {formatCurrency(p.cost, currency, showSymbol)}
                    </td>
                    <td className="p-2 text-right font-medium text-slate-900">
                      {formatCurrency(p.value, currency, showSymbol)}
                    </td>
                    <td className="p-2 text-right text-slate-600">
                      {stats.totalValue > 0 ? ((p.value / stats.totalValue) * 100).toFixed(1) : "0"}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-800 mb-2">By Category</h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {stats.categories.map((c) => (
                  <tr key={c.category}>
                    <td className="p-2 text-slate-800">{c.category}</td>
                    <td className="p-2 text-right text-slate-600">{c.skus} SKU(s)</td>
                    <td className="p-2 text-right text-slate-600">{c.qty} units</td>
                    <td className="p-2 text-right font-medium text-slate-900">
                      {formatCurrency(c.value, currency, showSymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-800 mb-2">By Location</h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {stats.locations.map((l) => (
                  <tr key={l.id}>
                    <td className="p-2 text-slate-800">{l.name}</td>
                    <td className="p-2 text-right text-slate-600">{l.skus} SKU(s)</td>
                    <td className="p-2 text-right text-slate-600">{l.qty} units</td>
                    <td className="p-2 text-right font-medium text-slate-900">
                      {formatCurrency(l.value, currency, showSymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}