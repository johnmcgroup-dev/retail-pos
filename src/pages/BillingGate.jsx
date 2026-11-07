import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import PlanPicker from "@/components/billing/PlanPicker";
import { BILLING_DEFAULTS, billingState, checkoutLinkFor, money, priceFor, planLabel } from "@/lib/billing";
import { CheckCircle2, Clock, CreditCard, Loader2, LogOut, MapPin, Store } from "lucide-react";

const HEADLINES = {
  pending_activation: "Activate your store",
  past_due: "Renew your subscription",
  suspended: "Your store is suspended",
};

export default function BillingGate({ company, canManage = true }) {
  const { data: configs = [] } = useQuery({
    queryKey: ["billingConfig"],
    queryFn: () => base44.entities.BillingConfig.list(),
  });
  const config = { ...BILLING_DEFAULTS, ...(configs[0] || {}) };

  const [cycle, setCycle] = useState(company?.billing_cycle || "annual");
  const [requested, setRequested] = useState(Boolean(company?.payment_requested_at));

  const state = billingState(company);
  const planPrice = priceFor(cycle, config);
  const total = planPrice;
  const reference = `MYR-${String(company?.id || "").slice(-6).toUpperCase()}`;
  const storeName = company?.store_name || company?.name || "your store";

  const request = useMutation({
    mutationFn: () =>
      base44.entities.Company.update(company.id, {
        billing_cycle: cycle,
        subscription_plan: cycle,
        subscription_amount: planPrice,
        payment_requested_at: new Date().toISOString(),
      }),
    onSuccess: () => setRequested(true),
  });

  // The hosted checkout page for the plan they picked, opened as soon as they proceed.
  const checkoutLink = checkoutLinkFor(cycle, config, reference);

  const proceed = () => {
    // Record the request first so the store shows "activation requested" when the
    // tenant comes back, then hand them straight to the payment processor.
    request.mutate();
    if (!checkoutLink) return;
    const win = window.open(checkoutLink, "_blank", "noopener,noreferrer");
    if (!win) window.location.href = checkoutLink;
  };

  // Staff accounts cannot pay for the store — they see why it is closed instead.
  if (!canManage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 text-center space-y-4">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7 text-amber-600" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">{storeName} is not active yet</h1>
          <p className="text-sm text-slate-600">
            This store's subscription has not been completed. Please ask the store owner to
            finish payment from their own account — you can sign in as soon as the store is active.
          </p>
          <Button variant="ghost" onClick={() => base44.auth.logout()} className="w-full text-slate-500">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">{HEADLINES[state.status] || "Activate your store"}</h1>
          <p className="text-white/80 text-sm mt-1">{storeName}</p>
          {company?.store_address && (
            <p className="text-white/60 text-xs mt-1 flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3" />
              {company.store_address}
            </p>
          )}
        </div>

        <div className="p-6 space-y-5">
          {requested ? (
            <>
              <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-900">Activation requested</p>
                  <p className="text-xs text-green-800 mt-0.5">
                    Your {planLabel(cycle).toLowerCase()} plan is being confirmed. The store opens as soon as
                    your payment is received.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Amount due</span>
                  <span className="font-bold text-slate-900">{money(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Payment reference</span>
                  <span className="font-mono font-semibold text-slate-900">{reference}</span>
                </div>
              </div>

              {config.payment_instructions ? (
                <div className="p-3 bg-slate-50 border rounded-lg text-xs text-slate-700 whitespace-pre-line">
                  {config.payment_instructions}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Quote reference {reference} when you send your payment — your store is unlocked once it is confirmed.
                </p>
              )}

              <Button variant="outline" className="w-full" onClick={() => setRequested(false)}>
                Change my plan
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                Your store runs on a paid subscription — no free trial and no setup fee.
                Choose how you want to be billed and you're ready to go.
              </p>

              <PlanPicker cycle={cycle} onChange={setCycle} config={config} />

              <div className="space-y-2 text-sm border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-slate-600">{planLabel(cycle)} subscription</span>
                  <span className="font-semibold text-slate-900">{money(planPrice)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold text-slate-900">Due today</span>
                  <span className="text-lg font-bold text-blue-700">{money(total)}</span>
                </div>
                {cycle === "first_month" && (
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>From the second month</span>
                    <span>{money(config.monthly_price)} per month</span>
                  </div>
                )}
                {cycle === "first_month" && (
                  <p className="text-[11px] text-slate-400">
                    Want more than one month up front? Choose Monthly to pay {money(config.monthly_price)} per
                    extra month, or Annual for a full year.
                  </p>
                )}
              </div>

              {request.isError && (
                <p className="text-xs text-red-600 text-center">
                  Could not send the request. Please try again.
                </p>
              )}

              <Button
                onClick={proceed}
                disabled={request.isPending || !company?.id}
                className="w-full bg-blue-600 hover:bg-blue-700 text-base py-6"
              >
                {request.isPending ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Opening checkout...</>
                ) : (
                  <><CreditCard className="w-5 h-5 mr-2" /> Pay {money(total)} — go to checkout</>
                )}
              </Button>

              {!checkoutLink && (
                <p className="text-center text-xs text-amber-600">
                  Online checkout is not linked yet — use the payment details below to complete activation.
                </p>
              )}

              <p className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                Reference {reference} · access opens once payment is confirmed
              </p>
            </>
          )}

          <Button variant="ghost" onClick={() => base44.auth.logout()} className="w-full text-slate-500">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}