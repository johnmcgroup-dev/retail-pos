import React, { useMemo } from "react";
import { formatCurrency } from "@/utils";
import { format } from "date-fns";
import { TrendingUp, TrendingDown } from "lucide-react";

/** Revenue vs expenses vs net profit — the data behind a profit / margin card. */
export default function ProfitDetail({ sales = [], expenses = [], products = [], currency = "NGN", showSymbol = true, periodLabel = "" }) {
  const stats = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    sales.forEach((s) => {
      revenue += s.total_amount || 0;
      (s.items || []).forEach((it) => {
        const unitCost = products.find((p) => p.id === it.product_id)?.cost_price || 0;
        cost += unitCost * (it.quantity || 0);
      });
    });
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const grossProfit = revenue - cost;
    const netProfit = grossProfit - totalExpenses;
    return {
      revenue,
      cost,
      grossProfit,
      totalExpenses,
      netProfit,
      grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
      netMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
      expenseRows: [...expenses].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    };
  }, [sales, expenses, products]);

  if (sales.length === 0 && expenses.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No revenue or expense records behind this card{periodLabel ? ` for ${periodLabel}` : ""}.</p>
      </div>
    );
  }

  const row = (label, value, strong, negative) => (
    <div className={`flex items-center justify-between p-2.5 rounded-lg ${strong ? "bg-blue-50 border border-blue-200" : "bg-slate-50"}`}>
      <span className={`text-sm ${strong ? "font-semibold text-slate-900" : "text-slate-600"}`}>{label}</span>
      <span className={`text-sm font-bold ${negative ? "text-red-600" : "text-slate-900"}`}>
        {formatCurrency(value, currency, showSymbol)}
      </span>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="p-3 rounded-lg bg-green-50 border border-green-200">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Revenue</p>
          <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5">
            {formatCurrency(stats.revenue, currency, showSymbol)}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Cost of Goods</p>
          <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5">
            {formatCurrency(stats.cost, currency, showSymbol)}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Expenses</p>
          <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5">
            {formatCurrency(stats.totalExpenses, currency, showSymbol)}
          </p>
        </div>
        <div className={`p-3 rounded-lg border ${stats.netProfit >= 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"}`}>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Net Profit</p>
          <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5">
            {formatCurrency(stats.netProfit, currency, showSymbol)}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {row("Total Revenue", stats.revenue)}
        {row("Less: Cost of Goods Sold", -stats.cost)}
        {row("Gross Profit", stats.grossProfit, false)}
        {row(`Gross Margin: ${stats.grossMargin.toFixed(1)}%`, stats.grossProfit)}
        {row("Less: Operating Expenses", -stats.totalExpenses)}
        {row(`Net Profit — Net Margin ${stats.netMargin.toFixed(1)}%`, stats.netProfit, true, stats.netProfit < 0)}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown className="w-4 h-4 text-slate-500" />
          <h4 className="text-sm font-semibold text-slate-800">Expense Records ({stats.expenseRows.length})</h4>
        </div>
        {stats.expenseRows.length === 0 ? (
          <p className="text-sm text-slate-400 py-3">No expenses recorded in this period.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-600">Date</th>
                    <th className="text-left p-2 font-semibold text-slate-600">Category</th>
                    <th className="text-left p-2 font-semibold text-slate-600">Description</th>
                    <th className="text-right p-2 font-semibold text-slate-600">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.expenseRows.map((e) => (
                    <tr key={e.id}>
                      <td className="p-2 text-slate-600 whitespace-nowrap">
                        {e.date ? format(new Date(e.date), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="p-2 text-slate-800 capitalize">{e.category || "other"}</td>
                      <td className="p-2 text-slate-600">{e.description || "—"}</td>
                      <td className="p-2 text-right font-medium text-slate-900">
                        {formatCurrency(e.amount || 0, currency, showSymbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}