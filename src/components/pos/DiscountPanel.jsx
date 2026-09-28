import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tag, Award, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency, getCurrencySymbol } from "@/utils";

export default function DiscountPanel({
  subtotal,
  customer,
  loyaltyProgram,
  orderDiscount,
  setOrderDiscount,
  loyaltyRedeem,
  setLoyaltyRedeem,
  currency = "NGN",
  alwaysExpanded = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const isOpen = alwaysExpanded || expanded;

  const customerPoints = customer?.loyalty_points || 0;
  const redemptionValue = loyaltyProgram?.redemption_value || 0;
  const canRedeem = !!customer && customerPoints > 0 && redemptionValue > 0;

  const orderDiscountAmount =
    orderDiscount.type === "percentage"
      ? subtotal * ((orderDiscount.value || 0) / 100)
      : orderDiscount.value || 0;

  const loyaltyDiscountAmount = loyaltyRedeem.enabled
    ? Math.min(loyaltyRedeem.points, customerPoints) * redemptionValue
    : 0;

  const totalDiscount = orderDiscountAmount + loyaltyDiscountAmount;

  const toggleLoyalty = () => {
    if (!canRedeem) return;
    setLoyaltyRedeem((prev) => ({
      enabled: !prev.enabled,
      points: !prev.enabled ? customerPoints : 0,
    }));
  };

  const body = (
    <div className={alwaysExpanded ? "space-y-3" : "p-3 space-y-3 border-t border-slate-100"}>
      {/* Order discount */}
      <div>
        <Label className="text-xs text-slate-600">Order Discount</Label>
        <div className="flex gap-2 mt-1">
          <div className="flex rounded-md border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setOrderDiscount((d) => ({ ...d, type: "percentage" }))}
              className={`px-3 py-1.5 text-xs font-medium ${
                orderDiscount.type === "percentage" ? "bg-blue-600 text-white" : "bg-white text-slate-600"
              }`}
            >
              %
            </button>
            <button
              type="button"
              onClick={() => setOrderDiscount((d) => ({ ...d, type: "fixed" }))}
              className={`px-3 py-1.5 text-xs font-medium ${
                orderDiscount.type === "fixed" ? "bg-blue-600 text-white" : "bg-white text-slate-600"
              }`}
            >
              {getCurrencySymbol(currency)}
            </button>
          </div>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={orderDiscount.value || ""}
            onChange={(e) =>
              setOrderDiscount((d) => ({ ...d, value: parseFloat(e.target.value) || 0 }))
            }
            placeholder={orderDiscount.type === "percentage" ? "e.g. 10" : "e.g. 500"}
            className="flex-1 h-8"
          />
        </div>
        {orderDiscountAmount > 0 && (
          <p className="text-xs text-green-600 mt-1">
            Discount: -{formatCurrency(orderDiscountAmount, currency)}
          </p>
        )}
      </div>

      {/* Loyalty redemption */}
      <div
        className={`rounded-lg border p-2 ${
          loyaltyRedeem.enabled ? "border-purple-300 bg-purple-50" : "border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-600" />
            <div>
              <p className="text-xs font-semibold text-slate-700">Loyalty Points</p>
              <p className="text-xs text-slate-500">
                {customer ? `${customerPoints} pts available` : "Select a customer"}
                {redemptionValue > 0 && ` · 1 pt = ${formatCurrency(redemptionValue, currency)}`}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant={loyaltyRedeem.enabled ? "default" : "outline"}
            size="sm"
            disabled={!canRedeem}
            onClick={toggleLoyalty}
            className={loyaltyRedeem.enabled ? "bg-purple-600 hover:bg-purple-700" : ""}
          >
            {loyaltyRedeem.enabled ? "Redeeming" : "Redeem"}
          </Button>
        </div>
        {loyaltyRedeem.enabled && canRedeem && (
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max={customerPoints}
              value={loyaltyRedeem.points}
              onChange={(e) => {
                const pts = Math.min(Math.max(0, parseInt(e.target.value) || 0), customerPoints);
                setLoyaltyRedeem((p) => ({ ...p, points: pts }));
              }}
              className="flex-1 h-8"
            />
            <span className="text-xs text-slate-500 whitespace-nowrap">of {customerPoints}</span>
          </div>
        )}
        {loyaltyDiscountAmount > 0 && (
          <p className="text-xs text-purple-600 mt-1 font-semibold">
            Reward discount: -{formatCurrency(loyaltyDiscountAmount, currency)}
          </p>
        )}
      </div>
    </div>
  );

  // Used inside the compact discount popover on the POS screen — no collapsible header
  if (alwaysExpanded) return body;

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Tag className="w-4 h-4 text-blue-600" />
          Discounts & Rewards
          {totalDiscount > 0 && (
            <Badge className="bg-green-100 text-green-700">
              -{formatCurrency(totalDiscount, currency)}
            </Badge>
          )}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isOpen && body}
    </div>
  );
}