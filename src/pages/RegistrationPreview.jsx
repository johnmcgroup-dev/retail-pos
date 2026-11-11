import React, { useState } from "react";
import TenantSetup from "@/pages/TenantSetup";
import BillingGate from "@/pages/BillingGate";
import { Eye, EyeOff } from "lucide-react";

const PREVIEW_STORE = {
  id: "preview-store-0001",
  name: "Ace Holdings Ltd",
  store_name: "Ace Supermarket Lekki",
  store_address: "12 Admiralty Way, Lekki, Lagos",
  email: "owner@acesupermarket.ng",
  billing_status: "pending_activation",
  billing_cycle: "monthly",
  created_by_id: "preview-owner",
};
const PREVIEW_REQUESTED = { ...PREVIEW_STORE, payment_requested_at: new Date().toISOString() };

const STAGES = [
  { id: "create", label: "1 · Create store" },
  { id: "plan", label: "2 · Choose plan" },
  { id: "pay", label: "3 · Payment" },
];

/**
 * Developer-only dry run of what a brand-new tenant sees from registration to
 * payment. It renders the real setup and activation screens in preview mode, so
 * nothing is saved and no payment can be started.
 */
export default function RegistrationPreview() {
  const [stage, setStage] = useState("create");

  return (
    <div className="min-h-[100dvh] bg-slate-100">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur px-3 py-2.5 md:px-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-xs md:text-sm text-slate-600">
            <Eye className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>
              <span className="font-semibold text-slate-900">New tenant walkthrough</span> — preview only, no
              store is created and no payment is taken.
            </span>
          </div>
          <div className="flex gap-1.5 rounded-lg bg-slate-100 p-1">
            {STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStage(s.id)}
                className={`flex-1 rounded-md px-2.5 py-1.5 text-[11px] md:text-xs font-semibold transition-colors ${
                  stage === s.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {stage === "create" && <TenantSetup preview />}
      {stage === "plan" && <BillingGate preview company={PREVIEW_STORE} />}
      {stage === "pay" && <BillingGate preview company={PREVIEW_REQUESTED} />}

      <div className="flex items-center justify-center gap-2 pb-6 text-[11px] text-slate-400">
        <EyeOff className="w-3 h-3" />
        Preview mode — buttons move through the steps without charging or saving anything.
      </div>
    </div>
  );
}