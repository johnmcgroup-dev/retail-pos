import React, { useState, useEffect, useMemo } from "react";
import { Pin, Package, Settings2 } from "lucide-react";
import { formatCurrency } from "@/components/utils";

const STORAGE_KEY = "pos_pinned_products";

export default function PinnedItems({ products = [], sales = [], onAddToCart, currency, stockByProduct = {} }) {
  const [pinnedIds, setPinnedIds] = useState([]);
  const [showManage, setShowManage] = useState(false);

  const bestSellers = useMemo(() => {
    const map = {};
    (sales || []).forEach(sale => {
      (sale.items || []).forEach(item => {
        if (!map[item.product_id]) {
          map[item.product_id] = { product_id: item.product_id, quantity: 0, revenue: 0 };
        }
        map[item.product_id].quantity += item.quantity || 0;
        map[item.product_id].revenue += item.total || 0;
      });
    });
    return Object.values(map).sort((a, b) => b.quantity - a.quantity);
  }, [sales]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const ids = JSON.parse(stored);
        if (Array.isArray(ids)) { setPinnedIds(ids); return; }
      } catch (_) {}
    }
    // Auto-pin top best sellers on first load
    const topIds = bestSellers.slice(0, 6).map(s => s.product_id);
    if (topIds.length > 0) {
      setPinnedIds(topIds);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(topIds));
    }
  }, [bestSellers.length]);

  const togglePin = (productId) => {
    const next = pinnedIds.includes(productId)
      ? pinnedIds.filter(id => id !== productId)
      : [...pinnedIds, productId];
    setPinnedIds(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const pinnedProducts = pinnedIds
    .map(id => products.find(p => p.id === id))
    .filter(Boolean);

  const visiblePinned = pinnedProducts.filter(p => (stockByProduct[p.id] || 0) > 0);

  if (visiblePinned.length === 0 && !showManage) return null;

  // Candidates for the manage view: best sellers first, then any pinned items not in best sellers
  const extraPinned = pinnedIds
    .filter(id => !bestSellers.some(s => s.product_id === id))
    .map(id => ({ product_id: id, quantity: 0, revenue: 0 }));

  const manageCandidates = bestSellers.length > 0
    ? [...bestSellers.slice(0, 12), ...extraPinned].slice(0, 20)
    : products.slice(0, 12).map(p => ({ product_id: p.id, quantity: 0, revenue: 0 }));

  return (
    <div className="border-b border-slate-200 bg-white px-3 py-2.5 shrink-0">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1">
          <Pin className="w-3 h-3 text-blue-500" />
          Quick Add
        </h3>
        <button
          onClick={() => setShowManage(!showManage)}
          className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-0.5"
        >
          <Settings2 className="w-3 h-3" />
          {showManage ? "Done" : "Manage"}
        </button>
      </div>

      {showManage ? (
        <div className="max-h-32 overflow-y-auto">
          <p className="text-[10px] text-slate-500 mb-1.5">
            {bestSellers.length > 0 ? "Tap to pin/unpin \u2014 sorted by best sellers:" : "Tap to pin/unpin items:"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {manageCandidates.map(s => {
              const product = products.find(p => p.id === s.product_id);
              if (!product) return null;
              const isPinned = pinnedIds.includes(s.product_id);
              return (
                <button
                  key={s.product_id}
                  onClick={() => togglePin(s.product_id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    isPinned
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {isPinned && "\u{1F4CC} "}{product.name}
                </button>
              );
            })}
            {manageCandidates.length === 0 && (
              <p className="text-xs text-slate-400">No products available to pin</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
          {visiblePinned.map(product => (
            <button
              key={product.id}
              onClick={() => onAddToCart(product)}
              className="flex-shrink-0 w-[72px] flex flex-col items-center gap-1 p-1.5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 hover:border-blue-400 hover:from-blue-100 hover:to-indigo-100 transition-all active:scale-95"
            >
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center overflow-hidden border border-slate-100">
                {product.image_url
                  ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  : <Package className="w-5 h-5 text-slate-400" />
                }
              </div>
              <p className="text-[9px] font-medium text-slate-700 text-center leading-tight line-clamp-2 w-full">{product.name}</p>
              <p className="text-[9px] font-bold text-blue-600">{formatCurrency(product.selling_price || 0, currency)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}