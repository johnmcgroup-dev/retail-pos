import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BILLING_DEFAULTS, billingState, money, priceFor, activationFee, planLabel } from "@/lib/billing";
import { format } from "date-fns";
import { CalendarClock, CreditCard, Info } from "lucide-react";

const TONES = {
  active: "bg-green-100 text-green-700",
  comped: "bg-blue-100 text-blue-700",
  pending_activation: "bg-amber-100 text-amber-700",
  past_due: "bg-red-100 text-red-700",
  suspended: "bg-red-100 text-red-700",
};

/** Owner-facing view of the store subscription. */
export default function BillingPanel({ company }) {
  const queryClient = useQueryClient();
  const { data: configs = [] } = useQuery({
    queryKey: ["billingConfig"],
    queryFn: () => base44.entities.BillingConfig.list(),
  });
  const config = { ...BILLING_DEFAULTS, ...(configs[0] || {}) };

  const state = billingState(company);
  const cycle = company?.billing_cycle || "annual";

  // The store's usage history starts the day it first opened the app. Tenants
  // created before this was recorded fall back to their sign-up date.
  const startedOn = company?.first_active_at || company?.created_date;
  const since = startedOn ? new Date(startedOn) : null;
  const monthsUsed = since
    ? Math.max(
        0,
        (new Date().getFullYear() - since.getFullYear()) * 12 + (new Date().getMonth() - since.getMonth())
      )
    : 0;
  const usageLabel = monthsUsed < 1 ? "Less than a month" : `${monthsUsed} month${monthsUsed === 1 ? "" : "s"}`;

  const switchPlan = useMutation({
    mutationFn: (nextCycle) =>
      base44.entities.Company.update(company.id, {
        billing_cycle: nextCycle,
        subscription_plan: nextCycle,
        subscription_amount: priceFor(nextCycle, config),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }),
  });

  if (!company) {
    return (
      <Card>
        <CardContent className="p-6 text-slate-500">No subscription information available</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Store</p>
              <p className="text-lg font-bold text-slate-900">
                {company.store_name || company.name}
              </p>
              {company.store_address && (
                <p className="text-xs text-slate-500">{company.store_address}</p>
              )}
            </div>
            <Badge className={TONES[state.status] || TONES.pending_activation}>{state.label}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-600">Billing plan</p>
              <p className="font-semibold text-slate-900">{planLabel(cycle)}</p>
            </div>
            {activationFee(company, config) > 0 && (
              <div>
                <p className="text-slate-600">Activation fee</p>
                <p className="font-semibold text-slate-900">
                  {money(activationFee(company, config))}{" "}
                  <span className={company.activation_paid ? "text-green-600" : "text-amber-600"}>
                    {company.activation_paid ? "paid" : "unpaid"}
                  </span>
                </p>
              </div>
            )}
            <div>
              <p className="text-slate-600">Cycle amount</p>
              <p className="font-semibold text-slate-900">
                {money(company.subscription_amount ?? priceFor(cycle, config))}
              </p>
            </div>
            <div>
              <p className="text-slate-600">Paid through</p>
              <p className="font-semibold text-slate-900">
                {company.next_billing_date
                  ? format(new Date(company.next_billing_date), "MMM d, yyyy")
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-slate-600">Using since</p>
              <p className="font-semibold text-slate-900">
                {since ? format(since, "MMM d, yyyy") : "—"}
              </p>
            </div>
          </div>

          {since && (
            <p className="text-xs text-slate-500">
              {usageLabel} with My Retailer Pro. Your renewal countdown and sales history both run
              from {format(since, "MMM d, yyyy")} — open Reports to track how your store has grown
              since then.
            </p>
          )}

          {company.payment_requested_at && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <CalendarClock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Activation requested on{" "}
                {format(new Date(company.payment_requested_at), "MMM d, yyyy 'at' HH:mm")} — your payment
                is being confirmed.
              </p>
            </div>
          )}

          {company.billing_override && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                Billing has been waived for this store by the platform owner.
              </p>
            </div>
          )}

          {config.payment_instructions && (
            <div className="p-3 bg-slate-50 border rounded-lg text-xs text-slate-700 whitespace-pre-line">
              {config.payment_instructions}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change your plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {["annual", "monthly"].map((id) => (
              <Button
                key={id}
                variant={cycle === id ? "default" : "outline"}
                className="h-auto py-3 flex-col items-start gap-0.5"
                onClick={() => switchPlan.mutate(id)}
                disabled={cycle === id || switchPlan.isPending}
              >
                <span className="text-sm font-semibold capitalize">
                  {id} — {money(priceFor(id, config))}
                </span>
                <span className="text-xs opacity-70">
                  {id === "annual" ? "per year" : "per month"}
                  {cycle === id ? " · current plan" : ""}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}