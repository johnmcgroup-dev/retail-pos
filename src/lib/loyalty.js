import { base44 } from "@/api/base44Client";
import { formatCurrency } from "@/utils";

// Defaults used while a store has not configured its programme yet, and as the
// starting point of the owner's settings form.
export const DEFAULT_TIERS = [
  { name: "Bronze", min_points: 0, earn_multiplier: 1, perk: "Earn points on every purchase" },
  { name: "Silver", min_points: 500, earn_multiplier: 1.25, perk: "Earn 25% more points" },
  { name: "Gold", min_points: 2000, earn_multiplier: 1.5, perk: "Earn 50% more points" },
  { name: "Platinum", min_points: 5000, earn_multiplier: 2, perk: "Earn double points" },
];

export const DEFAULT_PROGRAM = {
  name: "Reward Club",
  description: "Earn points every time you shop, then redeem them for discounts and free items.",
  points_per_dollar: 1,
  redemption_value: 0.01,
  minimum_purchase: 0,
  tiers: DEFAULT_TIERS,
  active: true,
};

export function tiersOf(program) {
  const tiers = program?.tiers?.length ? program.tiers : DEFAULT_TIERS;
  return [...tiers].sort((a, b) => (a.min_points || 0) - (b.min_points || 0));
}

export function tierFor(program, points = 0) {
  const tiers = tiersOf(program);
  return tiers.reduce(
    (current, tier) => (points >= (tier.min_points || 0) ? tier : current),
    tiers[0]
  );
}

export function tierProgress(program, points = 0) {
  const tiers = tiersOf(program);
  const current = tierFor(program, points);
  const index = tiers.findIndex((t) => t.name === current?.name);
  const next = index >= 0 ? tiers[index + 1] || null : null;
  if (!next) return { current, next: null, percent: 100, pointsToNext: 0 };

  const base = current?.min_points || 0;
  const span = Math.max(1, (next.min_points || 0) - base);
  const earned = Math.max(0, points - base);
  return {
    current,
    next,
    percent: Math.min(100, Math.round((earned / span) * 100)),
    pointsToNext: Math.max(0, (next.min_points || 0) - points),
  };
}

// Points a sale earns: the owner's rate, lifted by the customer's tier multiplier.
export function pointsForSale(program, amount = 0, currentPoints = 0) {
  if (!program) return 0;
  if (amount < (program.minimum_purchase || 0)) return 0;
  const multiplier = tierFor(program, currentPoints)?.earn_multiplier || 1;
  return Math.floor(amount * (program.points_per_dollar || 0) * multiplier);
}

export function pointsValue(program, points = 0) {
  return points * (program?.redemption_value || 0);
}

export function rewardValue(reward) {
  if (!reward) return "";
  if (reward.reward_type === "discount_percentage") return `${reward.discount_value || 0}% off`;
  if (reward.reward_type === "discount_amount") return `${formatCurrency(reward.discount_value)} off`;
  if (reward.reward_type === "free_product") {
    const name = reward.product_name || "Free item";
    return (reward.quantity || 1) > 1 ? `${name} × ${reward.quantity}` : name;
  }
  return "";
}

export function rewardAvailable(reward, points = 0) {
  if (!reward) return false;
  const active = (reward.status || "active") === "active";
  const affordable = (reward.points_required || 0) <= points;
  const notMaxed =
    !reward.max_redemptions || (reward.redemptions_count || 0) < reward.max_redemptions;
  const notExpired =
    !reward.valid_until || new Date(reward.valid_until) >= new Date(new Date().setHours(0, 0, 0, 0));
  return active && affordable && notMaxed && notExpired;
}

/**
 * Spends a customer's points on a reward: logs the redemption, lowers their
 * balance and counts the redemption against the reward's limit.
 */
export async function redeemReward({ customer, reward, companyId }) {
  const balance = customer?.loyalty_points || 0;
  const cost = reward?.points_required || 0;
  if (balance < cost) throw new Error("Not enough points for this reward");

  const newBalance = balance - cost;
  const storeId = companyId || customer?.company_id;

  await base44.entities.LoyaltyTransaction.create({
    company_id: storeId,
    customer_id: customer.id,
    transaction_type: "redeemed",
    points: -cost,
    reference_type: "reward",
    reference_id: reward.id,
    description: `Redeemed: ${reward.name}`,
    balance_after: newBalance,
    transaction_date: new Date().toISOString(),
  });

  await base44.entities.Customer.update(customer.id, { loyalty_points: newBalance });

  await base44.entities.Reward.update(reward.id, {
    redemptions_count: (reward.redemptions_count || 0) + 1,
  });

  return newBalance;
}