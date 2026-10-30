import React from "react";
import { Badge } from "@/components/ui/badge";

function Section({ title, rows, total, money, tone }) {
  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-y border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{title}</h3>
        <span className={`text-sm font-bold tabular-nums ${tone}`}>{money(total)}</span>
      </div>
      <div className="divide-y">
        {rows.length === 0 ? (
          <p className="px-3 py-2 text-sm text-slate-400">Nothing recorded.</p>
        ) : (
          rows.map((row) => (
            <div key={row.code} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="text-slate-700">
                <span className="font-mono text-xs text-slate-400 mr-2">{row.code}</span>
                {row.name}
              </span>
              <span className="tabular-nums text-slate-900">{money(row.amount)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Balance sheet: what the branch owns, owes, and is worth, as of the period end.
 */
export default function BalanceSheetView({ data, money }) {
  const balanced = Math.abs(data.difference) < 0.01;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={balanced ? "outline" : "destructive"} className={balanced ? "text-emerald-700 border-emerald-300" : ""}>
          {balanced ? "Assets = Liabilities + Equity" : "Check the journal — figures differ"}
        </Badge>
        <span className="text-xs text-slate-500">
          Profit for the period {money(data.netIncome)}
        </span>
      </div>

      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <Section title="Assets" rows={data.assets} total={data.totalAssets} money={money} tone="text-blue-700" />
        <Section title="Liabilities" rows={data.liabilities} total={data.totalLiabilities} money={money} tone="text-amber-700" />
        <Section
          title="Equity"
          rows={[...data.equity, { code: "—", name: "Profit for the period", amount: data.netIncome }].filter(
            (row) => Math.abs(row.amount) > 0.004
          )}
          total={data.totalEquity}
          money={money}
          tone="text-purple-700"
        />
        <div className="flex items-center justify-between px-3 py-3 bg-slate-900 text-white">
          <span className="text-sm font-semibold">Liabilities + Equity</span>
          <span className="font-bold tabular-nums">{money(data.totalLiabilities + data.totalEquity)}</span>
        </div>
      </div>
    </div>
  );
}