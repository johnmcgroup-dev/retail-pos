import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Package, Warehouse as WarehouseIcon, DollarSign, Boxes, Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils";

const CHART_COLOR = "#2563eb";
const QTY_COLOR = "#10b981";

export default function InventoryDashboard() {
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me(), staleTime: 5 * 60 * 1000 });
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => base44.entities.Company.list() });
  const company = (me && companies.find(c => c.id === (me.company_id || me.tenant_id))) || companies[0];
  const currency = company?.currency || "NGN";

  // RLS scopes all of these to the currently logged-in tenant automatically
  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.Inventory.list(),
  });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => base44.entities.Product.list() });
  const { data: warehouses = [] } = useQuery({ queryKey: ["warehouses"], queryFn: () => base44.entities.Warehouse.list() });

  const productMap = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products]);
  const warehouseMap = useMemo(() => Object.fromEntries(warehouses.map(w => [w.id, w])), [warehouses]);

  const byWarehouse = useMemo(() => {
    const map = {};
    inventory.forEach(inv => {
      const wid = inv.warehouse_id || "unassigned";
      if (!map[wid]) {
        map[wid] = {
          id: wid,
          name: wid === "unassigned" ? "Main / Unassigned" : (warehouseMap[wid]?.name || "Unknown location"),
          value: 0,
          quantity: 0,
          skus: new Set(),
        };
      }
      const product = productMap[inv.product_id];
      const cost = product?.cost_price || 0;
      map[wid].value += (inv.quantity || 0) * cost;
      map[wid].quantity += inv.quantity || 0;
      if (product) map[wid].skus.add(product.id);
    });
    return Object.values(map)
      .map(w => ({ ...w, skus: w.skus.size }))
      .sort((a, b) => b.value - a.value);
  }, [inventory, productMap, warehouseMap]);

  const totalValue = byWarehouse.reduce((s, w) => s + w.value, 0);
  const totalQty = byWarehouse.reduce((s, w) => s + w.quantity, 0);
  const totalSkus = byWarehouse.reduce((s, w) => s + w.skus, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading inventory…
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <WarehouseIcon className="w-7 h-7 text-blue-600" />
          Inventory Dashboard
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Stock value and quantity across all warehouse locations for{" "}
          <span className="font-medium text-slate-700">{company?.name || "your tenant"}</span>.
        </p>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">Total Stock Value</p>
                <p className="text-xl md:text-2xl font-bold text-slate-900">{formatCurrency(totalValue, currency)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">At cost price</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">Total Quantity</p>
                <p className="text-xl md:text-2xl font-bold text-slate-900">{totalQty.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Units in stock</p>
              </div>
              <Boxes className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">Warehouses</p>
                <p className="text-xl md:text-2xl font-bold text-slate-900">{byWarehouse.length}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Locations</p>
              </div>
              <WarehouseIcon className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">Unique SKUs</p>
                <p className="text-xl md:text-2xl font-bold text-slate-900">{totalSkus}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Products tracked</p>
              </div>
              <Package className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Stock Value by Warehouse</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={byWarehouse} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis tickFormatter={(v) => formatCurrency(v, currency).replace(/\.\d+/, "")} tick={{ fontSize: 11 }} width={70} />
                <Tooltip formatter={(v) => formatCurrency(v, currency)} contentStyle={{ backgroundColor: "white", border: "1px solid #e2e8f0" }} />
                <Bar dataKey="value" fill={CHART_COLOR} name="Stock Value" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock Quantity by Warehouse</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={byWarehouse} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} width={40} />
                <Tooltip formatter={(v) => `${v} units`} contentStyle={{ backgroundColor: "white", border: "1px solid #e2e8f0" }} />
                <Bar dataKey="quantity" fill={QTY_COLOR} name="Quantity" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown table */}
      <Card>
        <CardHeader>
          <CardTitle>Warehouse Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="text-left p-3">Warehouse</th>
                  <th className="text-right p-3">Quantity</th>
                  <th className="text-right p-3">SKUs</th>
                  <th className="text-right p-3">Stock Value</th>
                  <th className="text-right p-3">% of Value</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {byWarehouse.map(w => (
                  <tr key={w.id} className="hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-900">{w.name}</td>
                    <td className="p-3 text-right text-slate-700">{w.quantity.toLocaleString()}</td>
                    <td className="p-3 text-right text-slate-700">{w.skus}</td>
                    <td className="p-3 text-right font-semibold text-blue-600">{formatCurrency(w.value, currency)}</td>
                    <td className="p-3 text-right">
                      <Badge variant="outline">
                        {totalValue > 0 ? ((w.value / totalValue) * 100).toFixed(1) : "0"}%
                      </Badge>
                    </td>
                  </tr>
                ))}
                {byWarehouse.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No inventory records found for this tenant.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 font-semibold">
                <tr>
                  <td className="p-3 text-slate-900">Total</td>
                  <td className="p-3 text-right text-slate-900">{totalQty.toLocaleString()}</td>
                  <td className="p-3 text-right text-slate-900">{totalSkus}</td>
                  <td className="p-3 text-right text-blue-700">{formatCurrency(totalValue, currency)}</td>
                  <td className="p-3 text-right text-slate-500">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}