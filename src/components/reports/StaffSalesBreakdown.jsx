import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils";

export default function StaffSalesBreakdown({ sales, company }) {
  const currency = company?.currency || "NGN";
  const showSymbol = company?.show_currency_symbol !== false;
  const fmt = (n) => formatCurrency(n || 0, currency, showSymbol);

  const byStaff = useMemo(() => {
    const map = {};
    sales.forEach((s) => {
      const key = s.cashier?.split("@")[0] || s.cashier || "Walk-in / Unknown";
      if (!map[key]) map[key] = { name: key, revenue: 0, transactions: 0, items: 0 };
      map[key].revenue += s.total_amount || 0;
      map[key].transactions += 1;
      map[key].items += (s.items || []).length;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  const total = byStaff.reduce((sum, s) => sum + s.revenue, 0);

  if (!byStaff.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-slate-400">No sales data for this period.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sales by Staff Member</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={Math.max(260, byStaff.length * 60)}>
            <BarChart data={byStaff} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => fmt(v)} />
              <YAxis dataKey="name" type="category" width={130} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ backgroundColor: "white", border: "1px solid #e2e8f0" }} />
              <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staff Performance Detail</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-3 font-semibold text-slate-700">Rank</th>
                <th className="text-left p-3 font-semibold text-slate-700">Staff</th>
                <th className="text-right p-3 font-semibold text-slate-700">Transactions</th>
                <th className="text-right p-3 font-semibold text-slate-700">Items Sold</th>
                <th className="text-right p-3 font-semibold text-slate-700">Total Sales</th>
                <th className="text-right p-3 font-semibold text-slate-700">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {byStaff.map((s, i) => (
                <tr key={s.name} className="hover:bg-slate-50">
                  <td className="p-3"><Badge variant={i < 3 ? "default" : "secondary"}>#{i + 1}</Badge></td>
                  <td className="p-3 font-medium text-slate-900 capitalize">{s.name}</td>
                  <td className="p-3 text-right text-slate-700">{s.transactions}</td>
                  <td className="p-3 text-right text-slate-700">{s.items}</td>
                  <td className="p-3 text-right font-bold text-green-600">{fmt(s.revenue)}</td>
                  <td className="p-3 text-right text-slate-500">{total ? ((s.revenue / total) * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 font-semibold">
              <tr>
                <td className="p-3" colSpan={4}>Total</td>
                <td className="p-3 text-right text-green-700">{fmt(total)}</td>
                <td className="p-3"></td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}