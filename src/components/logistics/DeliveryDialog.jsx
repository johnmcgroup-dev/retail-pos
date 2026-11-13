import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const EMPTY = {
  customer_name: "",
  customer_phone: "",
  delivery_address: "",
  item_summary: "",
  fare: "",
  payment_method: "cash",
  rider_name: "",
  rider_phone: "",
  scheduled_date: format(new Date(), "yyyy-MM-dd"),
  notes: "",
};

export default function DeliveryDialog({ open, onClose, onSave, saving, error }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) setForm(EMPTY);
  }, [open]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    if (!form.customer_name.trim() || !form.delivery_address.trim()) return;
    onSave({
      ...form,
      fare: Number(form.fare) || 0,
      status: form.rider_name.trim() ? "assigned" : "pending",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New delivery</DialogTitle>
          <DialogDescription>
            Record the customer, the agreed fare and who is carrying it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="dl-customer">Customer</Label>
              <Input
                id="dl-customer"
                value={form.customer_name}
                onChange={(e) => set("customer_name", e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="dl-phone">Phone</Label>
              <Input
                id="dl-phone"
                value={form.customer_phone}
                onChange={(e) => set("customer_phone", e.target.value)}
                className="mt-1"
                placeholder="0801 234 5678"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="dl-address">Delivery address</Label>
            <Textarea
              id="dl-address"
              value={form.delivery_address}
              onChange={(e) => set("delivery_address", e.target.value)}
              className="mt-1"
              rows={2}
              required
            />
          </div>

          <div>
            <Label htmlFor="dl-items">What is being sent</Label>
            <Input
              id="dl-items"
              value={form.item_summary}
              onChange={(e) => set("item_summary", e.target.value)}
              className="mt-1"
              placeholder="e.g. 2 cartons of noodles"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="dl-fare">Agreed fare</Label>
              <Input
                id="dl-fare"
                type="number"
                min="0"
                step="0.01"
                value={form.fare}
                onChange={(e) => set("fare", e.target.value)}
                className="mt-1"
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="dl-payment">Fare paid by</Label>
              <select
                id="dl-payment"
                value={form.payment_method}
                onChange={(e) => set("payment_method", e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="pos">Card / POS</option>
                <option value="prepaid">Prepaid by store</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="dl-rider">Rider</Label>
              <Input
                id="dl-rider"
                value={form.rider_name}
                onChange={(e) => set("rider_name", e.target.value)}
                className="mt-1"
                placeholder="Who is delivering"
              />
            </div>
            <div>
              <Label htmlFor="dl-rider-phone">Rider phone</Label>
              <Input
                id="dl-rider-phone"
                value={form.rider_phone}
                onChange={(e) => set("rider_phone", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="dl-date">Delivery date</Label>
            <Input
              id="dl-date"
              type="date"
              value={form.scheduled_date}
              onChange={(e) => set("scheduled_date", e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="dl-notes">Notes</Label>
            <Textarea
              id="dl-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <DialogFooter className="gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? "Saving…" : "Create delivery"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}