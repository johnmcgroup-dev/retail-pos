import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function RecordVendorPaymentDialog({ open, onClose, vendors, company, preselectedVendorId }) {
  const queryClient = useQueryClient();
  const [vendorId, setVendorId] = useState(preselectedVendorId || "");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const selectedVendor = vendors.find(v => v.id === vendorId);

  const recordPayment = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(amount);
      if (!vendorId) throw new Error("Please select a vendor");
      if (!amt || amt <= 0) throw new Error("Please enter a valid amount");

      const vendor = vendors.find(v => v.id === vendorId);
      if (!vendor) throw new Error("Vendor not found");

      // Create the payment record
      await base44.entities.Payment.create({
        company_id: company?.id,
        reference_type: "purchase",
        payer_type: "vendor",
        payer_id: vendor.id,
        payer_name: vendor.name,
        payment_date: new Date().toISOString(),
        amount: amt,
        payment_method: paymentMethod,
        payment_gateway: "manual",
        transaction_reference: reference || undefined,
        payment_status: "completed",
        notes: notes || undefined,
      });

      // Update vendor's outstanding balance
      const newBalance = Math.max(0, (vendor.outstanding_balance || 0) - amt);
      await base44.entities.Vendor.update(vendor.id, {
        outstanding_balance: newBalance,
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      handleClose();
    },
    onError: (err) => {
      setError(err.message || "Failed to record payment");
    },
  });

  const handleClose = () => {
    setVendorId(preselectedVendorId || "");
    setAmount("");
    setPaymentMethod("bank_transfer");
    setReference("");
    setNotes("");
    setError("");
    recordPayment.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Vendor Payment</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Vendor *</Label>
            <Select value={vendorId} onValueChange={setVendorId} disabled={!!preselectedVendorId}>
              <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
              <SelectContent>
                {vendors.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name} {v.outstanding_balance > 0 ? `(Owes ₦${(v.outstanding_balance || 0).toLocaleString()})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Amount (₦) *</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="text-lg font-semibold"
            />
            {selectedVendor?.outstanding_balance > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                Outstanding: ₦{(selectedVendor.outstanding_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>

          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Reference / Transaction ID</Label>
            <Input
              placeholder="e.g. TRF-2024-001"
              value={reference}
              onChange={e => setReference(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Notes</Label>
            <Textarea
              placeholder="Optional notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={recordPayment.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => recordPayment.mutate()}
            disabled={recordPayment.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {recordPayment.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Recording...</>
            ) : (
              "Record Payment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}