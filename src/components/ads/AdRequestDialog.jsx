import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
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
import { AD_DURATIONS, AD_PLACEMENTS, adPrice } from "@/lib/adPricing";
import { formatCurrency } from "@/components/utils";

const EMPTY = {
  product_id: "",
  headline: "",
  placement: "storefront_featured",
  duration_days: 7,
  notes: "",
  payment_reference: "",
};

export default function AdRequestDialog({
  open,
  onClose,
  products = [],
  company,
  currency = "NGN",
  showSymbol = true,
  onSubmitted,
}) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setError("");
    }
  }, [open]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const price = adPrice(form.placement, form.duration_days);
  const product = products.find((p) => p.id === form.product_id);

  const submit = async () => {
    if (!product) {
      setError("Choose the product you want to promote.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await base44.entities.ProductAd.create({
        company_id: company?.id,
        company_name: company?.store_name || company?.name,
        product_id: product.id,
        product_name: product.name,
        image_url: product.image_url || "",
        headline: form.headline.trim(),
        placement: form.placement,
        duration_days: Number(form.duration_days),
        price,
        status: "pending",
        requested_at: new Date().toISOString(),
        notes: form.notes.trim(),
        payment_reference: form.payment_reference.trim(),
      });
      onSubmitted?.();
      onClose();
    } catch (err) {
      setError(err?.message || "Could not send the request. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request a product promotion</DialogTitle>
          <DialogDescription>
            We review every request and switch the promotion on once your fare is confirmed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="ad-product">Product</Label>
            <select
              id="ad-product"
              value={form.product_id}
              onChange={(e) => set("product_id", e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="ad-headline">Selling line</Label>
            <Input
              id="ad-headline"
              value={form.headline}
              onChange={(e) => set("headline", e.target.value)}
              placeholder="e.g. Buy 2 cartons, get a free pack"
              className="mt-1"
              maxLength={90}
            />
          </div>

          <div>
            <Label htmlFor="ad-placement">Placement</Label>
            <select
              id="ad-placement"
              value={form.placement}
              onChange={(e) => set("placement", e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {Object.entries(AD_PLACEMENTS).map(([key, option]) => (
                <option key={key} value={key}>
                  {option.label} — {formatCurrency(option.perDay, currency, showSymbol)}/day
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {AD_PLACEMENTS[form.placement]?.blurb}
            </p>
          </div>

          <div>
            <Label htmlFor="ad-days">How long</Label>
            <select
              id="ad-days"
              value={form.duration_days}
              onChange={(e) => set("duration_days", Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {AD_DURATIONS.map((days) => (
                <option key={days} value={days}>
                  {days} days
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-border bg-secondary/50 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total for this promotion</span>
              <span className="text-base font-bold text-foreground">
                {formatCurrency(price, currency, showSymbol)}
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="ad-reference">Payment reference (optional)</Label>
            <Input
              id="ad-reference"
              value={form.payment_reference}
              onChange={(e) => set("payment_reference", e.target.value)}
              placeholder="Transfer reference or the account you paid from"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="ad-notes">Anything else?</Label>
            <Textarea
              id="ad-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Dates you'd like it to run, or a note for the review team"
              className="mt-1"
              rows={3}
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? "Sending…" : "Send request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}