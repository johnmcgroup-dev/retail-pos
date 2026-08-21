import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { TrendingDown, Calendar } from "lucide-react";

const CATEGORY_LABELS = {
  rent: "Rent", utilities: "Utilities", salaries: "Salaries", marketing: "Marketing",
  maintenance: "Maintenance", supplies: "Supplies", transport: "Transport",
  insurance: "Insurance", taxes: "Taxes", other: "Other",
};

const CATEGORY_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b", "#0ea5e9"];

export default function MonthlyExpenseReport({ expenses = [] }) {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

  // Build month options from existing expenses + current month
  const monthOptions = useMemo(() => {
    const set = new Set([month]);
    expenses.forEach((e) => {
      if (e.date) set.add(e.date.slice(0, 7));
    });
    return [...set].sort().reverse();
  }, [expenses, month]);

  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.date && e.date.slice(0, 7) === month),
    [expenses, month]
  );

  const total = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  const byCategory = useMemo(() => {
    const map = {};
    monthExpenses.forEach((e) => {
      const cat = e.category || "other";
      if (!map[cat]) map[cat] = { category: cat, total: 0, count: 0 };
      map[cat].total += e.amount || 0;
      map[cat].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [monthExpenses]);

  const monthLabel = new Date(month + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600" /> Monthly Expense Report</span>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m} value={m}>
                  {new Date(m + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
          <div>
            <p className="text-sm text-red-700">Total for {monthLabel}</p>
            <p className="text-2xl font-bold text-red-700">{formatCurrency(total)}</p>
          </div>
          <div className="text-right text-sm text-slate-600">
            <p>{monthExpenses.length} expense{monthExpenses.length !== 1 ? "s" : ""}</p>
            <p>{byCategory.length} categor{byCategory.length !== 1 ? "ies" : "y"}</p>
          </div>
        </div>

        {byCategory.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <TrendingDown className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No expenses recorded for {monthLabel}.</p>
          </div>
        ) : (
          <>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory.map((c) => ({ name: CATEGORY_LABELS[c.category] || c.category, amount: c.total }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v, undefined, false)} width={70} />
                  <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {byCategory.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {byCategory.map((c, i) => {
                const pct = total > 0 ? (c.total / total) * 100 : 0;
                return (
                  <div key={c.category} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-700">{CATEGORY_LABELS[c.category] || c.category}</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(c.total)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>{c.count} entr{c.count !== 1 ? "ies" : "y"} · {pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}