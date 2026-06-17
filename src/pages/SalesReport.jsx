import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, Package, ArrowUpRight, ArrowDownRight, Calendar } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { formatCurrency } from "@/utils";

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

  const currency = companies[0]?.currency || "USD";

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
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-44">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="last7">Last 7 Days</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="last30">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs md:text-sm opacity-90">Total Revenue</p>
              <DollarSign className="w-4 h-4 opacity-80" />
            </div>
            <p className="text-xl md:text-3xl font-bold">{formatCurrency(totalRevenue, currency)}</p>
            <p className="text-xs opacity-80 mt-1">{periodLabels[period]}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs md:text-sm opacity-90">Gross Profit</p>
              <TrendingUp className="w-4 h-4 opacity-80" />
            </div>
            <p className="text-xl md:text-3xl font-bold">{formatCurrency(grossProfit, currency)}</p>
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
            <p className="text-xs opacity-80 mt-1">Avg: {formatCurrency(avgOrderValue, currency)}</p>
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
                <Tooltip formatter={(v) => [formatCurrency(v, currency), "Revenue"]} />
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
                      <p className="font-bold text-slate-900">{formatCurrency(p.revenue, currency)}</p>
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
    </div>
  );
}