import React from "react";
import { format } from "date-fns";
import { ArrowUpRight, Gift, History as HistoryIcon } from "lucide-react";

const styleFor = (type) => {
  if (type === "earned") return "bg-green-100 text-green-600";
  if (type === "redeemed") return "bg-purple-100 text-purple-600";
  return "bg-slate-100 text-slate-600";
};

export default function LoyaltyHistory({ transactions = [] }) {
  if (!transactions.length) {
    return (
      <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl">
        <HistoryIcon className="w-10 h-10 text-slate-200 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No points activity yet.</p>
      </div>
    );
  }

  return (
    <div className="divide-y rounded-lg border border-slate-200 bg-white overflow-hidden">
      {transactions.map((t) => (
        <div key={t.id} className="flex items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${styleFor(t.transaction_type)}`}>
              {t.transaction_type === "earned" ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <Gift className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {t.description || t.transaction_type}
              </p>
              <p className="text-xs text-slate-500">
                {t.transaction_date ? format(new Date(t.transaction_date), "MMM d, yyyy h:mm a") : ""}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className={`text-sm font-bold ${t.points > 0 ? "text-green-600" : "text-purple-600"}`}>
              {t.points > 0 ? "+" : ""}
              {t.points}
            </p>
            <p className="text-[11px] text-slate-400">Bal {t.balance_after}</p>
          </div>
        </div>
      ))}
    </div>
  );
}