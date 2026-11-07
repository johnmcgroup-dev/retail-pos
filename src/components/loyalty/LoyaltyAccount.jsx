import React from "react";
import LoyaltyBalanceCard from "@/components/loyalty/LoyaltyBalanceCard";
import TierProgressCard from "@/components/loyalty/TierProgressCard";
import LoyaltyRewardsGrid from "@/components/loyalty/LoyaltyRewardsGrid";
import LoyaltyHistory from "@/components/loyalty/LoyaltyHistory";

/**
 * One customer's loyalty account: balance, tier progress, redeemable rewards
 * and points history. Used by the customer's own page and by staff looking at a
 * customer record, so both always show the same numbers.
 */
export default function LoyaltyAccount({
  customer,
  program,
  rewards = [],
  transactions = [],
  companyId,
  canRedeem = true,
}) {
  return (
    <div className="space-y-4">
      <LoyaltyBalanceCard customer={customer} program={program} />
      <TierProgressCard program={program} points={customer?.loyalty_points || 0} />

      <section className="space-y-3">
        <h3 className="font-bold text-slate-900">Redeem points</h3>
        <LoyaltyRewardsGrid
          rewards={rewards}
          customer={customer}
          companyId={companyId}
          canRedeem={canRedeem}
        />
      </section>

      <section className="space-y-3">
        <h3 className="font-bold text-slate-900">Points history</h3>
        <LoyaltyHistory transactions={transactions} />
      </section>
    </div>
  );
}