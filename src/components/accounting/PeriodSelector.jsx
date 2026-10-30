import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Date range used by every accounting report.
 */
export default function PeriodSelector({ from, to, onFromChange, onToChange, children }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <Label className="text-xs text-slate-500">From</Label>
        <Input
          type="date"
          value={from}
          onChange={(event) => onFromChange(event.target.value)}
          className="mt-1 w-[9.5rem] h-9"
        />
      </div>
      <div>
        <Label className="text-xs text-slate-500">To</Label>
        <Input
          type="date"
          value={to}
          onChange={(event) => onToChange(event.target.value)}
          className="mt-1 w-[9.5rem] h-9"
        />
      </div>
      {children}
    </div>
  );
}