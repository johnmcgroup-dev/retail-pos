import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import SubscriptionCard from "@/components/dashboard/SubscriptionCard";
import SalesTrendChart from "@/components/dashboard/SalesTrendChart";

/**
 * Subscription status together with this store's sales trend — the tenant's
 * running history, read from the real Sale records the dashboard already loads.
 */
export default function SubscriptionTrendsSection({ company, sales = [], currency = "NGN", showSymbol = true }) {
  const { data: config = null } = useQuery({
    queryKey: ["billing_config"],
    queryFn: async () => {
      const rows = await base44.entities.BillingConfig.list();
      return rows[0] || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!company) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 items-stretch">
      <SubscriptionCard company={company} config={config} />
      <SalesTrendChart sales={sales} currency={currency} showSymbol={showSymbol} />
    </div>
  );
}