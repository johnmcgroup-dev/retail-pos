import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, TrendingUp } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { formatCurrency } from "@/utils";

export default function StaffSalesWidget({ sales = [], currency = "USD", showSymbol = false }) {
  const [period, setPeriod] = useState("today");

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case "today": return { start: startOfDay(now), end: endOfDay(now) };
      case "yesterday": return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
      case "week": return { start: startOfWeek(now), end: endOfWeek(now) };
      case "month": return { start: startOfMonth(now), end: endOfMonth(now) };
      default: return { start: startOfDay(now), end: endOfDay(now) };
    }
  };

  const { start, end } = getDateRange();

  const filteredSales = sales.filter(s => {
    const d = new Date(s.sale_date);
    return d >= start && d <= end;
  });

  // Group by cashier
  const staffMap = {};
  filteredSales.forEach(sale => {
    const name = sale.cashier ? sale.cashier.split("@")[0] : "Unknown";
    if (!staffMap[name]) {
      staffMap[name] = { name, totalSales: 0, transactions: 0 };
    }
    staffMap[name].totalSales += sale.total_amount || 0;
    staffMap[name].transactions += 1;
  });

  const staffList = Object.values(staffMap).sort((a, b) => b.totalSales - a.totalSales);
  const totalPeriodRevenue = filteredSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

  const periodLabels = {
    today: "Today", yesterday: "Yesterday", week: "This Week", month: "This Month"
  };

  const rankColors = ["bg-yellow-400", "bg-slate-300", "bg-orange-400"];

  return (
    <Card className="shadow-md">
      <CardHeader className="border-b border-slate-100 pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
            Sales by Staff
          </CardTitle>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Total {periodLabels[period]}: <span className="font-semibold text-slate-700">{formatCurrency(totalPeriodRevenue, currency, showSymbol)}</span>
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {staffList.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {staffList.map((staff, i) => {
              const pct = totalPeriodRevenue > 0 ? (staff.totalSales / totalPeriodRevenue) * 100 : 0;
              return (
                <div key={staff.name} className="p-3 md:p-4 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${rankColors[i] || "bg-slate-400"}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-semibold text-slate-800 text-xs md:text-sm capitalize truncate">{staff.name}</p>
                        <p className="font-bold text-slate-900 text-xs md:text-sm flex-shrink-0">
                          {formatCurrency(staff.totalSales, currency, showSymbol)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <Badge variant="outline" className="text-[10px] flex-shrink-0">
                          {staff.transactions} txn{staff.transactions !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <TrendingUp className="w-8 h-8 mx-auto mb-2" />
            <p className="text-xs md:text-sm">No sales data for {periodLabels[period].toLowerCase()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}