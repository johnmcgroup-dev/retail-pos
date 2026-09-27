import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils";
import { Users } from "lucide-react";

/** Full customer records behind a customers card. */
export default function CustomersDetail({ customers = [], currency = "NGN", showSymbol = true }) {
  const stats = useMemo(() => {
    const totalSpend = customers.reduce((sum, c) => sum + (c.total_purchases || 0), 0);
    return {
      totalSpend,
      avgSpend: customers.length > 0 ? totalSpend / customers.length : 0,
      outstanding: customers.reduce((sum, c) => sum + (c.outstanding_balance || 0), 0),
      points: customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0),
      rows: [...customers].sort((a, b) => (b.total_purchases || 0) - (a.total_purchases || 0)),
    };
  }, [customers]);

  if (customers.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No customer records behind this card.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Customers</p>
          <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5">{customers.length}</p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Total Purchases</p>
          <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5">
            {formatCurrency(stats.totalSpend, currency, showSymbol)}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Average Spend</p>
          <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5">
            {formatCurrency(stats.avgSpend, currency, showSymbol)}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Outstanding</p>
          <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5">
            {formatCurrency(stats.outstanding, currency, showSymbol)}
          </p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="text-left p-2 font-semibold text-slate-600">Customer</th>
                <th className="text-left p-2 font-semibold text-slate-600">Phone</th>
                <th className="text-left p-2 font-semibold text-slate-600">Type</th>
                <th className="text-right p-2 font-semibold text-slate-600">Orders</th>
                <th className="text-right p-2 font-semibold text-slate-600">Total Purchases</th>
                <th className="text-right p-2 font-semibold text-slate-600">Balance</th>
                <th className="text-right p-2 font-semibold text-slate-600">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.rows.map((c) => (
                <tr key={c.id}>
                  <td className="p-2 text-slate-800">{c.name || "Unnamed"}</td>
                  <td className="p-2 text-slate-600">{c.phone || "—"}</td>
                  <td className="p-2">
                    <Badge variant="secondary" className="text-[10px] capitalize">{c.customer_type || "retail"}</Badge>
                  </td>
                  <td className="p-2 text-right text-slate-600">{c.total_orders || 0}</td>
                  <td className="p-2 text-right font-medium text-slate-900">
                    {formatCurrency(c.total_purchases || 0, currency, showSymbol)}
                  </td>
                  <td className={`p-2 text-right ${(c.outstanding_balance || 0) > 0 ? "text-red-600 font-medium" : "text-slate-600"}`}>
                    {formatCurrency(c.outstanding_balance || 0, currency, showSymbol)}
                  </td>
                  <td className="p-2 text-right text-slate-600">{c.loyalty_points || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}