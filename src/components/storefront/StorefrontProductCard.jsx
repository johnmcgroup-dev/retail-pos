import React from "react";
import { Package } from "lucide-react";
import { formatCurrency } from "@/components/utils";

/** One advertised product on the public shop page. */
export default function StorefrontProductCard({ listing, currency, accent }) {
  const low = (listing.in_stock || 0) <= 5;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
      <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden">
        {listing.image_url ? (
          <img src={listing.image_url} alt={listing.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <Package className="w-10 h-10 text-slate-300" />
        )}
      </div>
      <div className="p-2.5 flex-1 flex flex-col">
        <p className="font-semibold text-slate-900 text-sm line-clamp-2 leading-tight min-h-[2.5em]">
          {listing.name}
        </p>
        {listing.category && (
          <span className="inline-block text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 mt-1 truncate max-w-full self-start">
            {listing.category}
          </span>
        )}
        {listing.description && (
          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{listing.description}</p>
        )}
        <p className={`text-[10px] font-medium mt-1.5 ${low ? "text-orange-500" : "text-emerald-600"}`}>
          {low ? `Only ${listing.in_stock} left` : "In stock"}
        </p>
        <p className="text-base font-bold mt-auto pt-1" style={{ color: accent }}>
          {formatCurrency(listing.price || 0, currency)}
        </p>
      </div>
    </div>
  );
}