import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { employeeSummary, roleLabel, roleSummary } from "@/lib/payroll";

/**
 * Payroll totals grouped by role, plus each employee's running total.
 */
export default function RoleSummary({ runs = [], money }) {
  const byRole = useMemo(() => roleSummary(runs), [runs]);
  const byEmployee = useMemo(() => employeeSummary(runs), [runs]);

  if (!runs.length) {
    return (
      <p className="text-sm text-slate-500 p-6 text-center">
        Generate a payroll run to see summaries by role and employee.
      </p>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">By role</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 font-semibold text-slate-700">Role</th>
                  <th className="text-right p-3 font-semibold text-slate-700">Lines</th>
                  <th className="text-right p-3 font-semibold text-slate-700">Gross</th>
                  <th className="text-right p-3 font-semibold text-slate-700">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {byRole.map((row) => (
                  <tr key={row.role} className="hover:bg-slate-50">
                    <td className="p-3"><Badge variant="outline">{roleLabel(row.role)}</Badge></td>
                    <td className="p-3 text-right tabular-nums text-slate-600">{row.headcount}</td>
                    <td className="p-3 text-right tabular-nums text-slate-900">{money(row.gross)}</td>
                    <td className="p-3 text-right tabular-nums font-semibold text-slate-900">{money(row.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">By employee</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 font-semibold text-slate-700">Employee</th>
                  <th className="text-right p-3 font-semibold text-slate-700">Periods</th>
                  <th className="text-right p-3 font-semibold text-slate-700">Gross</th>
                  <th className="text-right p-3 font-semibold text-slate-700">Net paid</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {byEmployee.map((row) => (
                  <tr key={row.staff_id || row.full_name} className="hover:bg-slate-50">
                    <td className="p-3">
                      <p className="text-slate-900">{row.full_name}</p>
                      <p className="text-xs text-slate-500">
                        {roleLabel(row.role_level)}
                        {row.employee_number ? ` · ${row.employee_number}` : ""}
                      </p>
                    </td>
                    <td className="p-3 text-right tabular-nums text-slate-600">{row.periods}</td>
                    <td className="p-3 text-right tabular-nums text-slate-900">{money(row.gross)}</td>
                    <td className="p-3 text-right tabular-nums font-semibold text-slate-900">{money(row.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}