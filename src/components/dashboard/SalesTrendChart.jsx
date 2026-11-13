import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/components/utils";

const RANGES = [
  { key: "day", label: "Day", caption: "Last 7 days" },
  { key: "week", label: "Week", caption: "Last 8 weeks" },
  { key: "month", label: "Month", caption: "Last 6 months" },
  { key: "year", label: "Year", caption: "Last 5 years" },
];

function startOfWeek(date) {
  const d = new Date(date);
  const offset = (d.getDay() + 6) % 7; // week starts Monday
  d.setDate(d.getDate() - offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Empty buckets for the selected range, oldest first. */
function buildBuckets(range) {
  const now = new Date();
  const buckets = [];

  if (range === "day") {
    for (let i = 6; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      buckets.push({ label: format(start, "EEE"), start, end, total: 0 });
    }
  } else if (range === "week") {
    const thisWeek = startOfWeek(now);
    for (let i = 7; i >= 0; i--) {
      const start = new Date(thisWeek);
      start.setDate(thisWeek.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      buckets.push({ label: format(start, "MMM d"), start, end, total: 0 });
    }
  } else if (range === "month") {
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      buckets.push({ label: format(start, "MMM"), start, end, total: 0 });
    }
  } else {
    for (let i = 4; i >= 0; i--) {
      const start = new Date(now.getFullYear() - i, 0, 1);
      const end = new Date(now.getFullYear() - i + 1, 0, 1);
      buckets.push({ label: format(start, "yyyy"), start, end, total: 0 });
    }
  }

  return buckets;
}

/** Sum real Sale records into the range's buckets. */
function seriesFromSales(sales, range) {
  const buckets = buildBuckets(range);
  sales.forEach((sale) => {
    const date = new Date(sale.sale_date);
    if (isNaN(date.getTime())) return;
    const amount = Number(sale.total_amount) || 0;
    const bucket = buckets.find((b) => date >= b.start && date < b.end);
    if (bucket) bucket.total += amount;
  });
  return buckets;
}

/** Smooth cubic path through the points, inside a 160 × 104 view box. */
function smoothPath(buckets) {
  const max = Math.max(...buckets.map((b) => b.total), 0);
  const step = buckets.length > 1 ? 158 / (buckets.length - 1) : 0;
  const points = buckets.map((b, i) => {
    const x = 1 + step * i;
    const y = max > 0 ? 100 - (b.total / max) * 88 : 100;
    return [x, y];
  });

  if (points.length < 2) return "";
  let d = `M${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

/** Sales trend card — the period tabs redraw the line from this store's real sales. */
export default function SalesTrendChart({ sales = [], currency = "NGN", showSymbol = true }) {
  const [range, setRange] = useState("month");
  const tabsWrapRef = useRef(null);
  const tabRefs = useRef({});
  const [dotLeft, setDotLeft] = useState(null);

  const active = RANGES.find((r) => r.key === range) || RANGES[2];
  const buckets = useMemo(() => seriesFromSales(sales, range), [sales, range]);

  const latest = buckets[buckets.length - 1]?.total || 0;
  const previous = buckets[buckets.length - 2]?.total || 0;
  const hasSales = buckets.some((b) => b.total > 0);
  const change = previous > 0 ? ((latest - previous) / previous) * 100 : latest > 0 ? 100 : 0;
  const isUp = change >= 0;
  const percentLabel = hasSales ? `${Math.round(Math.abs(change))}%` : "—";
  const PathIcon = isUp ? ArrowUpRight : ArrowDownRight;

  const path = useMemo(() => smoothPath(buckets), [buckets]);

  const placeDot = () => {
    const tab = tabRefs.current[range];
    if (!tab) return;
    setDotLeft(tab.offsetLeft - 12);
  };

  useLayoutEffect(placeDot, [range]);

  useEffect(() => {
    if (!tabsWrapRef.current || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(placeDot);
    observer.observe(tabsWrapRef.current);
    return () => observer.disconnect();
  }, [range]);

  return (
    <article className="relative h-full overflow-hidden rounded-xl border border-border bg-card p-3 md:p-4 shadow-md">
      {/* bordered graph-paper frame behind the chart */}
      <div className="pointer-events-none absolute inset-1.5 rounded-lg border border-border/70" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-1.5 bottom-1.5 top-16 rounded-lg opacity-60"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] md:text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sales trend
            </p>
            <p className="text-base md:text-xl font-semibold text-foreground mt-0.5 truncate">
              {formatCurrency(latest, currency, showSymbol)}
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground">{active.caption}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0" title="Change vs the previous period">
            {hasSales && (
              <PathIcon className={`w-4 h-4 ${isUp ? "text-emerald-400" : "text-red-400"}`} aria-hidden="true" />
            )}
            <span className="text-lg md:text-2xl font-semibold tabular-nums text-foreground">
              {percentLabel}
            </span>
          </div>
        </div>

        <div
          ref={tabsWrapRef}
          className="relative flex items-center gap-4 md:gap-6 mt-3"
          role="tablist"
          aria-label="Sales trend range"
        >
          {dotLeft !== null && (
            <span
              className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-foreground transition-all duration-200"
              style={{ left: `${dotLeft}px` }}
              aria-hidden="true"
            />
          )}
          {RANGES.map((option) => (
            <button
              key={option.key}
              ref={(el) => { tabRefs.current[option.key] = el; }}
              type="button"
              role="tab"
              aria-selected={range === option.key}
              onClick={() => setRange(option.key)}
              className={`rounded-sm text-xs md:text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                range === option.key ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div
          className="relative mt-2 md:mt-3 h-28 md:h-36"
          role="img"
          aria-label={
            hasSales
              ? `Sales for the ${active.caption.toLowerCase()}, ${percentLabel} versus the previous period`
              : `No sales recorded in the ${active.caption.toLowerCase()}`
          }
        >
          <svg viewBox="1 1 159 103" className="w-full h-full overflow-visible" aria-hidden="true">
            <defs>
              <linearGradient id="trend-stroke" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--chart-3))" />
                <stop offset="100%" stopColor="hsl(var(--chart-2))" />
              </linearGradient>
            </defs>
            <path
              key={range}
              className="trend-draw"
              d={path}
              fill="none"
              stroke="url(#trend-stroke)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={hasSales ? undefined : "4 4"}
            />
          </svg>
          {!hasSales && (
            <p className="absolute inset-0 flex items-center justify-center text-[11px] md:text-xs text-muted-foreground">
              No sales in this period
            </p>
          )}
        </div>

        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          {buckets.map((bucket) => (
            <span key={bucket.label} className="tabular-nums">{bucket.label}</span>
          ))}
        </div>
      </div>
    </article>
  );
}