import React from "react";
import { Badge } from "@/components/ui/badge";

const TYPE_LABELS = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  income: "Income",
  expense: "Expense",
};

/**
 * Trial balance: every account's debits, credits and closing balance.
 */
export default function TrialBalanceTable({ rows, money }) {
  const totalDebit = rows.reduce((sum, row) => sum + row.debitBalance, 0);
  const totalCredit = rows.reduce((sum, row) => sum + row.creditBalance, 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant={balanced ? "outline" : "destructive"} className={balanced ? "text-emerald-700 border-emerald-300" : ""}>
          {balanced ? "Balanced" : "Out of balance"}
        </Badge>
        <span className="text-xs text-slate-500">
          Debits {money(totalDebit)} · Credits {money(totalCredit)}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3 font-semibold text-slate-700">Code</th>
              <th className="text-left p-3 font-semibold text-slate-700">Account</th>
              <th className="text-left p-3 font-semibold text-slate-700 hidden sm:table-cell">Type</th>
              <th className="text-right p-3 font-semibold text-slate-700">Debit</th>
              <th className="text-right p-3 font-semibold text-slate-700">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  No transactions in this period yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.code} className="hover:bg-slate-50">
                  <td className="p-3 font-mono text-slate-500">{row.code}</td>
                  <td className="p-3 text-slate-900">{row.name}</td>
                  <td className="p-3 hidden sm:table-cell">
                    <Badge variant="outline" className="capitalize">{TYPE_LABELS[row.type] || row.type}</Badge>
                  </td>
                  <td className="p-3 text-right tabular-nums text-slate-700">
                    {row.debitBalance ? money(row.debitBalance) : "—"}
                  </td>
                  <td className="p-3 text-right tabular-nums text-slate-700">
                    {row.creditBalance ? money(row.creditBalance) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-slate-50 border-t font-semibold">
              <tr>
                <td className="p-3" colSpan={3}>Total</td>
                <td className="p-3 text-right tabular-nums">{money(totalDebit)}</td>
                <td className="p-3 text-right tabular-nums">{money(totalCredit)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}