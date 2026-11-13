import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import AdPricingStrip from "@/components/ads/AdPricingStrip";
import AdRequestDialog from "@/components/ads/AdRequestDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/utils";
import { Megaphone, Plus } from "lucide-react";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  expired: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function PromoteProducts() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["product-ads"],
    queryFn: async () => {
      const me = await base44.auth.me();
      const myId = me.company_id || me.tenant_id;
      const companies = myId ? await base44.entities.Company.filter({ id: myId }) : [];
      const company = companies[0] || null;
      const companyId = company?.id || myId;
      if (!companyId) return { company: null, products: [], ads: [] };

      const [productPage, adPage] = await Promise.all([
        base44.entities.Product.filter(
          { company_id: companyId, status: "active" },
          { sort: "name", limit: 200 }
        ),
        base44.entities.ProductAd.filter(
          { company_id: companyId },
          { sort: "-created_date", limit: 50 }
        ),
      ]);

      return { company, products: productPage.items || [], ads: adPage.items || [] };
    },
  });

  const company = data?.company;
  const currency = company?.currency || "NGN";
  const showSymbol = company?.show_currency_symbol !== false;
  const ads = data?.ads || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blue-600" />
            Promote products
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Put a product in front of more buyers. Choose a placement, we confirm your payment and switch it on.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          disabled={!company || (data?.products || []).length === 0}
          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Request a promotion
        </Button>
      </div>

      <AdPricingStrip currency={currency} showSymbol={showSymbol} />

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 pb-2">
          <h2 className="text-sm font-semibold text-slate-900">My requests</h2>
          <p className="text-xs text-slate-500 mt-0.5">Every promotion you have asked for</p>
        </div>

        {ads.length === 0 ? (
          <p className="px-4 py-8 text-xs md:text-sm text-slate-500">
            No promotions yet — request one and it appears here while we review it.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {ads.map((ad) => (
              <div key={ad.id} className="p-3 md:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{ad.product_name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {ad.headline || "No selling line"} · {String(ad.placement || "").replace(/_/g, " ")}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrency(ad.price, currency, showSymbol)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {ad.duration_days} days
                      {ad.starts_on ? ` · from ${format(new Date(ad.starts_on), "d MMM")}` : ""}
                    </p>
                  </div>
                  <Badge className={`capitalize border ${STATUS_STYLES[ad.status] || STATUS_STYLES.pending}`}>
                    {ad.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {company && (
        <AdRequestDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          products={data?.products || []}
          company={company}
          currency={currency}
          showSymbol={showSymbol}
          onSubmitted={refetch}
        />
      )}
    </div>
  );
}