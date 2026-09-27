import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/components/utils";
import { format, subDays } from "date-fns";
import ClickableCard from "@/components/details/ClickableCard";

export default function RevenueChart({ sales = [], currency = 'NGN', showSymbol = true, onOpenDetail }) {
  const data = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const daySales = sales.filter(s => {
        const sd = new Date(s.sale_date);
        return format(sd, 'yyyy-MM-dd') === dateStr;
      });
      const revenue = daySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
      days.push({
        date: format(date, 'MMM d'),
        revenue: Math.round(revenue * 100) / 100,
      });
    }
    return days;
  }, [sales]);

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <ClickableCard enabled={sales.length > 0} onClick={onOpenDetail}>
    <Card className="shadow-md">
      <CardHeader className="border-b border-slate-100 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm md:text-base lg:text-lg">Daily Revenue — Last 30 Days</CardTitle>
          <p className="text-xs md:text-sm font-semibold text-slate-600">
            Total: {formatCurrency(totalRevenue, currency, showSymbol)}
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-2 md:p-4">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              interval={4}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              width={45}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(value, currency, showSymbol), 'Revenue']}
              contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
              cursor={{ fill: '#f1f5f9' }}
            />
            <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
    </ClickableCard>
  );
}