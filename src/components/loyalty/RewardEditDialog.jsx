import React, { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BLANK = {
  name: "",
  description: "",
  reward_type: "discount_percentage",
  discount_value: 10,
  product_id: "",
  product_name: "",
  quantity: 1,
  points_required: 100,
  max_redemptions: 0,
  status: "active",
};

export default function RewardEditDialog({ open, onClose, reward, companyId, products = [] }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(reward ? { ...BLANK, ...reward } : BLANK);
    setError("");
  }, [open, reward?.id]);

  const save = useMutation({
    mutationFn: (payload) =>
      reward
        ? base44.entities.Reward.update(reward.id, payload)
        : base44.entities.Reward.create({ ...payload, company_id: companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
      onClose();
    },
    onError: (e) => setError(e?.message || "Could not save this reward"),
  });

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const submit = (e) => {
    e.preventDefault();
    if (!companyId) {
      setError("Your account is not linked to a store yet.");
      return;
    }
    if (!form.name?.trim()) {
      setError("Give the reward a name.");
      return;
    }
    if (!Number(form.points_required)) {
      setError("Set how many points the reward costs.");
      return;
    }
    save.mutate({
      name: form.name.trim(),
      description: form.description || "",
      reward_type: form.reward_type,
      discount_value: form.reward_type === "free_product" ? 0 : Number(form.discount_value) || 0,
      product_id: form.reward_type === "free_product" ? form.product_id : "",
      product_name: form.reward_type === "free_product" ? form.product_name : "",
      quantity: Number(form.quantity) || 1,
      points_required: Number(form.points_required) || 0,
      max_redemptions: Number(form.max_redemptions) || 0,
      status: form.status || "active",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{reward ? "Edit reward" : "New reward"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Reward name *</Label>
            <Input value={form.name || ""} onChange={(e) => set({ name: e.target.value })} />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={form.description || ""}
              onChange={(e) => set({ description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Reward type</Label>
              <Select value={form.reward_type} onValueChange={(v) => set({ reward_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount_percentage">Percentage discount</SelectItem>
                  <SelectItem value="discount_amount">Fixed amount discount</SelectItem>
                  <SelectItem value="free_product">Free item</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Points required *</Label>
              <Input
                type="number"
                value={form.points_required ?? 0}
                onChange={(e) => set({ points_required: Number(e.target.value) })}
              />
            </div>
          </div>

          {form.reward_type === "free_product" ? (
            <div className="grid grid-cols-[1fr_100px] gap-4">
              <div>
                <Label>Item given away</Label>
                <Select
                  value={form.product_id || ""}
                  onValueChange={(id) => {
                    const product = products.find((p) => p.id === id);
                    set({ product_id: id, product_name: product?.name || "" });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={form.quantity ?? 1}
                  onChange={(e) => set({ quantity: Number(e.target.value) })}
                />
              </div>
            </div>
          ) : (
            <div>
              <Label>
                {form.reward_type === "discount_percentage" ? "Percent off" : "Amount off"}
              </Label>
              <Input
                type="number"
                step="0.01"
                value={form.discount_value ?? 0}
                onChange={(e) => set({ discount_value: Number(e.target.value) })}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Max redemptions (0 = unlimited)</Label>
              <Input
                type="number"
                value={form.max_redemptions ?? 0}
                onChange={(e) => set({ max_redemptions: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status || "active"} onValueChange={(v) => set({ status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving..." : "Save reward"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}