import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils";

// Best sellers by units sold, each with a proportional bar.
export default function TopProductsList({ products = [], currency = "NGN" }) {
  const highest = Math.max(...products.map((p) => p.quantity), 1);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-slate-900">Top-selling products</CardTitle>
        <p className="text-xs text-slate-500">By units sold</p>
      </CardHeader>
      <CardContent className="pt-2">
        {products.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No sales recorded yet</p>
        ) : (
          <ul className="space-y-3">
            {products.map((product, index) => (
              <li key={product.name}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 text-[11px] font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <span className="font-medium text-slate-800 truncate">{product.name}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="font-bold text-slate-900">{product.quantity}</span>
                    <span className="text-xs text-slate-500 ml-2">{formatCurrency(product.revenue, currency)}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                    style={{ width: `${(product.quantity / highest) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}