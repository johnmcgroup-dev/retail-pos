import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currentPeriod, payrollLine, periodEnd, periodLabel, summariseLines } from "@/lib/payroll";

/**
 * Generate a payroll run for one period and branch from the staff pay setup.
 */
export default function RunPayrollDialog({ open, onClose, companyId, branches = [], activeBranchId, staff = [], money, onSaved, processedBy }) {
  const [period, setPeriod] = useState(currentPeriod());
  const [branchId, setBranchId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setPeriod(currentPeriod());
    setBranchId(activeBranchId || branches[0]?.id || "");
    setNotes("");
    setError("");
  }, [open, activeBranchId, branches]);

  const lines = useMemo(
    () =>
      staff
        .filter((person) => person.status !== "inactive")
        .filter((person) => (branchId ? person.branch_id === branchId || !person.branch_id : true))
        .map(payrollLine),
    [staff, branchId]
  );
  const totals = useMemo(() => summariseLines(lines), [lines]);

  const save = async () => {
    if (!lines.length) {
      setError("No active employees to pay for this branch.");
      return;
    }
    setSaving(true);
    try {
      const branch = branches.find((b) => b.id === branchId);
      await base44.entities.PayrollRun.create({
        company_id: companyId,
        branch_id: branchId || "",
        branch_name: branch?.name || "",
        period,
        period_label: periodLabel(period),
        payroll_date: periodEnd(period),
        status: "draft",
        lines,
        totals,
        notes,
        processed_by: processedBy || "",
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.message || "Could not generate this payroll run.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate payroll</DialogTitle>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-500">Period</Label>
            <Input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Branch</Label>
            <Select value={branchId || "none"} onValueChange={(value) => setBranchId(value === "none" ? "" : value)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="All branches" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs text-slate-500">Notes (optional)</Label>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1" placeholder="e.g. October salary payment" />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-2 font-semibold text-slate-700">Employee</th>
                <th className="text-right p-2 font-semibold text-slate-700">Gross</th>
                <th className="text-right p-2 font-semibold text-slate-700">Tax</th>
                <th className="text-right p-2 font-semibold text-slate-700">Deductions</th>
                <th className="text-right p-2 font-semibold text-slate-700">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    No active employees for this branch.
                  </td>
                </tr>
              ) : (
                lines.map((line) => (
                  <tr key={line.staff_id}>
                    <td className="p-2 text-slate-900">
                      {line.full_name}
                      <span className="text-xs text-slate-400 ml-2">{line.employee_number}</span>
                    </td>
                    <td className="p-2 text-right tabular-nums">{money(line.gross)}</td>
                    <td className="p-2 text-right tabular-nums text-rose-600">{money(line.tax)}</td>
                    <td className="p-2 text-right tabular-nums text-rose-600">{money(line.other_deductions)}</td>
                    <td className="p-2 text-right tabular-nums font-semibold">{money(line.net_pay)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 border-t font-semibold">
              <tr>
                <td className="p-2">{totals.headcount} employees</td>
                <td className="p-2 text-right tabular-nums">{money(totals.gross)}</td>
                <td className="p-2 text-right tabular-nums">{money(totals.tax)}</td>
                <td className="p-2 text-right tabular-nums">{money(totals.other_deductions)}</td>
                <td className="p-2 text-right tabular-nums">{money(totals.net)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !lines.length}>
            {saving ? "Generating…" : "Generate payroll"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}