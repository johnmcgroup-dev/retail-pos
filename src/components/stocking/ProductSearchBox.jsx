import React, { useState, useEffect, useRef } from "react";
import { Search, X, Package } from "lucide-react";
import { Input } from "@/components/ui/input";

const matchesTerm = (p, t) =>
  p.name?.toLowerCase().includes(t) ||
  p.category?.toLowerCase().includes(t) ||
  p.sku?.toLowerCase().includes(t) ||
  p.description?.toLowerCase().includes(t) ||
  (p.barcodes || []).some((b) => b?.toLowerCase().includes(t));

// Google-style live search box: suggestions dropdown + caller-side list filtering.
export default function ProductSearchBox({ products, value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const term = (value || "").toLowerCase().trim();
  const suggestions = term ? products.filter((p) => matchesTerm(p, term)).slice(0, 8) : [];
  const showDropdown = open && !!term;

  // Close when clicking anywhere outside the box
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <Input
          value={value}
          onChange={(e) => {
            setOpen(true);
            onChange(e.target.value);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search products by name, category, barcode or SKU…"
          className="pl-9 pr-9"
        />
        {value && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {showDropdown && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {suggestions.length === 0 ? (
            <p className="p-3 text-sm text-slate-500">No products found</p>
          ) : (
            suggestions.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(p.name);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-start gap-2"
              >
                <Package className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-800 truncate">{p.name}</span>
                  <span className="block text-xs text-slate-500 truncate">
                    {[p.category, p.sku && `SKU: ${p.sku}`, (p.barcodes || [])[0]]
                      .filter(Boolean)
                      .join(" • ")}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}