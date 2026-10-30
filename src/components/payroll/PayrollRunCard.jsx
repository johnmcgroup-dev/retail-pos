import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Trash2, CheckCircle2, BadgeCheck } from "lucide-react";
import { roleLabel } from "@/lib/payroll";

const STATUS_STYLES = {
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

/**
 * One payroll run with its per-employee lines and status actions.
 */
export default function PayrollRunCard({ run, money, onStatusChange, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const totals = run.totals || {};

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900">{run.period_label || run.period}</h3>
              <Badge variant="outline" className={`capitalize ${STATUS_STYLES[run.status] || ""}`}>{run.status}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {run.branch_name || "All branches"} · {totals.headcount || run.lines?.length || 0} employees
              {run.processed_by ? ` · by ${run.processed_by}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right mr-2">
              <p className="text-xs text-slate-500">Net payable</p>
              <p className="font-bold text-slate-900 tabular-nums">{money(totals.net)}</p>
            </div>
            {run.status === "draft" && (
              <Button size="sm" variant="outline" className="gap-1" onClick={() => onStatusChange(run, "approved")}>
                <CheckCircle2 className="w-4 h-4" /> Approve
              </Button>
            )}
            {run.status === "approved" && (
              <Button size="sm" variant="outline" className="gap-1" onClick={() => onStatusChange(run, "paid")}>
                <BadgeCheck className="w-4 h-4" /> Mark paid
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={() => onDelete(run)}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setExpanded((value) => !value)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-2 font-semibold text-slate-700">Employee</th>
                  <th className="text-left p-2 font-semibold text-slate-700 hidden sm:table-cell">Role</th>
                  <th className="text-right p-2 font-semibold text-slate-700">Basic</th>
                  <th className="text-right p-2 font-semibold text-slate-700">Allowances</th>
                  <th className="text-right p-2 font-semibold text-slate-700">Tax</th>
                  <th className="text-right p-2 font-semibold text-slate-700">Other</th>
                  <th className="text-right p-2 font-semibold text-slate-700">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(run.lines || []).map((line, index) => (
                  <tr key={`${line.staff_id}-${index}`}>
                    <td className="p-2 text-slate-900">
                      {line.full_name}
                      <span className="text-xs text-slate-400 ml-2">{line.employee_number}</span>
                    </td>
                    <td className="p-2 text-slate-600 hidden sm:table-cell">{roleLabel(line.role_level)}</td>
                    <td className="p-2 text-right tabular-nums">{money(line.base_salary)}</td>
                    <td className="p-2 text-right tabular-nums">{money(line.allowances)}</td>
                    <td className="p-2 text-right tabular-nums text-rose-600">{money(line.tax)}</td>
                    <td className="p-2 text-right tabular-nums text-rose-600">{money(line.other_deductions)}</td>
                    <td className="p-2 text-right tabular-nums font-semibold">{money(line.net_pay)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t font-semibold">
                <tr>
                  <td className="p-2" colSpan={2}>Total</td>
                  <td className="p-2" colSpan={3} />
                  <td className="p-2 text-right tabular-nums">{money(totals.tax)}</td>
                  <td className="p-2 text-right tabular-nums">{money(totals.net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {run.notes ? <p className="text-xs text-slate-500">{run.notes}</p> : null}
      </CardContent>
    </Card>
  );
}