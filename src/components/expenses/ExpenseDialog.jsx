import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const CATEGORIES = [
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "salaries", label: "Salaries & Wages" },
  { value: "marketing", label: "Marketing & Advertising" },
  { value: "maintenance", label: "Maintenance & Repairs" },
  { value: "supplies", label: "Supplies" },
  { value: "transport", label: "Transport & Logistics" },
  { value: "insurance", label: "Insurance" },
  { value: "taxes", label: "Taxes & Licenses" },
  { value: "other", label: "Other" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "check", label: "Check" },
];

export default function ExpenseDialog({ open, onClose, editingExpense = null }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "supplies",
    amount: "",
    payment_method: "cash",
    vendor: "",
    description: "",
    notes: "",
  });

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me(), staleTime: 5 * 60 * 1000 });
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => base44.entities.Company.list() });
  const companyId = user?.company_id || user?.tenant_id || companies[0]?.id;

  useEffect(() => {
    if (open) {
      if (editingExpense) {
        setForm({
          date: editingExpense.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          category: editingExpense.category || "other",
          amount: String(editingExpense.amount ?? ""),
          payment_method: editingExpense.payment_method || "cash",
          vendor: editingExpense.vendor || "",
          description: editingExpense.description || "",
          notes: editingExpense.notes || "",
        });
      } else {
        setForm({
          date: new Date().toISOString().slice(0, 10),
          category: "supplies",
          amount: "",
          payment_method: "cash",
          vendor: "",
          description: "",
          notes: "",
        });
      }
    }
  }, [open, editingExpense]);

  const handleSave = async () => {
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      toast({ variant: "destructive", title: "Enter a valid amount" });
      return;
    }
    if (!companyId) {
      toast({ variant: "destructive", title: "No active company found" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        company_id: companyId,
        date: form.date,
        category: form.category,
        amount: parseFloat(form.amount),
        payment_method: form.payment_method,
        vendor: form.vendor,
        description: form.description,
        notes: form.notes,
      };
      if (editingExpense) {
        await base44.entities.Expense.update(editingExpense.id, payload);
        toast({ title: "Expense updated" });
      } else {
        await base44.entities.Expense.create(payload);
        toast({ title: "Expense recorded" });
      }
      queryClient.invalidateQueries(["expenses"]);
      onClose();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to save expense", description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingExpense ? "Edit Expense" : "Record Expense"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <Label>Category *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Amount *</Label>
            <Input type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <Label>Payment Method</Label>
            <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vendor / Payee</Label>
            <Input placeholder="e.g. NEPA, Joe's Supplies" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Input placeholder="What was this expense for?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} placeholder="Optional notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editingExpense ? "Update" : "Save"} Expense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}