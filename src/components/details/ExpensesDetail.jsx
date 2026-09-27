import React, { useMemo } from "react";
import { formatCurrency } from "@/utils";
import { format } from "date-fns";
import { Receipt, PieChart } from "lucide-react";

/** Full expense records behind an expenses card. */
export default function ExpensesDetail({ expenses = [], currency = "NGN", showSymbol = true, periodLabel = "" }) {
  const stats = useMemo(() => {
    const byCategory = {};
    let total = 0;
    expenses.forEach((e) => {
      const amount = e.amount || 0;
      total += amount;
      const key = e.category || "other";
      if (!byCategory[key]) byCategory[key] = { category: key, count: 0, total: 0 };
      byCategory[key].count += 1;
      byCategory[key].total += amount;
    });
    return {
      total,
      count: expenses.length,
      avg: expenses.length > 0 ? total / expenses.length : 0,
      largest: expenses.reduce((max, e) => Math.max(max, e.amount || 0), 0),
      categories: Object.values(byCategory).sort((a, b) => b.total - a.total),
      rows: [...expenses].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    };
  }, [expenses]);

  if (expenses.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No expense records behind this card{periodLabel ? ` for ${periodLabel}` : ""}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Total Expenses</p>
          <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5">
            {formatCurrency(stats.total, currency, showSymbol)}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Records</p>
          <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5">{stats.count}</p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Average</p>
          <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5">
            {formatCurrency(stats.avg, currency, showSymbol)}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Largest</p>
          <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5">
            {formatCurrency(stats.largest, currency, showSymbol)}
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <PieChart className="w-4 h-4 text-slate-500" />
          <h4 className="text-sm font-semibold text-slate-800">By Category</h4>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {stats.categories.map((c) => (
                <tr key={c.category}>
                  <td className="p-2 text-slate-800 capitalize">{c.category}</td>
                  <td className="p-2 text-right text-slate-600">{c.count} record(s)</td>
                  <td className="p-2 text-right font-medium text-slate-900">
                    {formatCurrency(c.total, currency, showSymbol)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Receipt className="w-4 h-4 text-slate-500" />
          <h4 className="text-sm font-semibold text-slate-800">All Expenses</h4>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-semibold text-slate-600">Date</th>
                  <th className="text-left p-2 font-semibold text-slate-600">Category</th>
                  <th className="text-left p-2 font-semibold text-slate-600">Description</th>
                  <th className="text-left p-2 font-semibold text-slate-600">Vendor</th>
                  <th className="text-right p-2 font-semibold text-slate-600">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.rows.map((e) => (
                  <tr key={e.id}>
                    <td className="p-2 text-slate-600 whitespace-nowrap">
                      {e.date ? format(new Date(e.date), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="p-2 text-slate-800 capitalize">{e.category || "other"}</td>
                    <td className="p-2 text-slate-600">{e.description || "—"}</td>
                    <td className="p-2 text-slate-600">{e.vendor || "—"}</td>
                    <td className="p-2 text-right font-medium text-slate-900">
                      {formatCurrency(e.amount || 0, currency, showSymbol)}
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