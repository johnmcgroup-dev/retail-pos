import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Receipt, TrendingUp, BarChart3 } from "lucide-react";
import { formatCurrency } from "@/utils";

// Four headline numbers: today, today's sales count, this month, average sale.
export default function RevenueKpis({ todayRevenue = 0, todayCount = 0, monthRevenue = 0, avgSale = 0, currency = "NGN" }) {
  const cards = [
    { label: "Today's revenue", value: formatCurrency(todayRevenue, currency), icon: DollarSign, tone: "text-green-600 bg-green-50" },
    { label: "Sales today", value: String(todayCount), icon: Receipt, tone: "text-blue-600 bg-blue-50" },
    { label: "This month", value: formatCurrency(monthRevenue, currency), icon: TrendingUp, tone: "text-indigo-600 bg-indigo-50" },
    { label: "Average sale", value: formatCurrency(avgSale, currency), icon: BarChart3, tone: "text-purple-600 bg-purple-50" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.tone}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-500 mt-3">{card.label}</p>
              <p className="text-lg md:text-xl font-bold text-slate-900 mt-0.5 break-words">{card.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}