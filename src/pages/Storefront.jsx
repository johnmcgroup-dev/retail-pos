import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Package, Phone, Mail, MessageCircle, MapPin } from "lucide-react";
import StorefrontSearchBar from "@/components/storefront/StorefrontSearchBar";
import StorefrontProductCard from "@/components/storefront/StorefrontProductCard";

/**
 * A tenant's public shop page: advertises the products the store has published,
 * with a live search, and points shoppers to the store to buy.
 */
export default function Storefront() {
  const { slug } = useParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: stores = [], isLoading: storeLoading } = useQuery({
    queryKey: ["publicStore", slug],
    queryFn: () => base44.entities.OnlineStore.filter({ store_url: slug, is_active: true }),
  });
  const store = stores[0];

  const { data: listings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ["storefrontListings", slug],
    // Reads the whole published catalogue page by page, so the search can see
    // every product however large the shop is.
    queryFn: async () => {
      let all = [];
      let cursor;
      for (let i = 0; i < 8; i += 1) {
        const page = await base44.entities.StorefrontListing.filter(
          { store_slug: slug, is_active: true },
          { sort: "name", limit: 300, cursor }
        );
        all = all.concat(page.items ?? []);
        if (!page.has_more || !page.next_cursor) break;
        cursor = page.next_cursor;
      }
      return all;
    },
    enabled: !!slug,
  });

  const accent = store?.theme_color || "#3b82f6";
  const currency = store?.currency || "NGN";

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(listings.map((l) => l.category).filter(Boolean)))],
    [listings]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return listings.filter((l) => {
      if (category !== "all" && l.category !== category) return false;
      if (!term) return true;
      return [l.name, l.category, l.description].some((v) => (v || "").toLowerCase().includes(term));
    });
  }, [listings, search, category]);

  if (storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700">Store Not Found</h2>
          <p className="text-slate-500 mt-1">This shop is unavailable or inactive.</p>
        </div>
      </div>
    );
  }

  const whatsapp = (store.contact_phone || "").replace(/[^\d]/g, "");

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Hero */}
      <header
        className="text-white px-4 pt-7 pb-6 safe-area-top"
        style={{ background: `linear-gradient(140deg, ${accent}, ${accent}cc)` }}
      >
        <div className="max-w-5xl mx-auto flex items-start gap-3">
          {store.logo_url ? (
            <img
              src={store.logo_url}
              alt={store.store_name}
              className="w-14 h-14 rounded-xl object-cover bg-white/20 flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Package className="w-7 h-7 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl md:text-3xl font-bold leading-tight">{store.store_name}</h1>
            {store.description && (
              <p className="text-sm opacity-90 mt-1 line-clamp-2">{store.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {store.contact_phone && (
                <a
                  href={`tel:${store.contact_phone}`}
                  className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-full px-3 py-1.5 text-xs font-semibold"
                >
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>
              )}
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-full px-3 py-1.5 text-xs font-semibold"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
              )}
              {store.contact_email && (
                <a
                  href={`mailto:${store.contact_email}`}
                  className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-full px-3 py-1.5 text-xs font-semibold"
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Search + categories */}
      <div className="max-w-5xl mx-auto px-4 pt-4 pb-3 space-y-3 sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
        <StorefrontSearchBar
          value={search}
          onChange={setSearch}
          resultCount={filtered.length}
          totalCount={listings.length}
        />
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  category === cat
                    ? "text-white border-transparent shadow-sm"
                    : "bg-white text-slate-600 border-slate-200"
                }`}
                style={category === cat ? { backgroundColor: accent } : undefined}
              >
                {cat === "all" ? "All products" : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Products */}
      <div className="max-w-5xl mx-auto px-4">
        {listingsLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-14 h-14 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">This shop hasn't published its products yet.</p>
            <p className="text-slate-400 text-sm mt-1">Please check back soon.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-14 h-14 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No products match “{search.trim()}”</p>
            <button
              onClick={() => {
                setSearch("");
                setCategory("all");
              }}
              className="mt-3 text-sm font-semibold underline"
              style={{ color: accent }}
            >
              Show all products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map((listing) => (
              <StorefrontProductCard
                key={listing.id}
                listing={listing}
                currency={currency}
                accent={accent}
              />
            ))}
          </div>
        )}
      </div>

      {/* How to order */}
      <div className="max-w-5xl mx-auto px-4 mt-8">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="font-semibold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4" style={{ color: accent }} />
            How to order
          </p>
          <p className="text-sm text-slate-600 mt-1">
            Visit {store.store_name}
            {store.contact_phone ? ` or call ${store.contact_phone}` : ""} to place your order. Prices shown are
            in-store prices and stock changes daily.
          </p>
        </div>
      </div>

      {store.return_policy && (
        <div className="max-w-5xl mx-auto px-4 mt-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">Returns</p>
            <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{store.return_policy}</p>
          </div>
        </div>
      )}

      <footer className="mt-8 text-center text-xs text-slate-400 px-4">
        <p className="font-semibold text-slate-600">{store.store_name}</p>
        {store.contact_phone && <p className="mt-1">{store.contact_phone}</p>}
      </footer>
    </div>
  );
}