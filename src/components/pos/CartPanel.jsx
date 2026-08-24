import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, ShoppingCart, Package } from "lucide-react";
import { formatCurrency } from "@/utils";

const VARIETIES = ["Pieces", "Roll", "Bundle", "Dozen", "Carton"];

export default function CartPanel({ cart, onUpdateQuantity, onRemoveItem, onUpdateVariety, onUpdateUnitPrice, currency = 'USD' }) {
  return (
    <div className="p-4">
      {cart.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Cart is empty</p>
          <p className="text-sm text-slate-400 mt-1">Add products to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cart.map((item) => (
            <div key={item.product_id} className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-blue-300 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900 truncate">{item.product_name}</h4>
                    <p className="text-sm text-slate-600">{formatCurrency(item.unit_price, currency)} <span className="text-xs text-slate-500">per {item.variety || "Pieces"}</span></p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveItem(item.product_id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-slate-500 shrink-0">Variety</span>
                <select
                  value={item.variety || "Pieces"}
                  onChange={(e) => onUpdateVariety && onUpdateVariety(item.product_id, e.target.value)}
                  className="h-8 text-xs border border-slate-300 rounded-md px-2 bg-white flex-1 min-w-0"
                >
                  {VARIETIES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <span className="text-xs font-medium text-slate-500 shrink-0">Price</span>
                <Input
                  type="number"
                  value={item.unit_price}
                  onChange={(e) => onUpdateUnitPrice && onUpdateUnitPrice(item.product_id, e.target.value)}
                  className="w-20 h-8 text-right"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => onUpdateQuantity(item.product_id, parseInt(e.target.value) || 1)}
                    className="w-16 h-8 text-center"
                    min="1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-lg font-bold text-blue-600">
                  {formatCurrency(item.total, currency)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}