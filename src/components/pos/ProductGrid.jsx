import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Package } from "lucide-react";
import { formatCurrency } from "@/utils";

export default function ProductGrid({ products, onAddToCart, currency = 'USD', stockByProduct = {} }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
      {products.map((product) => {
        const stock = stockByProduct[product.id] || 0;
        const isLowStock = stock > 0 && stock <= 5;
        return (
          <button
            key={product.id}
            type="button"
            onClick={() => onAddToCart(product)}
            className="group relative bg-white rounded-xl border-2 border-slate-100 text-left
              transition-all duration-100 cursor-pointer select-none
              hover:border-blue-400 hover:shadow-md
              active:scale-95 active:border-blue-600 active:bg-blue-50 active:shadow-inner
              focus:outline-none focus:ring-2 focus:ring-blue-400
              touch-manipulation w-full overflow-hidden cv-auto"
            style={{ WebkitTapHighlightColor: 'rgba(59,130,246,0.15)' }}
          >
            {/* Image */}
            <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 w-full flex items-center justify-center overflow-hidden">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-10 h-10 text-slate-300" />
              )}
            </div>

            {/* Info */}
            <div className="p-2 md:p-3">
              <p className="font-semibold text-slate-900 text-xs md:text-sm leading-tight line-clamp-2 min-h-[2em]">
                {product.name}
              </p>
              {product.category && (
                <span className="inline-block text-[10px] md:text-xs bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 mt-1 truncate max-w-full">
                  {product.category}
                </span>
              )}
              <p className={`text-[10px] md:text-xs font-medium mt-1 ${isLowStock ? 'text-orange-500' : 'text-slate-400'}`}>
                {isLowStock ? `⚠️ Only ${stock} left` : `Stock: ${stock}`}
              </p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-sm md:text-base font-bold text-blue-600">
                  {formatCurrency(product.selling_price || 0, currency)}
                </span>
                <span className="w-7 h-7 rounded-full bg-blue-600 group-active:bg-blue-700 flex items-center justify-center shadow-sm flex-shrink-0">
                  <Plus className="w-3.5 h-3.5 text-white" />
                </span>
              </div>
            </div>
          </button>
        );
      })}
      {products.length === 0 && (
        <div className="col-span-full text-center py-16">
          <Package className="w-16 h-16 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No products available</p>
        </div>
      )}
    </div>
  );
}