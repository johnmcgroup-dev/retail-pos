import React, { useMemo } from "react";
import { formatCurrency } from "@/utils";
import { format, subDays } from "date-fns";
import { TrendingUp } from "lucide-react";

/** Full daily revenue records behind a revenue chart card. */
export default function DailyRevenueDetail({ sales = [], currency = "NGN", showSymbol = true }) {
  const stats = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const key = format(date, "yyyy-MM-dd");
      const daySales = sales.filter((s) => s.sale_date && format(new Date(s.sale_date), "yyyy-MM-dd") === key);
      const revenue = daySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
      days.push({
        key,
        label: format(date, "MMM d, yyyy"),
        transactions: daySales.length,
        revenue,
        avg: daySales.length > 0 ? revenue / daySales.length : 0,
      });
    }
    const total = days.reduce((sum, d) => sum + d.revenue, 0);
    const best = days.reduce((max, d) => (d.revenue > (max?.revenue || 0) ? d : max), null);
    return {
      total,
      days: [...days].reverse(),
      best,
      activeDays: days.filter((d) => d.transactions > 0).length,
    };
  }, [sales]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Revenue (30 days)</p>
          <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5">
            {formatCurrency(stats.total, currency, showSymbol)}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Days with Sales</p>
          <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5">{stats.activeDays}</p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Daily Average</p>
          <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5">
            {formatCurrency(stats.total / 30, currency, showSymbol)}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Best Day</p>
          <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5">
            {stats.best ? formatCurrency(stats.best.revenue, currency, showSymbol) : formatCurrency(0, currency, showSymbol)}
          </p>
          {stats.best && <p className="text-[10px] text-slate-500 mt-0.5">{stats.best.label}</p>}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-slate-500" />
          <h4 className="text-sm font-semibold text-slate-800">Daily Breakdown — Last 30 Days</h4>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-semibold text-slate-600">Date</th>
                  <th className="text-right p-2 font-semibold text-slate-600">Transactions</th>
                  <th className="text-right p-2 font-semibold text-slate-600">Revenue</th>
                  <th className="text-right p-2 font-semibold text-slate-600">Average Sale</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.days.map((d) => (
                  <tr key={d.key}>
                    <td className="p-2 text-slate-800">{d.label}</td>
                    <td className="p-2 text-right text-slate-600">{d.transactions}</td>
                    <td className="p-2 text-right font-medium text-slate-900">
                      {formatCurrency(d.revenue, currency, showSymbol)}
                    </td>
                    <td className="p-2 text-right text-slate-600">
                      {d.transactions > 0 ? formatCurrency(d.avg, currency, showSymbol) : "—"}
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