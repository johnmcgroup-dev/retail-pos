import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard, LogOut, Loader2, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function TrialExpired({ company }) {
  const [loading, setLoading] = useState(null);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handlePayment = async (plan) => {
    if (window.self !== window.top) {
      toast.error("Checkout works only from the published app. Please open the app in a new tab.");
      return;
    }
    setLoading(plan);
    try {
      const response = await base44.functions.invoke('createCheckoutSession', { plan });
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        toast.error("Failed to start checkout. Please try again.");
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error("Could not start payment. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      id: "monthly",
      name: "Monthly",
      price: company?.monthly_price ?? 5,
      period: "/month",
      subtitle: "Billed monthly",
      highlight: false,
    },
    {
      id: "yearly",
      name: "Yearly",
      price: company?.yearly_price ?? 57,
      period: "/year",
      subtitle: "Best recurring value",
      highlight: true,
    },
    {
      id: "one_time",
      name: "Lifetime",
      price: company?.one_time_price ?? 360,
      period: " one-time",
      subtitle: "Pay once, use forever",
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-orange-500 p-8 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Trial Period Over</h1>
          <p className="text-white/80 mt-2">Your 90-day free trial has ended</p>
        </div>
        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-slate-600">
              To continue using <span className="font-semibold">{company?.name || "My Retailer Pro"}</span>,
              choose a plan below to activate your subscription.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map(plan => (
              <button
                key={plan.id}
                onClick={() => handlePayment(plan.id)}
                disabled={!!loading}
                className={`relative rounded-xl p-5 text-center transition-all disabled:opacity-50 ${
                  plan.highlight
                    ? "border-2 border-blue-500 bg-blue-50 hover:bg-blue-100"
                    : "border-2 border-slate-200 hover:border-slate-400"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Best Value
                  </span>
                )}
                <p className="text-sm font-semibold text-slate-700">{plan.name}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">${plan.price}</p>
                <p className="text-xs text-slate-500">{plan.period}</p>
                <p className="text-xs text-slate-400 mt-1">{plan.subtitle}</p>
                {loading === plan.id && <Loader2 className="w-4 h-4 animate-spin mx-auto mt-2" />}
              </button>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
            <p className="text-xs text-amber-700">
              <span className="font-semibold">Trial offer:</span> Get started for just ${company?.first_month_price ?? 1} for your first 90 days on the monthly plan.
            </p>
          </div>

          <Button
            onClick={() => handlePayment('yearly')}
            disabled={!!loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Redirecting...</>
            ) : (
              <><CreditCard className="w-5 h-5 mr-2" /> Pay Now to Continue</>
            )}
          </Button>
          <Button variant="ghost" onClick={handleLogout} className="w-full text-slate-500">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}