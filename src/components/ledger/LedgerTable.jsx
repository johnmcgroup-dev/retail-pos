import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { accountName } from "@/lib/accounting";

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

const SOURCE_TONES = {
  sale: "bg-emerald-100 text-emerald-700",
  sale_cogs: "bg-slate-100 text-slate-600",
  purchase: "bg-rose-100 text-rose-700",
  expense: "bg-rose-100 text-rose-700",
  payroll: "bg-amber-100 text-amber-700",
  return: "bg-blue-100 text-blue-700",
  return_stock: "bg-slate-100 text-slate-600",
  manual: "bg-slate-100 text-slate-600",
};

/**
 * Every entry in date order. Tap a row to see the accounts it moved.
 */
export default function LedgerTable({ rows, money, showBranch }) {
  const [openId, setOpenId] = useState(null);
  const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="w-8 p-3" />
            <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Date</th>
            <th className="text-left p-3 font-semibold text-slate-700">Type</th>
            <th className="text-left p-3 font-semibold text-slate-700">Details</th>
            {showBranch && <th className="text-left p-3 font-semibold text-slate-700 hidden lg:table-cell">Branch</th>}
            <th className="text-right p-3 font-semibold text-slate-700">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={showBranch ? 6 : 5} className="p-8 text-center text-slate-400">
                No sales, expenses or payroll in this period.
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const open = openId === row.id;
              return (
                <React.Fragment key={row.id}>
                  <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => setOpenId(open ? null : row.id)}>
                    <td className="p-3 text-slate-400">
                      {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{row.date}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${SOURCE_TONES[row.source] || "bg-slate-100 text-slate-600"}`}>
                        {SOURCE_LABELS[row.source] || row.source}
                      </span>
                    </td>
                    <td className="p-3 text-slate-900">
                      {row.description}
                      {row.reference ? <span className="text-xs text-slate-400 ml-2">{row.reference}</span> : null}
                    </td>
                    {showBranch && <td className="p-3 text-slate-500 hidden lg:table-cell">{row.branch_name || "—"}</td>}
                    <td className="p-3 text-right tabular-nums font-medium text-slate-900">{money(row.amount)}</td>
                  </tr>
                  {open && (
                    <tr className="bg-slate-50/60">
                      <td />
                      <td colSpan={showBranch ? 5 : 4} className="p-3">
                        <table className="w-full text-xs">
                          <tbody>
                            {(row.lines || []).map((line, index) => (
                              <tr key={`${row.id}-${index}`}>
                                <td className="py-1 pr-3 text-slate-500 whitespace-nowrap">
                                  {line.code} · {accountName(line.code)}
                                </td>
                                <td className="py-1 pr-3 text-right tabular-nums text-emerald-700">
                                  {line.debit ? money(line.debit) : "—"}
                                </td>
                                <td className="py-1 text-right tabular-nums text-rose-700">
                                  {line.credit ? money(line.credit) : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot className="bg-slate-50 border-t font-semibold">
            <tr>
              <td colSpan={showBranch ? 5 : 4} className="p-3 text-slate-700">
                {rows.length} {rows.length === 1 ? "entry" : "entries"}
              </td>
              <td className="p-3 text-right tabular-nums text-slate-900">{money(total)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}