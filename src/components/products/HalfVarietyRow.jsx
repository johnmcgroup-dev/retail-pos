import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

// One "Half-X" row in the product variety list. Values start as half of the
// parent variety and stay editable; the reset button hands the fields back to
// the auto-calculation.
export default function HalfVarietyRow({ label, parent, price, quantity, isOverridden, onChange, onReset }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <div className="col-span-3 flex items-center gap-1 min-w-0">
        <span className="text-sm font-medium text-slate-600 truncate" title={`Half of ${parent}`}>
          {label}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onReset}
          className={`h-6 w-6 shrink-0 ${isOverridden ? "text-blue-600 hover:bg-blue-50" : "text-slate-400 hover:bg-slate-100"}`}
          title={isOverridden ? `Reset to half of ${parent}` : `Already half of ${parent}`}
        >
          <RotateCcw className="w-3 h-3" />
        </Button>
      </div>
      <div className="col-span-5">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => onChange("price", parseFloat(e.target.value) || 0)}
          placeholder={`Half of ${parent} price`}
          className="h-8"
        />
      </div>
      <div className="col-span-4">
        <Input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => onChange("quantity", parseInt(e.target.value) || 1)}
          placeholder="Pcs / unit"
          className="h-8"
        />
      </div>
    </div>
  );
}