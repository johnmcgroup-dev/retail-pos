import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Package, ShoppingCart, Phone, Mail } from "lucide-react";
import { formatCurrency } from "@/components/utils";

export default function Storefront() {
  const { slug } = useParams();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: stores = [], isLoading: storeLoading } = useQuery({
    queryKey: ["publicStore", slug],
    queryFn: () => base44.entities.OnlineStore.filter({ store_url: slug, is_active: true }),
  });

  const store = stores[0];

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["publicProducts", store?.company_id],
    queryFn: () => base44.entities.Product.filter({ company_id: store.company_id, status: "active" }),
    enabled: !!store?.company_id,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["publicInventory", store?.company_id],
    queryFn: () => base44.entities.Inventory.filter({ company_id: store.company_id }),
    enabled: !!store?.company_id,
  });

  const stockByProduct = inventory.reduce((acc, inv) => {
    if (inv.quantity > 0) acc[inv.product_id] = (acc[inv.product_id] || 0) + inv.quantity;
    return acc;
  }, {});

  const currency = store?.currency || "NGN";

  const categories = ["all", ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const filtered = products.filter(p => {
    if ((stockByProduct[p.id] || 0) <= 0) return false;
    if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return p.name?.toLowerCase().includes(term) || p.category?.toLowerCase().includes(term);
  });

  if (storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700">Store Not Found</h2>
          <p className="text-slate-500 mt-1">This store is unavailable or inactive.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header
        className="text-white py-5 px-4 shadow-lg"
        style={{ background: `linear-gradient(135deg, ${store.theme_color || '#3b82f6'}, ${store.theme_color || '#3b82f6'}cc)` }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">{store.store_name}</h1>
            {store.description && (
              <p className="text-sm opacity-80 mt-0.5 line-clamp-1">{store.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 opacity-90">
            <ShoppingCart className="w-6 h-6" />
            <span className="text-sm font-semibold hidden md:block">Browse & Order In-Store</span>
          </div>
        </div>
      </header>

      {/* Notice banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
        <p className="text-amber-800 text-sm font-medium">
          📋 Browse our available products — visit us in-store or call to place your order.
        </p>
      </div>

      {/* Search + filter */}
      <div className="max-w-5xl mx-auto px-4 pt-5 pb-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-11 text-base bg-white shadow-sm"
          />
        </div>

        {/* Category pills */}
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all touch-manipulation
                  ${selectedCategory === cat
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                  }`}
              >
                {cat === "all" ? "All Products" : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Grid */}
      <div className="max-w-5xl mx-auto px-4 pb-10">
        {productsLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-14 h-14 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map(product => {
              const stock = stockByProduct[product.id] || 0;
              const isLow = stock <= 5;
              return (
                <div
                  key={product.id}
                  className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden"
                >
                  <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-10 h-10 text-slate-300" />
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="font-semibold text-slate-900 text-sm line-clamp-2 leading-tight min-h-[2.5em]">
                      {product.name}
                    </p>
                    {product.category && (
                      <span className="inline-block text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 mt-1 truncate max-w-full">
                        {product.category}
                      </span>
                    )}
                    <p className={`text-[10px] font-medium mt-1 ${isLow ? 'text-orange-500' : 'text-slate-400'}`}>
                      {isLow ? `⚠️ Only ${stock} left` : `In stock: ${stock}`}
                    </p>
                    <p className="text-base font-bold text-blue-600 mt-1">
                      {formatCurrency(product.selling_price || 0, currency)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-4 text-center text-slate-500 text-sm">
        <p className="font-semibold text-slate-700 mb-2">{store.store_name}</p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {store.contact_phone && (
            <a href={`tel:${store.contact_phone}`} className="flex items-center gap-1 hover:text-blue-600">
              <Phone className="w-3.5 h-3.5" /> {store.contact_phone}
            </a>
          )}
          {store.contact_email && (
            <a href={`mailto:${store.contact_email}`} className="flex items-center gap-1 hover:text-blue-600">
              <Mail className="w-3.5 h-3.5" /> {store.contact_email}
            </a>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-400">To purchase, please visit us in-store or contact us directly.</p>
      </footer>
    </div>
  );
}