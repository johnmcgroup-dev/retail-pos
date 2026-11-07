import React from "react";
import { Check, Rocket, Sparkles } from "lucide-react";
import { money, priceFor, annualSaving, withDefaults } from "@/lib/billing";

/**
 * The three subscription choices on the activation screen: the ₦1,500 first
 * month, the regular monthly plan, and the annual plan (cheapest per month).
 */
export default function PlanPicker({ cycle, onChange, config }) {
  const cfg = withDefaults(config);

  const plans = [
    {
      id: "first_month",
      name: "First month",
      price: money(priceFor("first_month", cfg)),
      period: "for your first month",
      note: `Then ${money(cfg.monthly_price)} per month — add more months any time`,
      tag: { label: "Start here", icon: Rocket, tone: "bg-emerald-600" },
    },
    {
      id: "monthly",
      name: "Monthly",
      price: money(priceFor("monthly", cfg)),
      period: "per month",
      note: "Pay month by month, cancel anytime",
      tag: null,
    },
    {
      id: "annual",
      name: "Annual",
      price: money(priceFor("annual", cfg)),
      period: "per year",
      note: `Save ${money(annualSaving(cfg))} vs monthly`,
      tag: { label: "Best value", icon: Sparkles, tone: "bg-blue-600" },
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {plans.map((plan) => {
        const active = cycle === plan.id;
        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => onChange(plan.id)}
            className={`relative rounded-xl p-4 text-left transition-all ${
              active
                ? "border-2 border-blue-600 bg-blue-50"
                : "border-2 border-slate-200 hover:border-slate-400 bg-white"
            }`}
          >
            {plan.tag && (
              <span
                className={`absolute -top-2.5 right-3 inline-flex items-center gap-1 ${plan.tag.tone} text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide`}
              >
                <plan.tag.icon className="w-2.5 h-2.5" />
                {plan.tag.label}
              </span>
            )}
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">{plan.name}</p>
              {active && <Check className="w-4 h-4 text-blue-600" />}
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">{plan.price}</p>
            <p className="text-xs text-slate-500">{plan.period}</p>
            <p className="text-xs text-slate-400 mt-1">{plan.note}</p>
          </button>
        );
      })}
    </div>
  );
}