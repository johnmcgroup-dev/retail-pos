import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DrawerSelect from "@/components/shared/DrawerSelect";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, Package, ArrowUpRight, ArrowDownRight, Calendar } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { formatCurrency } from "@/utils";
import StaffPerformance from "@/components/reports/StaffPerformance";

export default function SalesReport() {
  const [period, setPeriod] = useState("today");

  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: () => base44.entities.Sale.list("-sale_date"),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });

  const company = companies[0];
  const currency = company?.currency || "USD";
  const showSymbol = company?.show_currency_symbol || false;

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case "today": return { start: startOfDay(now), end: endOfDay(now) };
      case "yesterday": return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
      case "week": return { start: startOfWeek(now), end: endOfWeek(now) };
      case "month": return { start: startOfMonth(now), end: endOfMonth(now) };
      case "last7": return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
      case "last30": return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
      default: return { start: startOfDay(now), end: endOfDay(now) };
    }
  };

  const { start, end } = getDateRange();
  const filteredSales = sales.filter(s => {
    const d = new Date(s.sale_date);
    return d >= start && d <= end;
  });

  const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalCost = filteredSales.reduce((sum, s) => {
    return sum + (s.items || []).reduce((isum, item) => {
      const p = products.find(x => x.id === item.product_id);
      return isum + ((p?.cost_price || 0) * item.quantity);
    }, 0);
  }, 0);
  const grossProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const totalTransactions = filteredSales.length;
  const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Top selling products
  const productSalesMap = {};
  filteredSales.forEach(s => {
    (s.items || []).forEach(item => {
      if (!productSalesMap[item.product_id]) {
        const p = products.find(x => x.id === item.product_id);
        productSalesMap[item.product_id] = {
          name: item.product_name || p?.name || "Unknown",
          qty: 0,
          revenue: 0,
          cost: 0,
        };
      }
      const p = products.find(x => x.id === item.product_id);
      productSalesMap[item.product_id].qty += item.quantity;
      productSalesMap[item.product_id].revenue += item.total || (item.unit_price * item.quantity);
      productSalesMap[item.product_id].cost += (p?.cost_price || 0) * item.quantity;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Chart data
  const chartData = (() => {
    if (period === "today" || period === "yesterday") {
      const hours = {};
      for (let h = 0; h < 24; h++) hours[`${h}:00`] = 0;
      filteredSales.forEach(s => {
        const h = new Date(s.sale_date).getHours();
        hours[`${h}:00`] = (hours[`${h}:00`] || 0) + (s.total_amount || 0);
      });
      return Object.entries(hours).map(([time, revenue]) => ({ time, revenue }));
    } else {
      const days = {};
      filteredSales.forEach(s => {
        const day = format(new Date(s.sale_date), "MMM d");
        days[day] = (days[day] || 0) + (s.total_amount || 0);
      });
      return Object.entries(days).map(([time, revenue]) => ({ time, revenue }));
    }
  })();

  const periodLabels = {
    today: "Today", yesterday: "Yesterday", week: "This Week",
    month: "This Month", last7: "Last 7 Days", last30: "Last 30 Days",
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Sales Report</h1>
          <p className="text-slate-500 mt-1">Daily revenue, top sellers & profit margins</p>
        </div>
        <DrawerSelect
          value={period}
          onValueChange={setPeriod}
          options={[
            { value: "today", label: "Today" },
            { value: "yesterday", label: "Yesterday" },
            { value: "week", label: "This Week" },
            { value: "last7", label: "Last 7 Days" },
            { value: "month", label: "This Month" },
            { value: "last30", label: "Last 30 Days" },
          ]}
          placeholder="Select period"
          label="Select Period"
          triggerClassName="w-44 h-9 border border-input bg-background rounded-md px-3 text-sm font-medium"
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs md:text-sm opacity-90">Total Revenue</p>
              <DollarSign className="w-4 h-4 opacity-80" />
            </div>
            <p className="text-xl md:text-3xl font-bold">{formatCurrency(totalRevenue, currency, showSymbol)}</p>
            <p className="text-xs opacity-80 mt-1">{periodLabels[period]}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs md:text-sm opacity-90">Gross Profit</p>
              <TrendingUp className="w-4 h-4 opacity-80" />
            </div>
            <p className="text-xl md:text-3xl font-bold">{formatCurrency(grossProfit, currency, showSymbol)}</p>
            <p className="text-xs opacity-80 mt-1">Margin: {profitMargin.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs md:text-sm opacity-90">Transactions</p>
              <Package className="w-4 h-4 opacity-80" />
            </div>
            <p className="text-xl md:text-3xl font-bold">{totalTransactions}</p>
            <p className="text-xs opacity-80 mt-1">Avg: {formatCurrency(avgOrderValue, currency, showSymbol)}</p>
          </CardContent>
        </Card>

        <Card className={`${profitMargin >= 20 ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : profitMargin >= 10 ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' : 'bg-gradient-to-br from-red-500 to-red-600'} text-white`}>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs md:text-sm opacity-90">Profit Margin</p>
              {profitMargin >= 10 ? <ArrowUpRight className="w-4 h-4 opacity-80" /> : <ArrowDownRight className="w-4 h-4 opacity-80" />}
            </div>
            <p className="text-xl md:text-3xl font-bold">{profitMargin.toFixed(1)}%</p>
            <p className="text-xs opacity-80 mt-1">
              {profitMargin >= 20 ? "Excellent" : profitMargin >= 10 ? "Good" : "Needs Attention"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Revenue by Payment Method — {periodLabels[period]}</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const methodMap = {};
            filteredSales.forEach(s => {
              const m = s.payment_method || "cash";
              if (!methodMap[m]) methodMap[m] = { count: 0, total: 0 };
              methodMap[m].count += 1;
              methodMap[m].total += s.total_amount || 0;
            });
            const methodLabels = {
              cash: "Cash",
              card: "Card Terminal",
              bank_transfer: "Bank Transfer",
              mobile_money: "Mobile Money",
              credit: "Store Credit",
            };
            const methodColors = {
              cash: "bg-green-500",
              card: "bg-blue-500",
              bank_transfer: "bg-purple-500",
              mobile_money: "bg-orange-500",
              credit: "bg-pink-500",
            };
            const methodData = Object.entries(methodMap)
              .map(([key, val]) => ({ key, label: methodLabels[key] || key, ...val }))
              .sort((a, b) => b.total - a.total);

            if (methodData.length === 0) {
              return (
                <div className="text-center py-8 text-slate-400">
                  <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>No payment data for this period</p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {/* Bar visualization */}
                <div className="space-y-3">
                  {methodData.map(m => {
                    const pct = totalRevenue > 0 ? (m.total / totalRevenue) * 100 : 0;
                    return (
                      <div key={m.key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-slate-700">{m.label}</span>
                          <span className="font-bold text-slate-900">{formatCurrency(m.total, currency, showSymbol)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${methodColors[m.key] || "bg-slate-400"} rounded-full transition-all`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 w-20 text-right">{m.count} txn{m.count !== 1 ? "s" : ""} · {pct.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Summary grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t">
                  {methodData.map(m => (
                    <div key={m.key} className="text-center p-2 rounded-lg bg-slate-50">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">{m.label}</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{formatCurrency(m.total, currency, showSymbol)}</p>
                      <p className="text-[10px] text-slate-400">{m.count} txn{m.count !== 1 ? "s" : ""}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Revenue — {periodLabels[period]}</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.some(d => d.revenue > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [formatCurrency(v, currency, showSymbol), "Revenue"]} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <TrendingUp className="w-12 h-12 mx-auto mb-3" />
              <p>No sales data for {periodLabels[period].toLowerCase()}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Selling Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Top Selling Products</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {topProducts.length > 0 ? (
            <div className="divide-y">
              {topProducts.map((p, i) => {
                const margin = p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue * 100) : 0;
                return (
                  <div key={i} className="p-4 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.qty} units sold</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-slate-900">{formatCurrency(p.revenue, currency, showSymbol)}</p>
                      <Badge className={`text-xs ${margin >= 20 ? 'bg-green-100 text-green-700' : margin >= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {margin.toFixed(1)}% margin
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-3" />
              <p>No product sales data available</p>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Staff Performance */}
      <StaffPerformance sales={sales} currency={currency} showSymbol={showSymbol} />
    </div>
  );
}