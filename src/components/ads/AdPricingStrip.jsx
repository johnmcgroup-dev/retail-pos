import React from "react";
import { AD_PLACEMENTS } from "@/lib/adPricing";
import { formatCurrency } from "@/components/utils";

/** The three paid placements and what each costs per day. */
export default function AdPricingStrip({ currency = "NGN", showSymbol = true }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 md:gap-4">
      {Object.entries(AD_PLACEMENTS).map(([key, option]) => (
        <div key={key} className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4 shadow-sm">
          <p className="text-xs md:text-sm font-semibold text-slate-900">{option.label}</p>
          <p className="text-[11px] md:text-xs text-slate-500 mt-1 leading-snug">{option.blurb}</p>
          <p className="text-sm md:text-base font-bold text-blue-700 mt-2">
            {formatCurrency(option.perDay, currency, showSymbol)}
            <span className="text-[11px] font-normal text-slate-500"> / day</span>
          </p>
        </div>
      ))}
    </div>
  );
}