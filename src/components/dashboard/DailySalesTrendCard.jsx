import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Store } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency, getCurrencySymbol } from "@/components/utils";

/* Chart geometry — one viewBox for the plot, stretched to the card's width. */
const VIEW_W = 832;
const VIEW_H = 279;
const STRIPE_PITCH = 16;
const PAD_TOP = 18;
const PAD_BOTTOM = 6;
const PLOT_H = VIEW_H - PAD_TOP - PAD_BOTTOM;

const PERIODS = {
  d7: { label: "7 days", days: 7, caption: "the last 7 days" },
  d14: { label: "14 days", days: 14, caption: "the last 14 days" },
  d30: { label: "30 days", days: 30, caption: "the last 30 days" },
};

/** One bucket per day, oldest first, summed from this store's sales. */
function buildDays(sales, days) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    series.push({ date, total: 0 });
  }

  const from = series[0].date;
  const until = new Date(today);
  until.setDate(today.getDate() + 1);

  sales.forEach((sale) => {
    const date = new Date(sale.sale_date);
    if (isNaN(date.getTime()) || date < from || date >= until) return;
    const index = Math.floor((date - from) / 86400000);
    if (index >= 0 && index < series.length) {
      series[index].total += Number(sale.total_amount) || 0;
    }
  });

  return series;
}

/** Peak-safe Catmull-Rom tangent, so the tops stay rounded without overshooting. */
function tangentYAt(i, points) {
  const p0 = points[Math.max(0, i - 1)][1];
  const p1 = points[i][1];
  const p2 = points[Math.min(points.length - 1, i + 1)][1];
  const d1 = p1 - p0;
  const d2 = p2 - p1;
  const raw = (p2 - p0) / 2;
  if (d1 === 0 || d2 === 0 || d1 > 0 !== d2 > 0) return raw * 0.3;
  return raw;
}

function curveYAt(x, points) {
  if (!points.length) return PAD_TOP;
  if (x <= points[0][0]) return points[0][1];
  if (x >= points[points.length - 1][0]) return points[points.length - 1][1];
  for (let i = 0; i < points.length - 1; i++) {
    if (x >= points[i][0] && x <= points[i + 1][0]) {
      const span = points[i + 1][0] - points[i][0] || 1;
      const t = (x - points[i][0]) / span;
      const t2 = t * t;
      const t3 = t2 * t;
      const m1 = tangentYAt(i, points);
      const m2 = tangentYAt(i + 1, points);
      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;
      return h00 * points[i][1] + h10 * m1 + h01 * points[i + 1][1] + h11 * m2;
    }
  }
  return points[points.length - 1][1];
}

function compactMoney(value, symbol, useSymbol) {
  const n = Math.round(Number(value) || 0);
  const short =
    n >= 1000000 ? `${(n / 1000000).toFixed(1)}m` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;
  return useSymbol ? `${symbol}${short}` : short;
}

/**
 * Daily sales trend for this store — striped bars under a smooth curve, with
 * the headline average and every day's total from the real Sale records.
 */
