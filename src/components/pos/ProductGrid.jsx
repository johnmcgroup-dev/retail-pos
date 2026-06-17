import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Package } from "lucide-react";
import { formatCurrency } from "@/utils";

export default function ProductGrid({ products, onAddToCart, currency = 'USD' }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      {products.map((product) => (
        <Card
          key={product.id}
          className="transition-all duration-150 cursor-pointer border-2 border-transparent
            hover:shadow-lg hover:border-blue-400
            active:scale-95 active:border-blue-600 active:shadow-inner active:bg-blue-50
            touch-manipulation select-none"
          onClick={() => onAddToCart(product)}
          onTouchStart={() => {}} // ensures :active fires on iOS
        >
          <CardContent className="p-3 md:p-4">
            <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg mb-3 flex items-center justify-center overflow-hidden pointer-events-none">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-10 h-10 md:w-12 md:h-12 text-slate-400" />
              )}
            </div>
            <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2 min-h-[2.5rem] text-sm md:text-base pointer-events-none">
              {product.name}
            </h3>
            {product.category && (
              <Badge variant="secondary" className="text-xs mb-2 pointer-events-none">
                {product.category}
              </Badge>
            )}
            <div className="flex items-center justify-between mt-2 pointer-events-none">
              <span className="text-base md:text-lg font-bold text-blue-600">
                {formatCurrency(product.selling_price || 0, currency)}
              </span>
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
                <Plus className="w-4 h-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {products.length === 0 && (
        <div className="col-span-full text-center py-12">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No products found</p>
        </div>
      )}
    </div>
  );
}