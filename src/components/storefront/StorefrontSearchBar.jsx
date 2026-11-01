import React from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

/**
 * The showcase search box: filters as you type, tells the shopper how many
 * products matched, and clears in one tap.
 */
export default function StorefrontSearchBar({ value, onChange, resultCount, totalCount }) {
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search products by name or category..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 pr-11 h-12 text-base bg-white shadow-sm rounded-xl"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {value.trim() && (
        <p className="text-xs text-slate-500 pl-1">
          {resultCount} of {totalCount} products match “{value.trim()}”
        </p>
      )}
    </div>
  );
}