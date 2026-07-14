import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard, LogOut, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function TrialExpired({ company }) {
  const [loading, setLoading] = useState(null);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handlePayment = async (plan) => {
    // Check if running in an iframe — Paystack checkout doesn't work inside iframes
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-orange-500 p-8 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Trial Period Overdue</h1>
          <p className="text-white/80 mt-2">Your 45-day free trial has ended</p>
        </div>
        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-slate-600">
              To continue using <span className="font-semibold">{company?.name || "My Retailer Pro"}</span>,
              payment must be done now to activate your subscription.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handlePayment('monthly')}
              disabled={!!loading}
              className="border-2 border-slate-200 rounded-xl p-4 text-center hover:border-slate-400 transition-colors disabled:opacity-50"
            >
              <p className="text-sm font-semibold text-slate-700">Monthly</p>
              <p className="text-3xl font-bold text-slate-900">${company?.first_month_price ?? 1}</p>
              <p className="text-xs text-slate-500">first month, then ${company?.monthly_price || 9.9}/mo</p>
              {loading === 'monthly' && <Loader2 className="w-4 h-4 animate-spin mx-auto mt-2" />}
            </button>
            <button
              onClick={() => handlePayment('yearly')}
              disabled={!!loading}
              className="border-2 border-blue-500 bg-blue-50 rounded-xl p-4 text-center hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              <p className="text-sm font-semibold text-blue-700">Yearly</p>
              <p className="text-3xl font-bold text-slate-900">${company?.yearly_price || 127}</p>
              <p className="text-xs text-slate-500">per year</p>
              <p className="text-xs text-green-600 font-semibold mt-1">Best value!</p>
              {loading === 'yearly' && <Loader2 className="w-4 h-4 animate-spin mx-auto mt-2" />}
            </button>
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