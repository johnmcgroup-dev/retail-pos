import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, ArrowRight, Store, Package, CheckCircle2, Loader2 } from "lucide-react";

const SEED_STEPS = [
  "Creating your business...",
  "Preparing your workspace...",
  "Almost done...",
];

export default function TenantSetup({ onComplete }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    type: "retail_store",
    phone: "",
    email: "",
    address: "",
    currency: "NGN",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStep(0);

    try {
      // Step 1: create company
      const company = await base44.entities.Company.create({
        ...form,
        status: "trial",
        subscription_plan: "trial",
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });

      // Persist company_id on the user so RLS can authorize Sale creation
      await base44.auth.updateMe({ company_id: company.id });

      setStep(1);
      await new Promise(r => setTimeout(r, 500));

      setStep(2);
      await new Promise(r => setTimeout(r, 400));

      onComplete?.();
    } catch (err) {
      console.error(err);
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
          <p className="text-slate-500 mt-2 text-sm">Let's set up your business to get started</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1 text-xs text-green-700">
            <Package className="w-3 h-3" />
            Your store starts empty — add your own products anytime
          </div>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-blue-500" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">Business Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Ace Supermarket"
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

              <div>
                <Label htmlFor="address" className="text-sm font-medium">Address</Label>
                <Input
                  id="address"
                  placeholder="123 Main Street, Lagos"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="mt-1"
                />
              </div>

              <Button
                type="submit"
                disabled={!form.name || loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 mt-2"
              >
                Get Started — 14-Day Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <p className="text-center text-xs text-slate-400 mt-2">
                No credit card required. Full access for 14 days.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}