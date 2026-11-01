import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, RefreshCw, CheckCircle2 } from "lucide-react";

/**
 * Copies the tenant's active products (and their live stock) onto the public
 * shop page. Only showcase fields are copied — cost prices stay private.
 */
export default function PublishCatalogCard({ companyId, storeSlug }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const { data: listings = [] } = useQuery({
    queryKey: ["storefrontListingsAdmin", storeSlug],
    queryFn: () => base44.entities.StorefrontListing.filter({ store_slug: storeSlug, is_active: true }),
    select: (page) => page.items ?? page,
    enabled: !!storeSlug,
  });

  const publish = async () => {
    setBusy(true);
    setResult(null);
    try {
      const products = await base44.entities.Product.filter({ company_id: companyId, status: "active" });
      const inventory = await base44.entities.Inventory.filter({ company_id: companyId });
      const existing = await base44.entities.StorefrontListing.filter({ store_slug: storeSlug });

      const stock = {};
      inventory.forEach((i) => {
        stock[i.product_id] = (stock[i.product_id] || 0) + (i.quantity || 0);
      });

      const pending = new Map((existing.items ?? existing).map((l) => [l.product_id, l]));
      const toCreate = [];
      const toUpdate = [];

      products.forEach((p) => {
        const qty = stock[p.id] || 0;
        const payload = {
          company_id: companyId,
          store_slug: storeSlug,
          product_id: p.id,
          name: p.name,
          description: p.description || "",
          category: p.category || "",
          price: p.selling_price || 0,
          image_url: p.image_url || "",
          in_stock: qty,
          is_active: qty > 0,
          published_at: new Date().toISOString(),
        };
        const match = pending.get(p.id);
        if (match) {
          toUpdate.push({ id: match.id, ...payload });
          pending.delete(p.id);
        } else if (qty > 0) {
          toCreate.push(payload);
        }
      });

      // Products removed or renamed away are taken off the shop page.
      pending.forEach((l) => {
        if (l.is_active) toUpdate.push({ id: l.id, is_active: false });
      });

      if (toCreate.length) await base44.entities.StorefrontListing.bulkCreate(toCreate);
      if (toUpdate.length) await base44.entities.StorefrontListing.bulkUpdate(toUpdate);

      setResult(products.filter((p) => (stock[p.id] || 0) > 0).length);
      queryClient.invalidateQueries({ queryKey: ["storefrontListingsAdmin", storeSlug] });
      queryClient.invalidateQueries({ queryKey: ["storefrontListings", storeSlug] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-indigo-200 bg-indigo-50/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="w-4 h-4 text-indigo-600" />
          Shop catalogue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">
          Your public shop currently advertises <span className="font-semibold text-slate-900">{listings.length}</span>{" "}
          product{listings.length === 1 ? "" : "s"}. Publish again whenever prices or stock change.
        </p>
        <Button onClick={publish} disabled={busy || !storeSlug} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
          {busy ? "Publishing..." : "Publish / refresh catalogue"}
        </Button>
        {result !== null && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            {result} product{result === 1 ? "" : "s"} are now live on your shop page.
          </p>
        )}
        {!storeSlug && (
          <p className="text-sm text-amber-700">Save a store URL slug first, then publish.</p>
        )}
      </CardContent>
    </Card>
  );
}