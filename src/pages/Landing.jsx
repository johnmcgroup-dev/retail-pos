import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Store, Users, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

/**
 * Landing page — smart entry point that routes users based on their context:
 *  1. Already authenticated → redirect to /Dashboard
 *  2. Has `?invite=1` or `?ref=...` query param  → "You've been invited" message + login
 *  3. No params → choice: "Start new business" (register) or "Login to existing account"
 */
export default function Landing() {
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState(null); // "invited" | "new" | "returning" | null

  const urlParams = new URLSearchParams(window.location.search);
  const isInvited = urlParams.has("invite") || urlParams.has("ref") || urlParams.has("token");

  useEffect(() => {
    const check = async () => {
      try {
        const authenticated = await base44.auth.isAuthenticated();
        if (authenticated) {
          window.location.href = "/Dashboard";
          return;
        }
      } catch (_) {}
      setChecking(false);
      if (isInvited) setMode("invited");
    };
    check();
  }, []);

  const handleLogin = () => base44.auth.redirectToLogin(window.location.origin + "/Dashboard");
  const handleRegister = () => base44.auth.redirectToLogin(window.location.origin + "/Dashboard");

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // Invited user view
  if (mode === "invited") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl mb-6">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">You've been invited!</h1>
          <p className="text-slate-500 mb-8">
            You've been added to a My Retailer Pro business account. Click below to sign in and get started.
          </p>
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-3">
            <div className="flex items-center gap-3 text-left p-3 bg-green-50 rounded-lg border border-green-100">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <span className="text-sm text-slate-700">Your account is already set up — no setup needed</span>
            </div>
            <Button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-12"
            >
              Sign In to Get Started <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            New user? You'll create a password on first sign-in.
          </p>
        </div>
      </div>
    );
  }

  // Default: choose between new business or existing account
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl shadow-2xl mb-4">
          <div className="relative">
            <span className="text-yellow-300 font-extrabold text-xl">J</span>
            <span className="text-white font-bold text-sm">mt</span>
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-white">My Retailer Pro</h1>
        <p className="text-blue-200 mt-1 text-sm">Smart POS for modern businesses</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {/* New Business */}
        <button
          onClick={handleRegister}
          className="w-full group bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 rounded-2xl p-5 text-left transition-all duration-200 hover:scale-[1.02] active:scale-100"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-base">Start a New Business</p>
              <p className="text-blue-200 text-xs mt-0.5">Register &amp; set up your company — 14-day free trial</p>
            </div>
            <ArrowRight className="w-5 h-5 text-blue-300 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Existing / Invited */}
        <button
          onClick={handleLogin}
          className="w-full group bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 rounded-2xl p-5 text-left transition-all duration-200 hover:scale-[1.02] active:scale-100"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-base">Sign In</p>
              <p className="text-blue-200 text-xs mt-0.5">Existing account or invited by your manager</p>
            </div>
            <ArrowRight className="w-5 h-5 text-blue-300 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      <p className="text-blue-300/60 text-xs mt-10">by JmtSolution · Powered by My Retailer Pro</p>
    </div>
  );
}