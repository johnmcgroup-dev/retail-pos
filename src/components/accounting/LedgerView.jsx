import React, { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ledgerRows } from "@/lib/accounting";

const SOURCE_LABELS = {
  sale: "Sale",
  sale_cogs: "Cost of sale",
  purchase: "Purchase",
  expense: "Expense",
  return: "Refund",
  return_stock: "Stock returned",
  payroll: "Payroll",
  manual: "Manual",
};

/**
 * Every movement on one account, in date order, with a running balance.
 */
export default function LedgerView({ accounts, entries, money }) {
  const [code, setCode] = useState("");
  const withMovement = useMemo(() => {
    const used = new Set();
    entries.forEach((entry) => (entry.lines || []).forEach((line) => used.add(line.code)));
    return accounts.filter((account) => used.has(account.code));
  }, [accounts, entries]);

  const activeCode = code || withMovement[0]?.code || accounts[0]?.code || "";
  const rows = useMemo(() => ledgerRows(entries, activeCode), [entries, activeCode]);
  const totalDebit = rows.reduce((sum, row) => sum + row.debit, 0);
  const totalCredit = rows.reduce((sum, row) => sum + row.credit, 0);
  const closing = rows.length ? rows[rows.length - 1].balance : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={activeCode} onValueChange={setCode}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="Choose an account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.code} value={account.code}>
                {account.code} · {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-slate-500">
          {rows.length} {rows.length === 1 ? "movement" : "movements"} · Dr {money(totalDebit)} · Cr {money(totalCredit)}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Date</th>
              <th className="text-left p-3 font-semibold text-slate-700">Description</th>
              <th className="text-left p-3 font-semibold text-slate-700 hidden md:table-cell">Source</th>
              <th className="text-right p-3 font-semibold text-slate-700">Debit</th>
              <th className="text-right p-3 font-semibold text-slate-700">Credit</th>
              <th className="text-right p-3 font-semibold text-slate-700">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  No movements on this account in the selected period.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="p-3 text-slate-600 whitespace-nowrap">{row.date}</td>
                  <td className="p-3 text-slate-900">
                    {row.description}
                    {row.reference ? <span className="text-xs text-slate-400 ml-2">{row.reference}</span> : null}
                  </td>
                  <td className="p-3 text-slate-500 hidden md:table-cell">{SOURCE_LABELS[row.source] || row.source}</td>
                  <td className="p-3 text-right tabular-nums text-emerald-700">{row.debit ? money(row.debit) : "—"}</td>
                  <td className="p-3 text-right tabular-nums text-rose-700">{row.credit ? money(row.credit) : "—"}</td>
                  <td className="p-3 text-right tabular-nums font-medium text-slate-900">{money(row.balance)}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-slate-50 border-t font-semibold">
              <tr>
                <td className="p-3" colSpan={3}>Closing balance</td>
                <td className="p-3 text-right tabular-nums">{money(totalDebit)}</td>
                <td className="p-3 text-right tabular-nums">{money(totalCredit)}</td>
                <td className="p-3 text-right tabular-nums">{money(closing)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}