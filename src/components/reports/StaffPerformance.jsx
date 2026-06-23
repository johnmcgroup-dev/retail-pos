import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { TrendingUp, DollarSign, Package, ArrowUpRight, ArrowDownRight, Calendar, Users, User } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { formatCurrency } from "@/utils";

export default function StaffPerformance({ sales = [], currency = "USD", showSymbol = false }) {
  const [period, setPeriod] = useState("today");
  const [selectedStaff, setSelectedStaff] = useState("all");

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

  const inRangeSales = sales.filter(s => {
    const d = new Date(s.sale_date);
    return d >= start && d <= end;
  });

  // Group by cashier
  const staffMap = {};
  inRangeSales.forEach(s => {
    const key = s.cashier || "Unknown";
    if (!staffMap[key]) staffMap[key] = { cashier: key, displayName: key.split("@")[0], totalSales: 0, transactions: 0, items: 0, lastSale: null };
    staffMap[key].totalSales += s.total_amount || 0;
    staffMap[key].transactions += 1;
    staffMap[key].items += (s.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
    if (!staffMap[key].lastSale || new Date(s.sale_date) > new Date(staffMap[key].lastSale)) {
      staffMap[key].lastSale = s.sale_date;
    }
  });

  const staffList = Object.values(staffMap).sort((a, b) => b.totalSales - a.totalSales);
  const totalStaffSales = staffList.reduce((s, x) => s + x.totalSales, 0);
  const allStaff = staffList.map(s => s.cashier);

  const selectedSales = selectedStaff === "all"
    ? inRangeSales
    : inRangeSales.filter(s => (s.cashier || "Unknown") === selectedStaff).sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date));

  const totalTransactions = staffList.reduce((s, x) => s + x.transactions, 0);
  const avgPerStaff = staffList.length > 0 ? totalStaffSales / staffList.length : 0;

  const chartData = staffList.map(s => ({
    name: s.displayName,
    revenue: s.totalSales,
    transactions: s.transactions,
  }));

  const periodLabels = {
    today: "Today", yesterday: "Yesterday", week: "This Week",
    month: "This Month", last7: "Last 7 Days", last30: "Last 30 Days",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Staff Performance
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Track individual employee sales performance</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
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
          <Select value={selectedStaff} onValueChange={setSelectedStaff}>
            <SelectTrigger className="w-44">
              <User className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {allStaff.map(c => <SelectItem key={c} value={c}>{c.split("@")[0]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs md:text-sm opacity-90">Staff Revenue</p>
              <DollarSign className="w-4 h-4 opacity-80" />
            </div>
            <p className="text-xl md:text-3xl font-bold">{formatCurrency(totalStaffSales, currency, showSymbol)}</p>
            <p className="text-xs opacity-80 mt-1">{periodLabels[period]}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs md:text-sm opacity-90">Active Staff</p>
              <Users className="w-4 h-4 opacity-80" />
            </div>
            <p className="text-xl md:text-3xl font-bold">{staffList.length}</p>
            <p className="text-xs opacity-80 mt-1">{totalTransactions} transactions</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs md:text-sm opacity-90">Avg per Staff</p>
              <TrendingUp className="w-4 h-4 opacity-80" />
            </div>
            <p className="text-xl md:text-3xl font-bold">{formatCurrency(avgPerStaff, currency, showSymbol)}</p>
            <p className="text-xs opacity-80 mt-1">{staffList.length > 0 ? `${(totalTransactions / staffList.length).toFixed(1)} sales each` : "—"}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs md:text-sm opacity-90">Total Items Sold</p>
              <Package className="w-4 h-4 opacity-80" />
            </div>
            <p className="text-xl md:text-3xl font-bold">{staffList.reduce((s, x) => s + x.items, 0)}</p>
          </CardContent>
        </Card>
      </div>

      {staffList.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base md:text-lg">Revenue by Staff Member</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [formatCurrency(v, currency, showSymbol), "Revenue"]} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Staff leaderboard */}
      <Card>
        <CardHeader><CardTitle className="text-base md:text-lg">Staff Leaderboard</CardTitle></CardHeader>
        <CardContent className="p-0">
          {staffList.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3" />
              <p>No sales recorded by staff in {periodLabels[period].toLowerCase()}</p>
            </div>
          ) : (
            <div className="divide-y">
              {staffList.map((s, i) => {
                const avg = s.transactions > 0 ? s.totalSales / s.transactions : 0;
                const isSelected = selectedStaff === s.cashier;
                return (
                  <div key={s.cashier} className={`p-4 flex items-center gap-4 cursor-pointer ${isSelected ? "bg-blue-50" : "hover:bg-slate-50"}`}
                    onClick={() => setSelectedStaff(isSelected ? "all" : s.cashier)}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-slate-200 text-slate-700" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                    }`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {s.displayName}
                        {i === 0 && <Badge className="ml-2 bg-yellow-400 text-yellow-900 text-[10px]">Top Seller</Badge>}
                      </p>
                      <p className="text-xs text-slate-500">
                        {s.transactions} sales • {s.items} items • avg {formatCurrency(avg, currency, showSymbol)} • last sale {s.lastSale ? format(new Date(s.lastSale), "MMM d, h:mm a") : "—"}
                      </p>
                    </div>
                    <p className="font-bold text-slate-900 flex-shrink-0 text-right">{formatCurrency(s.totalSales, currency, showSymbol)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected staff's individual sales */}
      {selectedStaff !== "all" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">
              Sales by {selectedStaff.split("@")[0]} — {periodLabels[period]}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {selectedSales.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Package className="w-12 h-12 mx-auto mb-3" />
                <p>No individual sales in this period</p>
              </div>
            ) : (
              <div className="divide-y max-h-[50vh] overflow-auto">
                {selectedSales.slice(0, 50).map(s => (
                  <div key={s.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{s.invoice_number || "—"}</p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(s.sale_date), "MMM d, yyyy h:mm a")} • {s.payment_method || "—"}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-slate-900">{formatCurrency(s.total_amount, currency, showSymbol)}</p>
                      <p className="text-xs text-slate-500">{(s.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0)} items</p>
                    </div>
                  </div>
                ))}
                {selectedSales.length > 50 && (
                  <div className="p-3 text-center text-xs text-slate-400">Showing 50 of {selectedSales.length} sales</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}