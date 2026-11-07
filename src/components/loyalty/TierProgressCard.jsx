import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Sparkles, TrendingUp } from "lucide-react";
import { tierProgress } from "@/lib/loyalty";

export default function TierProgressCard({ program, points = 0 }) {
  const { current, next, percent, pointsToNext } = tierProgress(program, points);
  if (!current) return null;

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Current tier</p>
              <p className="font-bold text-slate-900 truncate">{current.name}</p>
            </div>
          </div>
          {next ? (
            <Badge variant="secondary" className="flex-shrink-0">
              {pointsToNext} pts to {next.name}
            </Badge>
          ) : (
            <Badge className="bg-purple-100 text-purple-700 flex-shrink-0">Top tier</Badge>
          )}
        </div>

        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {current.perk || "Earning points"}
            {current.earn_multiplier > 1 ? ` (${current.earn_multiplier}×)` : ""}
          </span>
          {next?.perk && (
            <span className="flex items-center gap-1 text-purple-600">
              <Sparkles className="w-3.5 h-3.5" />
              Next: {next.perk}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}