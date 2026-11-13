import React, { useState } from "react";
import { ChevronUp, TrendingDown, TrendingUp } from "lucide-react";

/**
 * Frosted stat card that expands to reveal the metric's progress toward its
 * target, plus the period-over-period trend chip.
 */
export default function GrowthStatCard({
  title,
  value,
  unit,
  percent = 0,
  goalLabel,
  trend,
  detail,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const up = (trend?.change ?? 0) >= 0;

  return (
    <button
      type="button"
      onClick={() => setOpen((prev) => !prev)}
      aria-expanded={open}
      className="w-full rounded-3xl border border-border bg-card p-3 text-left shadow-sm transition-shadow hover:shadow-md md:p-4"
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground">
          {title}
        </span>
        <span
          className="ml-auto flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground transition-transform duration-500"
          style={{ transform: open ? "rotate(135deg)" : "none" }}
          aria-hidden="true"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </span>
      </div>

      <div
        className={`grid transition-all duration-500 ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-light tracking-tight tabular-nums text-foreground md:text-3xl">
              {value}
            </span>
            {unit && <span className="text-xs font-light text-muted-foreground">{unit}</span>}
          </div>

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-muted-foreground">{goalLabel}</span>
            {trend && (
              <span
                className={`ml-auto inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium ${
                  up ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                }`}
              >
                {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trend.label}
              </span>
            )}
          </div>

          {detail && <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{detail}</p>}
        </div>
      </div>
    </button>
  );
}