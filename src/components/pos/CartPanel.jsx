import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus, Trash2, ShoppingCart } from "lucide-react";

export default function CartPanel({ cart, onUpdateQuantity, onRemoveItem }) {
  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <ShoppingCart className="w-20 h-20 mb-4 opacity-50" />
        <p className="text-lg font-medium">Cart is empty</p>
        <p className="text-sm">Add products to start a sale</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {cart.map((item) => (
        <div
          key={item.product_id}
          className="p-4 bg-white border-2 border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900">{item.product_name}</h4>
              <p className="text-sm text-slate-500">${item.unit_price.toFixed(2)} each</p>
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

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
                className="h-9 w-9"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                value={item.quantity}
                onChange={(e) => onUpdateQuantity(item.product_id, parseInt(e.target.value) || 0)}
                className="w-16 h-9 text-center font-semibold"
                min="1"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                className="h-9 w-9"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-slate-900">
                ${item.total.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}