import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Power } from "lucide-react";
import { roleLabel } from "@/lib/payroll";

/**
 * Staff directory with each employee's pay setup.
 */
export default function StaffTable({ staff = [], branches = [], money, onEdit, onDelete, onToggle }) {
  const branchName = (id) => branches.find((branch) => branch.id === id)?.name || "—";

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left p-3 font-semibold text-slate-700">Employee</th>
            <th className="text-left p-3 font-semibold text-slate-700 hidden md:table-cell">Role</th>
            <th className="text-left p-3 font-semibold text-slate-700 hidden lg:table-cell">Branch</th>
            <th className="text-right p-3 font-semibold text-slate-700">Basic</th>
            <th className="text-right p-3 font-semibold text-slate-700">Allowances</th>
            <th className="text-right p-3 font-semibold text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {staff.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-8 text-center text-slate-400">
                No employees yet — add your first one to start payroll.
              </td>
            </tr>
          ) : (
            staff.map((person) => (
              <tr key={person.id} className={`hover:bg-slate-50 ${person.status === "inactive" ? "opacity-60" : ""}`}>
                <td className="p-3">
                  <p className="font-medium text-slate-900">{person.full_name}</p>
                  <p className="text-xs text-slate-500">
                    {person.employee_number || "No number"}
                    {person.job_title ? ` · ${person.job_title}` : ""}
                  </p>
                </td>
                <td className="p-3 hidden md:table-cell">
                  <Badge variant="outline">{roleLabel(person.role_level)}</Badge>
                </td>
                <td className="p-3 text-slate-600 hidden lg:table-cell">{branchName(person.branch_id)}</td>
                <td className="p-3 text-right tabular-nums text-slate-900">{money(person.base_salary)}</td>
                <td className="p-3 text-right tabular-nums text-slate-600">{money(person.allowances)}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => onToggle(person)} title={person.status === "active" ? "Deactivate" : "Reactivate"}>
                      <Power className={`w-4 h-4 ${person.status === "active" ? "text-emerald-600" : "text-slate-400"}`} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => onEdit(person)}>
                      <Pencil className="w-4 h-4 text-slate-500" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => onDelete(person)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}