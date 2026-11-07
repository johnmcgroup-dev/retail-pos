import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import BillingPanel from "@/components/settings/BillingPanel";
import { Loader2 } from "lucide-react";

/** Owner-facing subscription page — status, amounts and plan switching. */
export default function Subscription() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
    enabled: !!user,
  });

  const myId = user?.company_id || user?.tenant_id;
  const company = (myId && companies.find((c) => c.id === myId)) || companies[0];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">My Subscription</h1>
        <p className="text-slate-500 mt-1">Your store plan, billing dates and payment status</p>
      </div>

      {isLoading || !user ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      ) : (
        <BillingPanel company={company} />
      )}
    </div>
  );
}