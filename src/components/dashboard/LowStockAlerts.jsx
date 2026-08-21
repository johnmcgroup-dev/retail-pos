import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, PackagePlus, TrendingDown, Boxes } from "lucide-react";
import StockProductDialog from "@/components/inventory/StockProductDialog";

export default function LowStockAlerts({ currency = "NGN", showSymbol = true }) {
  const queryClient = useQueryClient();
  const [stockProduct, setStockProduct] = useState(null);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });
  const companyId = user?.company_id || user?.tenant_id || companies[0]?.id;

  const { data: products = [] } = useQuery({
    queryKey: ["products", companyId],
    queryFn: () => base44.entities.Product.filter({ company_id: companyId }),
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory", companyId],
    queryFn: () => base44.entities.Inventory.filter({ company_id: companyId }),
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000,
  });

  // Build stock map: product_id -> total quantity
  const stockMap = {};
  inventory.forEach(inv => {
    stockMap[inv.product_id] = (stockMap[inv.product_id] || 0) + (inv.quantity || 0);
  });

  // Products needing attention: no stock record, zero stock, or below reorder level
  const lowStockProducts = products
    .map(p => ({
      ...p,
      stock: stockMap[p.id] ?? 0,
      invItem: inventory.find(inv => inv.product_id === p.id),
    }))
    .filter(p => {
      const reorderLevel = p.reorder_level || 10;
      return p.stock === 0 || p.stock <= reorderLevel;
    })
    .sort((a, b) => a.stock - b.stock);

  const outOfStockCount = lowStockProducts.filter(p => p.stock === 0).length;
  const lowStockCount = lowStockProducts.filter(p => p.stock > 0).length;

  return (
    <Card className="shadow-md border-orange-200">
      <CardHeader className="border-b border-slate-100 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
            Stock Alerts
          </CardTitle>
          <div className="flex gap-1.5">
            {outOfStockCount > 0 && (
              <Badge className="bg-red-100 text-red-700 text-[10px] md:text-xs">
                {outOfStockCount} Out
              </Badge>
            )}
            {lowStockCount > 0 && (
              <Badge className="bg-yellow-100 text-yellow-700 text-[10px] md:text-xs">
                {lowStockCount} Low
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 md:p-4">
        {lowStockProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <Boxes className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm font-medium text-slate-700">All products well stocked</p>
            <p className="text-xs text-slate-400 mt-0.5">No items need reordering</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {lowStockProducts.slice(0, 8).map((p) => {
              const reorderLevel = p.reorder_level || 10;
              const isOutOfStock = p.stock === 0;
              const pct = reorderLevel > 0 ? Math.min(100, (p.stock / reorderLevel) * 100) : 0;

              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between gap-2 p-2 md:p-3 rounded-lg border ${
                    isOutOfStock ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs md:text-sm font-semibold truncate ${
                      isOutOfStock ? 'text-red-800' : 'text-yellow-800'
                    }`}>
                      {p.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] md:text-xs ${
                        isOutOfStock ? 'text-red-600' : 'text-yellow-700'
                      }`}>
                        {isOutOfStock ? "Out of stock" : `${p.stock} / ${reorderLevel} ${p.unit || "pcs"}`}
                      </span>
                      {/* Mini progress bar */}
                      <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className={`h-full rounded-full ${isOutOfStock ? 'bg-red-500' : 'bg-yellow-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className={`flex-shrink-0 h-7 text-xs gap-1 ${
                      isOutOfStock
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-yellow-600 hover:bg-yellow-700'
                    }`}
                    onClick={() => setStockProduct({ product: p, inventoryItem: p.invItem })}
                  >
                    <PackagePlus className="w-3 h-3" />
                    Stock
                  </Button>
                </div>
              );
            })}
            {lowStockProducts.length > 8 && (
              <p className="text-center text-xs text-slate-400 pt-1">
                +{lowStockProducts.length - 8} more items need attention
              </p>
            )}
          </div>
        )}
      </CardContent>

      {stockProduct && (
        <StockProductDialog
          open={!!stockProduct}
          onClose={() => setStockProduct(null)}
          product={stockProduct.product}
          inventoryItem={stockProduct.inventoryItem}
          companyId={companies[0]?.id}
          onSuccess={() => {
            queryClient.invalidateQueries(["inventory"]);
            queryClient.invalidateQueries(["products"]);
          }}
        />
      )}
    </Card>
  );
}