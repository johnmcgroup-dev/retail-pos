import React, { useState, useEffect, useRef } from "react";
import { Search, X, Package } from "lucide-react";
import { Input } from "@/components/ui/input";

// Case-insensitive, partial matching across every searchable product field.
const matchesTerm = (p, t) =>
  p.name?.toLowerCase().includes(t) ||
  p.category?.toLowerCase().includes(t) ||
  p.sku?.toLowerCase().includes(t) ||
  p.description?.toLowerCase().includes(t) ||
  (p.barcodes || []).some((b) => b?.toLowerCase().includes(t));

/**
 * Read-only product search box.
 *
 * It keeps its own local search text and only ever *reads* the products it is
 * given. It never updates, saves or deletes a product, and it never changes the
 * list the caller passes in. Picking a suggestion just calls onSelect(product).
 */
export default function ProductSearchBox({ products = [], onSelect }) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const query = term.toLowerCase().trim();
  const suggestions = query ? products.filter((p) => matchesTerm(p, query)).slice(0, 8) : [];
  const showDropdown = open && !!query;

  // Close when clicking anywhere outside the box
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const pick = (product) => {
    onSelect?.(product);
    setTerm("");
    setOpen(false);
  };

  return (
    <div className="relative" ref={rootRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <Input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search products by name, category, barcode or SKU…"
          className="pl-9 pr-9"
        />
        {term && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setTerm("");
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
                  pick(p);
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