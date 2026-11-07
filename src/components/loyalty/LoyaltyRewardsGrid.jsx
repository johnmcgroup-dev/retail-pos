import React, { useState } from "react";
import { Gift } from "lucide-react";
import RewardCard from "@/components/loyalty/RewardCard";
import RedeemRewardDialog from "@/components/loyalty/RedeemRewardDialog";

export default function LoyaltyRewardsGrid({ rewards = [], customer, companyId, canRedeem = true }) {
  const [reward, setReward] = useState(null);
  const points = customer?.loyalty_points || 0;
  const sorted = [...rewards].sort((a, b) => (a.points_required || 0) - (b.points_required || 0));

  if (!sorted.length) {
    return (
      <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl">
        <Gift className="w-10 h-10 text-slate-200 mx-auto mb-2" />
        <p className="text-sm text-slate-500">The store hasn't published any rewards yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((r) => (
          <RewardCard
            key={r.id}
            reward={r}
            points={points}
            onRedeem={canRedeem ? setReward : undefined}
          />
        ))}
      </div>

      <RedeemRewardDialog
        open={!!reward}
        reward={reward}
        customer={customer}
        companyId={companyId}
        onClose={() => setReward(null)}
      />
    </>
  );
}