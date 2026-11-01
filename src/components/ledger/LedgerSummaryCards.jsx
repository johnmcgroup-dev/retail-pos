import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, Wallet } from "lucide-react";

/**
 * Money totals for the selected period: what came in from sales, what went out
 * on expenses and payroll, and the resulting movement.
 */
export default function LedgerSummaryCards({ totals, money }) {
  const cards = [
    { label: "Sales", value: totals.sales, icon: TrendingUp, tone: "text-emerald-600" },
    { label: "Expenses", value: totals.expenses, icon: TrendingDown, tone: "text-rose-600" },
    { label: "Payroll", value: totals.payroll, icon: Users, tone: "text-amber-600" },
    { label: "Net movement", value: totals.net, icon: Wallet, tone: totals.net < 0 ? "text-rose-600" : "text-blue-600" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className={`text-base md:text-xl font-bold truncate ${card.tone}`}>{money(card.value)}</p>
              </div>
              <card.icon className={`w-6 h-6 flex-shrink-0 ${card.tone} opacity-70`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}