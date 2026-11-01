import React from "react";
import { Button } from "@/components/ui/button";

const iso = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function presets() {
  const now = new Date();
  const daysAgo = (days) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  return [
    { key: "this-month", label: "This month", from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) },
    { key: "last-month", label: "Last month", from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)) },
    { key: "30-days", label: "Last 30 days", from: iso(daysAgo(29)), to: iso(now) },
    { key: "quarter", label: "This quarter", from: iso(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)), to: iso(now) },
    { key: "year", label: "This year", from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(now) },
  ];
}

/**
 * One-tap periods for the ledger — the exact From/To dates still show below,
 * so a preset only saves typing them in.
 */
export default function RangePresets({ from, to, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {presets().map((option) => {
        const active = option.from === from && option.to === to;
        return (
          <Button
            key={option.key}
            type="button"
            size="sm"
            variant={active ? "default" : "outline"}
            onClick={() => onChange(option.from, option.to)}
            className={`h-8 text-xs ${active ? "bg-blue-600 hover:bg-blue-700" : ""}`}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}