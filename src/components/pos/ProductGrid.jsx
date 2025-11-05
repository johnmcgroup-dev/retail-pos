import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Package } from "lucide-react";
import { formatCurrency } from "@/utils";

export default function ProductGrid({ products, onAddToCart, currency = 'USD' }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <Card
          key={product.id}
          className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-2 border-transparent hover:border-blue-400"
          onClick={() => onAddToCart(product)}
        >
          <CardContent className="p-4">
            <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-12 h-12 text-slate-400" />
              )}
            </div>
            <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2 min-h-[2.5rem]">
              {product.name}
            </h3>
            {product.category && (
              <Badge variant="secondary" className="text-xs mb-2">
                {product.category}
              </Badge>
            )}
            <div className="flex items-center justify-between mt-2">
              <span className="text-lg font-bold text-blue-600">
                {formatCurrency(product.selling_price || 0, currency)}
              </span>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 group-hover:scale-110 transition-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product);
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
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