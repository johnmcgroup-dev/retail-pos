import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ACCOUNT_TYPES } from "@/lib/accounting";

const TYPE_TONES = {
  asset: "bg-blue-50 text-blue-700 border-blue-200",
  liability: "bg-amber-50 text-amber-700 border-amber-200",
  equity: "bg-purple-50 text-purple-700 border-purple-200",
  income: "bg-emerald-50 text-emerald-700 border-emerald-200",
  expense: "bg-rose-50 text-rose-700 border-rose-200",
};

/**
 * The chart of accounts: what the books can hold, grouped by account class.
 */
export default function ChartOfAccounts({ accounts, companyId, onChanged }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ code: "", name: "", type: "expense" });

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      setError("Give the account a code and a name.");
      return;
    }
    if (accounts.some((account) => account.code === form.code.trim())) {
      setError("That code is already used.");
      return;
    }
    setSaving(true);
    try {
      await base44.entities.LedgerAccount.create({
        company_id: companyId,
        code: form.code.trim(),
        name: form.name.trim(),
        type: form.type,
      });
      setForm({ code: "", name: "", type: "expense" });
      setError("");
      setOpen(false);
      onChanged();
    } catch (err) {
      setError(err?.message || "Could not save the account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-slate-500">
          {accounts.length} accounts in the books
        </p>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Add account</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3 font-semibold text-slate-700">Code</th>
              <th className="text-left p-3 font-semibold text-slate-700">Account</th>
              <th className="text-left p-3 font-semibold text-slate-700">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {accounts.map((account) => (
              <tr key={account.id || account.code} className="hover:bg-slate-50">
                <td className="p-3 font-mono text-slate-500">{account.code}</td>
                <td className="p-3 text-slate-900">{account.name}</td>
                <td className="p-3">
                  <Badge variant="outline" className={`capitalize ${TYPE_TONES[account.type] || ""}`}>
                    {account.type}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New account</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-slate-500">Code</Label>
              <Input
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
                placeholder="e.g. 6300"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Name</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="e.g. Bank Charges"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Type</Label>
              <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Add account"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}