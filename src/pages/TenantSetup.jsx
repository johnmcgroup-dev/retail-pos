import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, ArrowRight, Store, Package, CheckCircle2, Loader2 } from "lucide-react";
import { BILLING_DEFAULTS, money, priceFor } from "@/lib/billing";
import SetupWalkthrough from "@/components/billing/SetupWalkthrough";

const SEED_STEPS = [
  "Creating your store...",
  "Preparing your workspace...",
  "Almost done...",
];

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function TenantSetup({ onComplete }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    store_name: "",
    store_address: "",
    type: "retail_store",
    phone: "",
    email: "",
    address: "",
    currency: "NGN",
  });

  const storeName = (form.store_name || form.name).trim();
  const slug = slugify(storeName);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setStep(0);

    try {
      // Store names are unique across the platform — the public store link is
      // built from this name, so no two tenants may share it.
      const clash = await base44.entities.Company.filter({ store_slug: slug });
      if (clash && clash.length > 0) {
        setError("That store name is already taken — please choose another.");
        setLoading(false);
        return;
      }

      const configs = await base44.entities.BillingConfig.list();
      const config = { ...BILLING_DEFAULTS, ...(configs[0] || {}) };

      const company = await base44.entities.Company.create({
        ...form,
        name: form.name || storeName,
        store_name: storeName,
        store_slug: slug,
        // No free trial and no setup fee: the store opens once the tenant's
        // subscription is confirmed. Only the monthly and annual plans are sold,
        // so a new store starts on the monthly plan.
        status: "pending_payment",
        billing_status: "pending_activation",
        billing_cycle: "monthly",
        activation_fee: config.activation_fee,
        activation_paid: false,
        subscription_plan: "none",
      });

      // Persist company_id on the user so RLS can authorize Sale creation.
      // Whoever creates a store owns it — without this the sign-up account stays
      // a plain 'user' and never gets to the billing plan picker.
      await base44.auth.updateMe({ company_id: company.id, role_level: "owner" });

      setStep(1);
      await new Promise(r => setTimeout(r, 500));

      setStep(2);
      await new Promise(r => setTimeout(r, 400));

      onComplete?.();
    } catch (err) {
      console.error(err);
      setError("Could not create your store. Please check the details and try again.");
      setLoading(false);
      setStep(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-xl mb-6">
            <Package className="w-8 h-8 text-white animate-bounce" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Setting up your store</h2>
          <p className="text-slate-500 text-sm mb-8">Please wait while we prepare everything for you...</p>

          <div className="space-y-3">
            {SEED_STEPS.map((label, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                i < step ? "bg-green-50 border-green-200" :
                i === step ? "bg-blue-50 border-blue-200" :
                "bg-white border-slate-200 opacity-40"
              }`}>
                {i < step ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : i === step ? (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0" />
                )}
                <span className={`text-sm font-medium ${
                  i < step ? "text-green-700" :
                  i === step ? "text-blue-700" :
                  "text-slate-400"
                }`}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-xl mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome to My Retailer Pro</h1>
          <p className="text-slate-500 mt-2 text-sm">Create your own store so we can get you started</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1 text-xs text-green-700">
            <Package className="w-3 h-3" />
            Your store starts empty — add your own products anytime
          </div>
        </div>

        <div className="mb-4">
          <SetupWalkthrough stage={1} compact />
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-blue-500" />
              Store & Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="store_name" className="text-sm font-medium">Store Name *</Label>
                <Input
                  id="store_name"
                  placeholder="e.g. Ace Supermarket Lekki"
                  value={form.store_name}
                  onChange={e => setForm({ ...form, store_name: e.target.value })}
                  required
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Unique to this store and shown to customers{slug ? ` · ${slug}` : ""}
                </p>
              </div>

              <div>
                <Label htmlFor="store_address" className="text-sm font-medium">Store Address</Label>
                <Input
                  id="store_address"
                  placeholder="123 Main Street, Lagos"
                  value={form.store_address}
                  onChange={e => setForm({ ...form, store_address: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="name" className="text-sm font-medium">Business / Owner Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Ace Holdings Ltd"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="type" className="text-sm font-medium">Business Type *</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail_store">Retail Store</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+234..."
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="currency" className="text-sm font-medium">Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NGN">NGN — Naira</SelectItem>
                      <SelectItem value="USD">USD — Dollar</SelectItem>
                      <SelectItem value="GBP">GBP — Pound</SelectItem>
                      <SelectItem value="EUR">EUR — Euro</SelectItem>
                      <SelectItem value="GHS">GHS — Cedi</SelectItem>
                      <SelectItem value="KES">KES — Shilling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium">Business Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="business@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="mt-1"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</p>
              )}

              <Button
                type="submit"
                disabled={!storeName || !form.name || loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 mt-2"
              >
                Create Store & Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <p className="text-center text-xs text-slate-500 mt-2">
                No setup fee — {money(priceFor("monthly"))}/month or {money(priceFor("annual"))}/year.
                You choose your plan on the next screen.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}