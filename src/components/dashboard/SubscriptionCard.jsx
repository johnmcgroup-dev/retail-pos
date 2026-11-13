import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { billingState, planLabel, priceFor, money } from "@/lib/billing";

const STATUS_CLASSES = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  comped: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  past_due: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  pending_activation: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  suspended: "bg-red-500/15 text-red-300 border-red-500/30",
};

function safeDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/** Where this store stands with its subscription — status, plan, start and renewal. */
export default function SubscriptionCard({ company, config }) {
  if (!company) return null;

  const state = billingState(company);
  const cycle = company.billing_cycle || "annual";
  const startedOn = safeDate(company.first_active_at || company.created_date);
  const renewsOn = safeDate(company.next_billing_date);
  const price = priceFor(cycle, config);

  return (
    <Card className="h-full shadow-md flex flex-col">
      <CardHeader className="pb-2 md:pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-sm md:text-base lg:text-lg">Subscription</CardTitle>
            <p className="text-[11px] md:text-xs text-slate-500 mt-1 truncate">
              {planLabel(cycle)} plan · {money(price)}
            </p>
          </div>
          <Badge className={`flex-shrink-0 border text-[10px] md:text-xs ${STATUS_CLASSES[state.status] || STATUS_CLASSES.pending_activation}`}>
            {state.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex-1 flex flex-col justify-between gap-3">
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          <div className="rounded-lg bg-slate-50 p-2.5 md:p-3">
            <p className="text-[10px] md:text-xs text-slate-500">Using since</p>
            <p className="text-xs md:text-sm font-semibold text-slate-900 mt-0.5">
              {startedOn ? format(startedOn, "MMM d, yyyy") : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5 md:p-3">
            <p className="text-[10px] md:text-xs text-slate-500">
              {state.status === "active" ? "Next renewal" : "Access runs to"}
            </p>
            <p className="text-xs md:text-sm font-semibold text-slate-900 mt-0.5">
              {renewsOn ? format(renewsOn, "MMM d, yyyy") : "—"}
            </p>
          </div>
        </div>

        <Link
          to="/Subscription"
          className="inline-flex items-center gap-1.5 text-xs md:text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Manage subscription
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}