export default function DailySalesTrendCard({
  sales = [],
  currency = "NGN",
  showSymbol = true,
  onOpenDetail,
}) {
  const [period, setPeriod] = useState("d14");
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [revealWidth, setRevealWidth] = useState(0);

  const clipId = `daily-trend-${useId().replace(/:/g, "")}`;
  const chipRef = useRef(null);

  const config = PERIODS[period];
  const series = useMemo(() => buildDays(sales, config.days), [sales, period]);
  const symbol = getCurrencySymbol(currency);

  const values = series.map((day) => day.total);
  const total = values.reduce((sum, value) => sum + value, 0);
  const average = total / config.days;
  const peak = Math.max(...values, 0);
  const hasSales = total > 0;

  const yMax = peak > 0 ? peak : 1;
  const points = values.map((value, i) => [
    values.length > 1 ? (i / (values.length - 1)) * VIEW_W : VIEW_W / 2,
    PAD_TOP + (1 - value / yMax) * PLOT_H,
  ]);

  const stripes = useMemo(() => {
    const lines = [];
    for (let x = 0; x <= VIEW_W; x += STRIPE_PITCH) {
      const top = Math.max(PAD_TOP, Math.min(PAD_TOP + PLOT_H, curveYAt(x, points)));
      lines.push({ x, top });
    }
    return lines;
  }, [points]);

  // Redraw: the stripes wipe in from the left each time the period changes.
  useEffect(() => {
    setRevealWidth(0);
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setRevealWidth(VIEW_W + STRIPE_PITCH * 2));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [period]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => {
      if (chipRef.current && !chipRef.current.contains(event.target)) setMenuOpen(false);
    };
    const escape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", escape);
    };
  }, [menuOpen]);

  const labelEvery = config.days <= 7 ? 1 : config.days <= 14 ? 2 : 5;
  const hovered = hoverIndex !== null ? series[hoverIndex] : null;
  const hoverPoint = hoverIndex !== null ? points[hoverIndex] : null;

  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.round(ratio * (series.length - 1));
    setHoverIndex(Math.max(0, Math.min(series.length - 1, index)));
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-3.5 md:p-5 shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-[10px] md:text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          <Store className="w-3.5 h-3.5" aria-hidden="true" />
          Daily sales
        </p>
        {onOpenDetail && (
          <button
            type="button"
            onClick={onOpenDetail}
            className="text-[11px] md:text-xs font-medium text-primary hover:underline"
          >
            View breakdown
          </button>
        )}
      </div>

      <div className="flex items-end justify-between gap-3 mt-3 md:mt-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl md:text-4xl font-semibold tracking-tight text-foreground tabular-nums">
              {showSymbol ? symbol : ""}
              {Math.round(average).toLocaleString("en-US")}
            </span>
            <span className="text-[11px] md:text-xs text-muted-foreground">/ day</span>
          </div>
          <p className="text-[11px] md:text-xs text-muted-foreground mt-1">
            Average for {config.caption}
          </p>
        </div>

        <div className="relative flex-shrink-0" ref={chipRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] md:text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {config.label}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-20 mt-2 w-32 rounded-lg border border-border bg-popover p-1.5 shadow-xl"
            >
              {Object.entries(PERIODS).map(([key, option]) => (
                <button
                  key={key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={period === key}
                  onClick={() => {
                    setMenuOpen(false);
                    setHoverIndex(null);
                    setPeriod(key);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[11px] md:text-xs ${
                    period === key
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {option.label}
                  <Check className={`w-3 h-3 ${period === key ? "opacity-100" : "opacity-0"}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        {/* y-axis: top, middle and baseline of the plot */}
        <div className="relative h-28 md:h-40 w-10 md:w-12 flex-shrink-0" aria-hidden="true">
          {[1, 0.5, 0].map((level) => {
            const value = yMax * level;
            const top = PAD_TOP + (1 - value / yMax) * PLOT_H;
            return (
              <span
                key={level}
                className="absolute left-0 -translate-y-1/2 text-[9px] md:text-[10px] tabular-nums text-muted-foreground whitespace-nowrap"
                style={{ top: `${(top / VIEW_H) * 100}%` }}
              >
                {compactMoney(value, symbol, showSymbol)}
              </span>
            );
          })}
        </div>

        <div
          className="relative flex-1 h-28 md:h-40"
          onPointerMove={handleMove}
          onPointerLeave={() => setHoverIndex(null)}
          role="img"
          aria-label={
            hasSales
              ? `Daily sales for ${config.caption}, averaging ${formatCurrency(average, currency, showSymbol)} a day`
              : `No sales recorded in ${config.caption}`
          }
        >
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="none"
            className="block w-full h-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <clipPath id={clipId}>
                <rect
                  x={-STRIPE_PITCH}
                  y={0}
                  width={revealWidth}
                  height={VIEW_H}
                  style={{ transition: "width 1.1s cubic-bezier(0.22, 0.61, 0.36, 1)" }}
                />
              </clipPath>
            </defs>

            <g clipPath={`url(#${clipId})`}>
              {stripes.map((stripe) => (
                <line
                  key={stripe.x}
                  x1={stripe.x}
                  y1={stripe.top.toFixed(1)}
                  x2={stripe.x}
                  y2={VIEW_H}
                  stroke="hsl(var(--primary))"
                  strokeOpacity="0.45"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              ))}
            </g>

            {hoverPoint && (
              <line
                x1={hoverPoint[0]}
                y1={hoverPoint[1]}
                x2={hoverPoint[0]}
                y2={VIEW_H}
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>

          {hoverPoint && (
            <>
              <span
                className="pointer-events-none absolute w-3 h-3 rounded-full border-2 border-primary bg-card"
                style={{
                  left: `${(hoverPoint[0] / VIEW_W) * 100}%`,
                  top: `${(hoverPoint[1] / VIEW_H) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
                aria-hidden="true"
              />
              <span
                className="pointer-events-none absolute z-10 whitespace-nowrap rounded-full bg-primary px-2.5 py-1 text-[10px] md:text-xs font-medium text-primary-foreground shadow-lg"
                style={{
                  left: `${Math.min(84, Math.max(16, (hoverPoint[0] / VIEW_W) * 100))}%`,
                  top: `${(hoverPoint[1] / VIEW_H) * 100}%`,
                  transform: "translate(-50%, calc(-100% - 12px))",
                }}
              >
                {format(hovered.date, "d MMM")} · {formatCurrency(hovered.total, currency, showSymbol)}
              </span>
            </>
          )}

          {!hasSales && (
            <p className="absolute inset-0 flex items-center justify-center text-[11px] md:text-xs text-muted-foreground">
              No sales in {config.caption}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-between gap-2 ml-12 md:ml-14 mt-1.5 text-[9px] md:text-[10px] text-muted-foreground">
        {series
          .filter((_, i) => i % labelEvery === 0 || i === series.length - 1)
          .map((day) => (
            <span key={day.date.toISOString()} className="tabular-nums">
              {config.days <= 7 ? format(day.date, "EEE") : format(day.date, "d MMM")}
            </span>
          ))}
      </div>
    </section>
  );
}