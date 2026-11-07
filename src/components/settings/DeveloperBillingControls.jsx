import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DrawerSelect from "@/components/shared/DrawerSelect";
import { BILLING_DEFAULTS, STATUS_FOR_BILLING } from "@/lib/billing";
import { ShieldCheck } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "pending_activation", label: "Awaiting activation (locked)" },
  { value: "active", label: "Active (open)" },
  { value: "past_due", label: "Payment due (locked)" },
  { value: "suspended", label: "Suspended (locked)" },
  { value: "comped", label: "Complimentary (open, free)" },
];

const CYCLE_OPTIONS = [
  { value: "annual", label: "Annual" },
  { value: "monthly", label: "Monthly" },
];

/**
 * Developer-only billing console, shown in Company Setup → Subscription.
 *
 * The top card changes the platform-wide billing rules (activation fee, plan
 * prices, trials, payment instructions). The bottom card overrides the billing
 * state of whichever store is selected above.
 */
export default function DeveloperBillingControls({ company }) {
  const queryClient = useQueryClient();
  const { data: configs = [] } = useQuery({
    queryKey: ["billingConfig"],
    queryFn: () => base44.entities.BillingConfig.list(),
  });
  const storedConfig = configs[0];

  const [rules, setRules] = useState({ ...BILLING_DEFAULTS });
  const [billing, setBilling] = useState({});

  useEffect(() => {
    setRules({ ...BILLING_DEFAULTS, ...(storedConfig || {}) });
  }, [storedConfig?.id, storedConfig?.updated_date]);

  useEffect(() => {
    if (!company) return;
    setBilling({
      billing_status: company.billing_status || "pending_activation",
      billing_cycle: company.billing_cycle || "annual",
      activation_fee: company.activation_fee ?? BILLING_DEFAULTS.activation_fee,
      activation_paid: !!company.activation_paid,
      subscription_amount: company.subscription_amount ?? "",
      next_billing_date: company.next_billing_date || "",
      billing_override: !!company.billing_override,
      billing_notes: company.billing_notes || "",
    });
  }, [company?.id, company?.updated_date]);

  const saveRules = useMutation({
    mutationFn: () => {
      const payload = {
        activation_fee: Number(rules.activation_fee) || 0,
        annual_price: Number(rules.annual_price) || 0,
        monthly_price: Number(rules.monthly_price) || 0,
        trials_enabled: !!rules.trials_enabled,
        trial_days: Number(rules.trial_days) || 0,
        payment_instructions: rules.payment_instructions || "",
        checkout_url_annual: (rules.checkout_url_annual || "").trim(),
        checkout_url_monthly: (rules.checkout_url_monthly || "").trim(),
      };
      return storedConfig
        ? base44.entities.BillingConfig.update(storedConfig.id, payload)
        : base44.entities.BillingConfig.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingConfig"] });
      alert("Billing rules saved.");
    },
  });

  const saveStore = useMutation({
    mutationFn: () =>
      base44.entities.Company.update(company.id, {
        billing_status: billing.billing_status,
        billing_cycle: billing.billing_cycle,
        activation_fee: Number(billing.activation_fee) || 0,
        activation_paid: !!billing.activation_paid,
        subscription_amount: billing.subscription_amount === "" ? undefined : Number(billing.subscription_amount),
        next_billing_date: billing.next_billing_date || undefined,
        billing_override: !!billing.billing_override,
        billing_notes: billing.billing_notes || "",
        status: STATUS_FOR_BILLING[billing.billing_status] || "active",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["companies_check"] });
      alert("Store billing updated.");
    },
  });

  const set = (field) => (value) => setBilling((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-4">
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            Billing system (developer only)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-semibold text-slate-700">Activation fee ($)</Label>
              <Input
                type="number"
                step="0.01"
                className="mt-1"
                value={rules.activation_fee}
                onChange={(e) => setRules({ ...rules, activation_fee: e.target.value })}
              />
              <p className="text-xs text-slate-500 mt-1">Charged once when a store signs up</p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-slate-700">Annual price ($)</Label>
              <Input
                type="number"
                step="0.01"
                className="mt-1"
                value={rules.annual_price}
                onChange={(e) => setRules({ ...rules, annual_price: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold text-slate-700">Monthly price ($)</Label>
              <Input
                type="number"
                step="0.01"
                className="mt-1"
                value={rules.monthly_price}
                onChange={(e) => setRules({ ...rules, monthly_price: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 p-3 border rounded-lg bg-slate-50">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                className="w-4 h-4 accent-blue-600"
                checked={!!rules.trials_enabled}
                onChange={(e) => setRules({ ...rules, trials_enabled: e.target.checked })}
              />
              Allow free trials
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="w-20 h-8"
                value={rules.trial_days}
                onChange={(e) => setRules({ ...rules, trial_days: e.target.value })}
                disabled={!rules.trials_enabled}
              />
              <span className="text-sm text-slate-600">days</span>
            </div>
            <p className="text-xs text-slate-500">Off by default — every store pays before it opens.</p>
          </div>

          <div>
            <Label className="text-sm font-semibold text-slate-700">Payment instructions for tenants</Label>
            <Textarea
              className="mt-1"
              rows={3}
              placeholder="e.g. Bank name, account number, or a payment link — shown on the activation screen"
              value={rules.payment_instructions || ""}
              onChange={(e) => setRules({ ...rules, payment_instructions: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-slate-700">Annual checkout link</Label>
              <Input
                className="mt-1"
                placeholder="https://paystack.com/pay/… or buy.stripe.com/…"
                value={rules.checkout_url_annual || ""}
                onChange={(e) => setRules({ ...rules, checkout_url_annual: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold text-slate-700">Monthly checkout link</Label>
              <Input
                className="mt-1"
                placeholder="https://paystack.com/pay/… or buy.stripe.com/…"
                value={rules.checkout_url_monthly || ""}
                onChange={(e) => setRules({ ...rules, checkout_url_monthly: e.target.value })}
              />
            </div>
            <p className="text-xs text-slate-500 sm:col-span-2">
              Paste the hosted payment page for each plan — a tenant who selects a plan is sent straight
              to it with their store reference attached.
            </p>
          </div>

          <Button onClick={() => saveRules.mutate()} disabled={saveRules.isPending}>
            {saveRules.isPending ? "Saving..." : "Save billing rules"}
          </Button>
        </CardContent>
      </Card>

      {company && (
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="text-base">
              Store override — {company.store_name || company.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold text-slate-700">Billing status</Label>
                <DrawerSelect
                  value={billing.billing_status}
                  onValueChange={set("billing_status")}
                  options={STATUS_OPTIONS}
                  label="Billing status"
                  triggerClassName="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700">Billing cycle</Label>
                <DrawerSelect
                  value={billing.billing_cycle}
                  onValueChange={set("billing_cycle")}
                  options={CYCLE_OPTIONS}
                  label="Billing cycle"
                  triggerClassName="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700">Activation fee for this store ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="mt-1"
                  value={billing.activation_fee}
                  onChange={(e) => set("activation_fee")(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700">Amount charged per cycle ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="mt-1"
                  placeholder="Uses the plan price when empty"
                  value={billing.subscription_amount}
                  onChange={(e) => set("subscription_amount")(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700">Paid through</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={billing.next_billing_date}
                  onChange={(e) => set("next_billing_date")(e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-1">The store locks after this date until renewed</p>
              </div>
              <div className="flex flex-col gap-2 justify-center">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-blue-600"
                    checked={billing.activation_paid}
                    onChange={(e) => set("activation_paid")(e.target.checked)}
                  />
                  Activation fee received
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-purple-600"
                    checked={billing.billing_override}
                    onChange={(e) => set("billing_override")(e.target.checked)}
                  />
                  Waive billing for this store
                </label>
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-slate-700">Billing notes</Label>
              <Textarea
                className="mt-1"
                rows={2}
                placeholder="Payment dates, agreed discounts, who confirmed it..."
                value={billing.billing_notes}
                onChange={(e) => set("billing_notes")(e.target.value)}
              />
            </div>

            <Button
              onClick={() => saveStore.mutate()}
              disabled={saveStore.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saveStore.isPending ? "Saving..." : "Save store billing"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}