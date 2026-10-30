import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DrawerSelect from "@/components/shared/DrawerSelect";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/components/utils";
import { Loader2, Search, User, Wallet } from "lucide-react";

/**
 * Takes an outstanding payment from a customer on its own — no cart, no new sale.
 * The money clears the customer's oldest unpaid invoices first, then their
 * running balance, and is recorded as a payment for the books.
 */
export default function CustomerPaymentDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const result = await base44.entities.Customer.list("-created_date", 300);
      return result.items || (Array.isArray(result) ? result : []);
    },
    enabled: open,
  });

  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    return customers
      .filter(
        (c) =>
          !term ||
          (c.name || "").toLowerCase().includes(term) ||
          (c.phone || "").includes(term) ||
          (c.email || "").toLowerCase().includes(term)
      )
      .sort((a, b) => (b.outstanding_balance || 0) - (a.outstanding_balance || 0));
  }, [customers, search]);

  const balance = Number(selected?.outstanding_balance || 0);
  const value = Number(amount || 0);

  const reset = () => {
    setSelected(null);
    setAmount("");
    setNotes("");
    setError("");
    setSearch("");
    setMethod("cash");
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const pick = (customer) => {
    setSelected(customer);
    setAmount(customer.outstanding_balance ? String(customer.outstanding_balance) : "");
    setError("");
  };

  const submit = async () => {
    setError("");
    if (!selected) return setError("Choose the customer paying.");
    if (!(value > 0)) return setError("Enter the amount received.");
    if (value > balance + 0.01) return setError(`That is more than the ${formatCurrency(balance)} owed.`);

    setSaving(true);
    try {
      const now = new Date().toISOString();

      // Oldest unpaid invoices clear first
      const sales = await base44.entities.Sale.filter({ customer_id: selected.id });
      const unpaid = sales
        .filter((s) => (s.amount_due || 0) > 0.01 || ["unpaid", "partial"].includes(s.payment_status))
        .sort((a, b) => new Date(a.sale_date || a.created_date) - new Date(b.sale_date || b.created_date));

      let remaining = value;
      for (const sale of unpaid) {
        if (remaining <= 0) break;
        const due = Math.max(0, sale.amount_due || (sale.total_amount || 0) - (sale.amount_paid || 0));
        if (due <= 0) continue;
        const pay = Math.min(due, remaining);
        const paid = (sale.amount_paid || 0) + pay;
        const stillDue = Math.max(0, (sale.total_amount || 0) - paid);
        await base44.entities.Sale.update(sale.id, {
          amount_paid: paid,
          amount_due: stillDue,
          payment_status: stillDue <= 0.01 ? "paid" : "partial",
        });
        remaining -= pay;
      }

      await base44.entities.Customer.update(selected.id, {
        outstanding_balance: Math.max(0, balance - value),
      });

      await base44.entities.Payment.create({
        company_id: selected.company_id,
        reference_type: "sale",
        reference_id: unpaid[0]?.id,
        payer_type: "customer",
        payer_id: selected.id,
        payer_name: selected.name,
        payment_date: now,
        amount: value,
        payment_method: method,
        payment_status: "completed",
        transaction_reference: `PMT-${Date.now().toString().slice(-8)}`,
        notes: notes || "Outstanding payment received",
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customers"] }),
        queryClient.invalidateQueries({ queryKey: ["sales"] }),
        queryClient.invalidateQueries({ queryKey: ["payments"] }),
      ]);

      toast({ title: "Payment recorded", description: `${formatCurrency(value)} from ${selected.name}` });
      close();
    } catch (err) {
      setError(err.message || "The payment could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-green-600" />
            Receive Customer Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {!selected ? (
            <>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customer by name or phone"
                  className="pl-9"
                />
              </div>
              <div className="max-h-72 overflow-auto divide-y border border-slate-200 rounded-lg">
                {isLoading ? (
                  <div className="p-6 text-center"><Loader2 className="w-5 h-5 mx-auto animate-spin text-slate-400" /></div>
                ) : results.length === 0 ? (
                  <p className="p-6 text-center text-sm text-slate-400">No customer found</p>
                ) : (
                  results.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => pick(customer)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <User className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{customer.name}</p>
                        {customer.phone && <p className="text-[11px] text-slate-400">{customer.phone}</p>}
                      </div>
                      <span className={`text-xs font-semibold ${(customer.outstanding_balance || 0) > 0 ? "text-red-600" : "text-slate-400"}`}>
                        {formatCurrency(customer.outstanding_balance || 0)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg bg-slate-50 p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{selected.name}</p>
                  <p className="text-xs text-slate-500">Outstanding balance</p>
                </div>
                <span className="text-lg font-bold text-red-600">{formatCurrency(balance)}</span>
              </div>

              <div>
                <Label className="text-xs">Amount received</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1"
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label className="text-xs">Payment method</Label>
                <DrawerSelect
                  value={method}
                  onValueChange={setMethod}
                  options={[
                    { value: "cash", label: "Cash" },
                    { value: "card", label: "Card" },
                    { value: "bank_transfer", label: "Bank Transfer" },
                    { value: "mobile_money", label: "Mobile Money" },
                  ]}
                  label="Payment method"
                  placeholder="Select method"
                  triggerClassName="w-full h-9 border border-input bg-background rounded-md px-3 text-sm mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Note</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="mt-1" />
              </div>
            </>
          )}

          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="flex gap-2 justify-end pt-1">
            {selected && (
              <Button variant="ghost" onClick={() => { setSelected(null); setError(""); }}>Back</Button>
            )}
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !selected} className="gap-2 bg-green-600 hover:bg-green-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
              Record payment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}