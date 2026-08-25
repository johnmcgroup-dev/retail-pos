import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, ShoppingCart, Package, Save } from "lucide-react";
import { formatCurrency } from "@/utils";
import { VARIETIES, getVarietyPrice, getVarietyQuantity } from "@/lib/varieties";

export default function CartPanel({ cart, products = [], onUpdateQuantity, onRemoveItem, onUpdateVariety, onUpdateUnitPrice, onSaveVarietyPrice, currency = 'USD' }) {
  const [savedId, setSavedId] = useState(null);
  const [units, setUnits] = useState({});

  const unitKey = (pid, v) => `${pid}|${v}`;

  const getUnit = (item) => {
    const k = unitKey(item.product_id, item.variety || "Pieces");
    if (units[k] != null) return units[k];
    return getVarietyQuantity(products.find(p => p.id === item.product_id), item.variety || "Pieces");
  };

  const handleSave = (item) => {
    if (!onSaveVarietyPrice) return;
    Promise.resolve(onSaveVarietyPrice(item.product_id, item.variety || "Pieces", item.unit_price, getUnit(item)))
      .then(() => {
        setSavedId(item.product_id);
        setTimeout(() => setSavedId(null), 1500);
      });
  };

  return (
    <div className="p-2 sm:p-3">
      {cart.length === 0 ? (
        <div className="text-center py-10">
          <ShoppingCart className="w-14 h-14 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Cart is empty</p>
          <p className="text-sm text-slate-400 mt-1">Add products to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cart.map((item) => (
            <div key={item.product_id} className="bg-slate-50 rounded-lg p-2.5 sm:p-3 border border-slate-200 hover:border-blue-300 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
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

              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-medium text-slate-500 shrink-0 w-14">Variety</span>
                <select
                  value={item.variety || "Pieces"}
                  onChange={(e) => onUpdateVariety && onUpdateVariety(item.product_id, e.target.value)}
                  className="h-8 text-xs border border-slate-300 rounded-md px-2 bg-white flex-1 min-w-0"
                >
                  {VARIETIES.map(v => {
                    const price = getVarietyPrice(products.find(p => p.id === item.product_id), v);
                    return (
                      <option key={v} value={v}>
                        {v}{price != null ? ` — ${formatCurrency(price, currency)}` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-xs font-medium text-slate-500 shrink-0 w-14">Price</span>
                <Input
                  type="number"
                  value={item.unit_price}
                  onChange={(e) => onUpdateUnitPrice && onUpdateUnitPrice(item.product_id, e.target.value)}
                  className="flex-1 h-8 text-right min-w-0"
                  min="0"
                  step="0.01"
                />
                {item.variety && item.variety !== "Pieces" && (
                  <Input
                    type="number"
                    value={getUnit(item)}
                    onChange={(e) => setUnits({ ...units, [unitKey(item.product_id, item.variety)]: parseInt(e.target.value) || 1 })}
                    className="w-16 h-8 text-center shrink-0"
                    min="1"
                    title="Pieces per unit (for stock deduction)"
                    placeholder="pcs"
                  />
                )}
                {onSaveVarietyPrice && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs gap-1 shrink-0"
                    onClick={() => handleSave(item)}
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savedId === item.product_id ? "Saved!" : "Save"}
                  </Button>
                )}
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