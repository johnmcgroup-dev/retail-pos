import React, { useEffect, useState } from "react";
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
import { EMPLOYMENT_TYPES, PAYROLL_ROLES } from "@/lib/payroll";

const EMPTY = {
  full_name: "",
  email: "",
  phone: "",
  employee_number: "",
  job_title: "",
  role_level: "user",
  department: "",
  employment_type: "full_time",
  hire_date: "",
  base_salary: "",
  allowances: "",
  tax_rate: "",
  other_deductions: "",
  bank_name: "",
  bank_account_number: "",
  status: "active",
  branch_id: "",
};

/**
 * Add or edit an employee's HR and pay details.
 */
export default function StaffDialog({ open, onClose, editing, companyId, branches = [], onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(
      editing
        ? {
            ...EMPTY,
            ...editing,
            base_salary: editing.base_salary ?? "",
            allowances: editing.allowances ?? "",
            tax_rate: editing.tax_rate ?? "",
            other_deductions: editing.other_deductions ?? "",
          }
        : { ...EMPTY, branch_id: branches[0]?.id || "" }
    );
  }, [open, editing, branches]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (!form.full_name.trim()) {
      setError("Enter the employee's name.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        company_id: companyId,
        base_salary: Number(form.base_salary) || 0,
        allowances: Number(form.allowances) || 0,
        tax_rate: Number(form.tax_rate) || 0,
        other_deductions: Number(form.other_deductions) || 0,
      };
      if (editing) {
        await base44.entities.Staff.update(editing.id, payload);
      } else {
        await base44.entities.Staff.create(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.message || "Could not save this employee.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit employee" : "New employee"}</DialogTitle>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Label className="text-xs text-slate-500">Full name</Label>
            <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className="mt-1" placeholder="e.g. Ada Obi" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Employee number</Label>
            <Input value={form.employee_number} onChange={(e) => set("employee_number", e.target.value)} className="mt-1" placeholder="EMP-001" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Job title</Label>
            <Input value={form.job_title} onChange={(e) => set("job_title", e.target.value)} className="mt-1" placeholder="e.g. Cashier" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Role (used for payroll summaries)</Label>
            <Select value={form.role_level} onValueChange={(value) => set("role_level", value)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYROLL_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Branch</Label>
            <Select value={form.branch_id || "none"} onValueChange={(value) => set("branch_id", value === "none" ? "" : value)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not assigned</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Department</Label>
            <Input value={form.department} onChange={(e) => set("department", e.target.value)} className="mt-1" placeholder="e.g. Sales" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Employment type</Label>
            <Select value={form.employment_type} onValueChange={(value) => set("employment_type", value)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Hire date</Label>
            <Input type="date" value={form.hire_date || ""} onChange={(e) => set("hire_date", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Status</Label>
            <Select value={form.status} onValueChange={(value) => set("status", value)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Email</Label>
            <Input value={form.email} onChange={(e) => set("email", e.target.value)} className="mt-1" placeholder="name@company.com" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Phone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="mt-1" placeholder="080…" />
          </div>
        </div>

        <div className="border-t pt-3">
          <p className="text-sm font-semibold text-slate-700 mb-2">Monthly pay</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Basic salary</Label>
              <Input type="number" value={form.base_salary} onChange={(e) => set("base_salary", e.target.value)} className="mt-1" placeholder="0" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Allowances</Label>
              <Input type="number" value={form.allowances} onChange={(e) => set("allowances", e.target.value)} className="mt-1" placeholder="0" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Tax rate (%)</Label>
              <Input type="number" value={form.tax_rate} onChange={(e) => set("tax_rate", e.target.value)} className="mt-1" placeholder="0" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Other deductions</Label>
              <Input type="number" value={form.other_deductions} onChange={(e) => set("other_deductions", e.target.value)} className="mt-1" placeholder="0" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Bank</Label>
              <Input value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Account number</Label>
              <Input value={form.bank_account_number} onChange={(e) => set("bank_account_number", e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save employee"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}