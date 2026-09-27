import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils";
import { format } from "date-fns";
import { Users } from "lucide-react";

/** Full per-staff sales breakdown behind a staff sales card. */
export default function StaffSalesDetail({ sales = [], currency = "NGN", showSymbol = true, periodLabel = "" }) {
  const stats = useMemo(() => {
    const map = {};
    sales.forEach((s) => {
      const name = s.cashier ? s.cashier.split("@")[0] : "Unknown";
      if (!map[name]) map[name] = { name, transactions: 0, revenue: 0, rows: [] };
      map[name].transactions += 1;
      map[name].revenue += s.total_amount || 0;
      map[name].rows.push(s);
    });
    const staff = Object.values(map).sort((a, b) => b.revenue - a.revenue);
    staff.forEach((s) => {
      s.rows.sort((a, b) => new Date(b.sale_date || 0) - new Date(a.sale_date || 0));
      s.avg = s.transactions > 0 ? s.revenue / s.transactions : 0;
    });
    return { staff, total: staff.reduce((sum, s) => sum + s.revenue, 0) };
  }, [sales]);

  if (sales.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No staff sales behind this card{periodLabel ? ` for ${periodLabel}` : ""}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-[10px] uppercase tracking-wide text-slate-500">
          Total Sales {periodLabel ? `— ${periodLabel}` : ""}
        </p>
        <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5">
          {formatCurrency(stats.total, currency, showSymbol)} across {stats.staff.length} staff member(s)
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-2 font-semibold text-slate-600">Staff</th>
              <th className="text-right p-2 font-semibold text-slate-600">Transactions</th>
              <th className="text-right p-2 font-semibold text-slate-600">Total Sales</th>
              <th className="text-right p-2 font-semibold text-slate-600">Average Sale</th>
              <th className="text-right p-2 font-semibold text-slate-600">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {stats.staff.map((s) => (
              <tr key={s.name}>
                <td className="p-2 text-slate-800 capitalize">{s.name}</td>
                <td className="p-2 text-right text-slate-600">{s.transactions}</td>
                <td className="p-2 text-right font-medium text-slate-900">
                  {formatCurrency(s.revenue, currency, showSymbol)}
                </td>
                <td className="p-2 text-right text-slate-600">
                  {formatCurrency(s.avg, currency, showSymbol)}
                </td>
                <td className="p-2 text-right text-slate-600">
                  {stats.total > 0 ? ((s.revenue / stats.total) * 100).toFixed(1) : "0"}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {stats.staff.map((s) => (
        <div key={s.name}>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-semibold text-slate-800 capitalize">{s.name}'s transactions</h4>
            <Badge variant="secondary" className="text-[10px]">{s.transactions}</Badge>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-600">Invoice</th>
                    <th className="text-left p-2 font-semibold text-slate-600">Date</th>
                    <th className="text-left p-2 font-semibold text-slate-600">Customer</th>
                    <th className="text-right p-2 font-semibold text-slate-600">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {s.rows.map((r) => (
                    <tr key={r.id}>
                      <td className="p-2 text-slate-800">{r.invoice_number || "—"}</td>
                      <td className="p-2 text-slate-600 whitespace-nowrap">
                        {r.sale_date ? format(new Date(r.sale_date), "MMM d, yyyy h:mm a") : "—"}
                      </td>
                      <td className="p-2 text-slate-600">{r.customer_name || "Walk-in"}</td>
                      <td className="p-2 text-right font-medium text-slate-900">
                        {formatCurrency(r.total_amount || 0, currency, showSymbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}