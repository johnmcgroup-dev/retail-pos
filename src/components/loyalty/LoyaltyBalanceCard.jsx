import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { formatCurrency } from "@/utils";
import { pointsValue } from "@/lib/loyalty";

export default function LoyaltyBalanceCard({ customer, program }) {
  const points = customer?.loyalty_points || 0;
  const purchases = customer?.total_purchases || 0;

  return (
    <Card className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 text-white border-0">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs opacity-90">Points balance</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold">{points}</p>
              <Star className="w-5 h-5 fill-yellow-300 text-yellow-300" />
            </div>
            <p className="text-xs opacity-90 mt-1">
              Worth {formatCurrency(pointsValue(program, points))} in discounts
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-90">Lifetime purchases</p>
            <p className="text-lg font-bold">{formatCurrency(purchases)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}