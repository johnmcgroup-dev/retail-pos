import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";
import { rewardAvailable, rewardValue } from "@/lib/loyalty";

export default function RewardCard({ reward, points = 0, onRedeem }) {
  const available = rewardAvailable(reward, points);
  const needed = Math.max(0, (reward.points_required || 0) - points);

  return (
    <Card className={available ? "border-green-200" : ""}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
            <Gift className="w-5 h-5 text-purple-600" />
          </div>
          <Badge variant={available ? "default" : "secondary"} className={available ? "bg-green-100 text-green-700" : ""}>
            {reward.points_required} pts
          </Badge>
        </div>

        <div>
          <p className="font-semibold text-slate-900">{reward.name}</p>
          {reward.description && <p className="text-xs text-slate-500 mt-0.5">{reward.description}</p>}
        </div>

        <p className="text-xs font-medium text-purple-600">{rewardValue(reward)}</p>

        {onRedeem && (
          <Button
            size="sm"
            className="w-full"
            variant={available ? "default" : "outline"}
            disabled={!available}
            onClick={() => onRedeem(reward)}
          >
            {available ? "Redeem" : `${needed} more pts`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}