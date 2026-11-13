import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { placementLabel } from "@/lib/adPricing";
import { formatCurrency } from "@/components/utils";
import { Check, Megaphone, X } from "lucide-react";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  expired: "bg-slate-100 text-slate-600 border-slate-200",
};

const FILTERS = ["pending", "approved", "rejected", "all"];

export default function FeaturedAds() {
  const [filter, setFilter] = useState("pending");

  const { data: ads = [], isLoading, refetch } = useQuery({
    queryKey: ["all-product-ads"],
    queryFn: async () => {
      const page = await base44.entities.ProductAd.list({ sort: "-created_date", limit: 200 });
      return page.items || [];
    },
  });

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const visible = useMemo(
    () => (filter === "all" ? ads : ads.filter((ad) => ad.status === filter)),
    [ads, filter]
  );

  const pendingValue = ads
    .filter((ad) => ad.status === "pending")
    .reduce((sum, ad) => sum + (Number(ad.price) || 0), 0);

  const review = async (ad, status) => {
    const starts = status === "approved" ? new Date() : null;
    const ends = new Date();
    if (starts) ends.setDate(ends.getDate() + (Number(ad.duration_days) || 7));

    await base44.entities.ProductAd.update(ad.id, {
      status,
      reviewed_by: me.data?.email,
      ...(status === "approved"
        ? {
            starts_on: format(starts, "yyyy-MM-dd"),
            ends_on: format(ends, "yyyy-MM-dd"),
          }
        : {}),
    });
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-purple-600" />
            Featured ads
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Tenant product promotions waiting for your approval.
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-amber-700">Awaiting review</p>
          <p className="text-sm font-bold text-amber-900">
            {ads.filter((ad) => ad.status === "pending").length} · {formatCurrency(pendingValue, "NGN")}
          </p>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap transition-colors ${
              filter === option
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {option}
            {option !== "all" && ` (${ads.filter((ad) => ad.status === option).length})`}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-xs md:text-sm text-slate-500">
          Nothing here right now.
        </p>
      ) : (
        <div className="space-y-2.5 md:space-y-3">
          {visible.map((ad) => (
            <div
              key={ad.id}
              className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                {ad.image_url ? (
                  <img
                    src={ad.image_url}
                    alt={ad.product_name}
                    className="w-12 h-12 md:w-14 md:h-14 rounded-xl object-cover flex-shrink-0 bg-slate-100"
                  />
                ) : (
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Megaphone className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{ad.product_name}</p>
                      <p className="text-[11px] md:text-xs text-slate-500 truncate">
                        {ad.company_name || "Tenant"} · {placementLabel(ad.placement)}
                      </p>
                    </div>
                    <Badge className={`capitalize border flex-shrink-0 ${STATUS_STYLES[ad.status] || STATUS_STYLES.pending}`}>
                      {ad.status}
                    </Badge>
                  </div>
                  {ad.headline && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{ad.headline}</p>
                  )}
                  <p className="text-[11px] text-slate-500 mt-1">
                    {formatCurrency(ad.price, "NGN")} · {ad.duration_days} days
                    {ad.payment_reference ? ` · ref ${ad.payment_reference}` : ""}
                    {ad.requested_at ? ` · asked ${format(new Date(ad.requested_at), "d MMM")}` : ""}
                  </p>
                  {ad.notes && <p className="text-[11px] text-slate-500 italic mt-1">"{ad.notes}"</p>}
                </div>
              </div>

              {ad.status === "pending" && (
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => review(ad, "approved")}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    Approve & schedule
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => review(ad, "rejected")}
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-1.5" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}