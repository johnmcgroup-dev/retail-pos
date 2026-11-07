import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award } from "lucide-react";
import { tierProgress } from "@/lib/loyalty";
import CustomerLoyaltyDialog from "@/components/customers/CustomerLoyaltyDialog";

export default function MembersList({ customers = [], program, companyId }) {
  const [activeId, setActiveId] = useState(null);
  const active = customers.find((c) => c.id === activeId) || null;
  const ordered = [...customers].sort(
    (a, b) => (b.loyalty_points || 0) - (a.loyalty_points || 0)
  );

  if (!ordered.length) {
    return (
      <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
        <Award className="w-10 h-10 text-slate-200 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No customers yet — add customers to enrol them.</p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y rounded-lg border border-slate-200 bg-white overflow-hidden">
        {ordered.map((customer) => {
          const { current, next, percent, pointsToNext } = tierProgress(
            program,
            customer.loyalty_points || 0
          );
          return (
            <div key={customer.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">
                    {(customer.name || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{customer.name}</p>
                  <p className="text-xs text-slate-500 truncate">{customer.phone || customer.email || "—"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:w-[46%]">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs mb-1">
                    <Badge variant="secondary" className="text-[10px]">{current?.name}</Badge>
                    <span className="text-slate-500">
                      {next ? `${pointsToNext} to ${next.name}` : "Top tier"}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
                <p className="text-sm font-bold text-purple-600 w-16 text-right flex-shrink-0">
                  {customer.loyalty_points || 0} pts
                </p>
              </div>

              <Button variant="outline" size="sm" onClick={() => setActiveId(customer.id)}>
                View
              </Button>
            </div>
          );
        })}
      </div>

      <CustomerLoyaltyDialog
        open={!!active}
        onClose={() => setActiveId(null)}
        customer={active}
        companyId={companyId}
      />
    </>
  );
}