import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, PackagePlus, Edit, X } from "lucide-react";

/**
 * "Search Results" panel — a display-only list of the products the user picked
 * from the search dropdown.
 *
 * Removing an entry or clearing the panel only empties this list. It never
 * deletes or changes anything in the product catalog or the database.
 */
export default function SearchResultsPanel({ products = [], getInventory, onRemove, onClearAll, onStock, onEdit }) {
  if (products.length === 0) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-slate-50 px-3 py-2 border-b">
        <span className="text-sm font-semibold text-slate-700">Search Results ({products.length})</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-7 gap-1 text-red-600 hover:text-red-700"
        >
          <X className="w-3.5 h-3.5" />
          Clear all
        </Button>
      </div>

      <ul className="divide-y">
        {products.map((p) => {
          const stockQty = getInventory?.(p.id)?.quantity ?? 0;
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                <p className="text-xs text-slate-500 truncate">
                  {[p.category, p.sku && `SKU: ${p.sku}`, (p.barcodes || [])[0]].filter(Boolean).join(" • ") || "—"}
                </p>
              </div>
              <Badge
                className={
                  stockQty === 0
                    ? "bg-red-100 text-red-700"
                    : stockQty <= (p.reorder_level || 0)
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-green-100 text-green-700"
                }
              >
                {stockQty === 0 ? "No stock" : `${stockQty} in stock`}
              </Badge>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => onStock(p)}>
                <PackagePlus className="w-3.5 h-3.5" />
                Stock
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => onEdit(p)}>
                <Edit className="w-3.5 h-3.5" />
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-red-600"
                onClick={() => onRemove(p.id)}
                aria-label={`Remove ${p.name} from search results`}
              >
                <X className="w-4 h-4" />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}