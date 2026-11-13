import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import GrowthStatCard from "@/components/growth/GrowthStatCard";
import { format, subDays } from "date-fns";

const DAY = 86400000;
const daysAgo = (days) => new Date(Date.now() - days * DAY).toISOString();

function pctChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function inside(record, sinceDays, untilDays = 0) {
  const created = new Date(record.created_date).getTime();
  if (!Number.isFinite(created)) return false;
  return created >= Date.now() - sinceDays * DAY && created < Date.now() - untilDays * DAY;
}

export default function Growth() {
  const { data, isLoading } = useQuery({
    queryKey: ["growth-stats"],
    queryFn: async () => {
      const safeAggregate = (query, groupBy) =>
        base44.entities.Sale.aggregate({ query, groupBy }).catch(() => ({ rows: [] }));

      const [users, companies, sellersNow, sellersBefore, storesNow] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Company.list(),
        safeAggregate({ sale_date: { $gte: daysAgo(30) } }, "created_by_id"),
        safeAggregate({ sale_date: { $gte: daysAgo(60), $lt: daysAgo(30) } }, "created_by_id"),
        safeAggregate({ sale_date: { $gte: daysAgo(30) } }, "company_id"),
      ]);

      return {
        users,
        companies,
        sellersNow: sellersNow.rows?.length || 0,
        sellersBefore: sellersBefore.rows?.length || 0,
        storesNow: storesNow.rows?.length || 0,
      };
    },
  });

  const stats = useMemo(() => {
    const users = data?.users || [];
    const companies = data?.companies || [];
    const owners = new Set(companies.map((c) => c.created_by_id));
    const new30 = users.filter((u) => inside(u, 30)).length;
    const prev30 = users.filter((u) => inside(u, 60, 30)).length;
    const new7 = users.filter((u) => inside(u, 7)).length;
    const prev7 = users.filter((u) => inside(u, 14, 7)).length;
    return {
      total: users.length,
      new30,
      prev30,
      new7,
      prev7,
      owners: owners.size,
      stores: companies.length,
      paying: companies.filter(
        (c) => c.billing_status === "active" && !c.billing_override
      ).length,
    };
  }, [data]);

  const weekly = useMemo(() => {
    const users = data?.users || [];
    return Array.from({ length: 8 }, (_, index) => {
      const weeksBack = 7 - index;
      const start = subDays(new Date(), weeksBack * 7 + 6);
      const end = subDays(new Date(), weeksBack * 7);
      const count = users.filter((user) => {
        const created = new Date(user.created_date);
        return created >= start && created <= end;
      }).length;
      return { label: format(end, "d MMM"), count };
    });
  }, [data]);

  const recent = useMemo(
    () =>
      [...(data?.users || [])]
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 8),
    [data]
  );

  const storeOf = (user) =>
    (data?.companies || []).find((c) => c.created_by_id === user.id)?.store_name ||
    (data?.companies || []).find((c) => c.created_by_id === user.id)?.name ||
    "No store yet";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const peak = Math.max(...weekly.map((w) => w.count), 1);

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-lg md:text-2xl font-bold text-slate-900">Growth</h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Who signs up, who opens a store, and who actually sells — across every tenant.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
        <GrowthStatCard
          title="Signups"
          value={stats.total}
          unit="accounts"
          percent={stats.total ? (stats.owners / stats.total) * 100 : 0}
          goalLabel={`${stats.owners} opened a store`}
          trend={{
            change: pctChange(stats.new30, stats.prev30),
            label: `${Math.abs(pctChange(stats.new30, stats.prev30))}% vs prev 30d`,
          }}
          detail="Everyone who created an account on the platform."
          defaultOpen
        />
        <GrowthStatCard
          title="New signups"
          value={stats.new30}
          unit="last 30 days"
          percent={stats.total ? (stats.new30 / stats.total) * 100 : 0}
          goalLabel={`${stats.new7} in the last 7 days`}
          trend={{
            change: pctChange(stats.new7, stats.prev7),
            label: `${Math.abs(pctChange(stats.new7, stats.prev7))}% week on week`,
          }}
          detail="Accounts created in the last 30 days."
        />
        <GrowthStatCard
          title="Active users"
          value={data?.sellersNow || 0}
          unit="rang up sales"
          percent={stats.total ? ((data?.sellersNow || 0) / stats.total) * 100 : 0}
          goalLabel={`of ${stats.total} accounts, last 30 days`}
          trend={{
            change: pctChange(data?.sellersNow || 0, data?.sellersBefore || 0),
            label: `${Math.abs(pctChange(data?.sellersNow || 0, data?.sellersBefore || 0))}% vs prev 30d`,
          }}
          detail="Distinct staff accounts that recorded a sale in the last 30 days."
        />
        <GrowthStatCard
          title="Active stores"
          value={data?.storesNow || 0}
          unit={`of ${stats.stores}`}
          percent={stats.stores ? ((data?.storesNow || 0) / stats.stores) * 100 : 0}
          goalLabel={`${stats.paying} paying subscriptions`}
          detail="Stores that recorded at least one sale in the last 30 days."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Signups per week</h2>
          <p className="text-xs text-slate-500 mt-0.5">The last eight weeks</p>
          <div className="flex items-end gap-1.5 md:gap-2 h-32 md:h-40 mt-4">
            {weekly.map((week) => (
              <div key={week.label} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-medium text-slate-500 tabular-nums">
                  {week.count || ""}
                </span>
                <div
                  className="w-full rounded-t-md bg-blue-500/80 min-h-[3px] transition-all"
                  style={{ height: `${(week.count / peak) * 100}%` }}
                  title={`${week.count} signups`}
                />
                <span className="text-[9px] md:text-[10px] text-slate-400">{week.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 pb-2">
            <h2 className="text-sm font-semibold text-slate-900">Latest signups</h2>
            <p className="text-xs text-slate-500 mt-0.5">Newest accounts first</p>
          </div>
          <div className="divide-y divide-slate-100">
            {recent.length === 0 && (
              <p className="px-4 py-6 text-xs text-slate-500">No signups yet.</p>
            )}
            {recent.map((user) => (
              <div key={user.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
                  {(user.full_name || user.email || "U")[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm font-medium text-slate-900 truncate">
                    {user.full_name || user.email}
                  </p>
                  <p className="text-[10px] md:text-xs text-slate-500 truncate">{storeOf(user)}</p>
                </div>
                <span className="text-[10px] md:text-xs text-slate-400 flex-shrink-0">
                  {user.created_date ? format(new Date(user.created_date), "d MMM") : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}