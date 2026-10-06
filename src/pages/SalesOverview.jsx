import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart3, Loader2 } from "lucide-react";
import RevenueKpis from "@/components/overview/RevenueKpis";
import MonthlyRevenueChart from "@/components/overview/MonthlyRevenueChart";
import TopProductsList from "@/components/overview/TopProductsList";

const monthKey = (date) => `${date.getFullYear()}-${date.getMonth()}`;

// Sales performance at a glance: today's revenue, best sellers, monthly trend.
export default function SalesOverview() {
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });
  const companyId = user?.company_id || user?.tenant_id;

  const { data: company } = useQuery({
    queryKey: ["overview-company", companyId],
    queryFn: async () => (await base44.entities.Company.filter({ id: companyId }))[0],
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000,
  });

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales-overview", companyId],
    queryFn: () => base44.entities.Sale.filter({ company_id: companyId }, "-sale_date", 1000),
    enabled: !!companyId,
  });

  const currency = company?.currency || "NGN";

  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toDateString();
    const thisMonth = monthKey(now);

    let todayRevenue = 0;
    let todayCount = 0;
    let monthRevenue = 0;
    let totalRevenue = 0;
    const monthly = {};
    const byProduct = {};

    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthly[monthKey(month)] = { label: month.toLocaleString("en", { month: "short" }), revenue: 0 };
    }

    (sales || []).forEach((sale) => {
      const date = new Date(sale.sale_date || sale.created_date);
      const amount = Number(sale.total_amount) || 0;
      totalRevenue += amount;

      if (date.toDateString() === today) {
        todayRevenue += amount;
        todayCount += 1;
      }
      if (monthKey(date) === thisMonth) monthRevenue += amount;
      if (monthly[monthKey(date)]) monthly[monthKey(date)].revenue += amount;

      (sale.items || []).forEach((item) => {
        const name = item.product_name || "Unnamed item";
        if (!byProduct[name]) byProduct[name] = { name, quantity: 0, revenue: 0 };
        byProduct[name].quantity += Number(item.quantity) || 0;
        byProduct[name].revenue += Number(item.total) || 0;
      });
    });

    return {
      todayRevenue,
      todayCount,
      monthRevenue,
      avgSale: sales.length ? totalRevenue / sales.length : 0,
      monthly: Object.values(monthly),
      topProducts: Object.values(byProduct).sort((a, b) => b.quantity - a.quantity).slice(0, 5),
    };
  }, [sales]);

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Sales Overview
        </h1>
        <p className="text-sm text-slate-500 mt-1">How the business is performing at a glance</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : (
        <>
          <RevenueKpis
            todayRevenue={stats.todayRevenue}
            todayCount={stats.todayCount}
            monthRevenue={stats.monthRevenue}
            avgSale={stats.avgSale}
            currency={currency}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MonthlyRevenueChart data={stats.monthly} currency={currency} />
            <TopProductsList products={stats.topProducts} currency={currency} />
          </div>
        </>
      )}
    </div>
  );
}