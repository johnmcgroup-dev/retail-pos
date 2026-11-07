import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import TierEditor from "@/components/loyalty/TierEditor";
import { DEFAULT_PROGRAM, DEFAULT_TIERS } from "@/lib/loyalty";

// Only the fields the programme owns are ever written back, so saving can never
// carry record metadata into the update.
const payloadOf = (form) => ({
  name: form.name?.trim(),
  description: form.description || "",
  points_per_dollar: Number(form.points_per_dollar) || 0,
  redemption_value: Number(form.redemption_value) || 0,
  minimum_purchase: Number(form.minimum_purchase) || 0,
  active: form.active !== false,
  tiers: (form.tiers || []).map((t) => ({
    name: t.name?.trim() || "Tier",
    min_points: Number(t.min_points) || 0,
    earn_multiplier: Number(t.earn_multiplier) || 1,
    perk: t.perk || "",
  })),
});

export default function ProgramSettingsForm({ program, companyId }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm({
      ...DEFAULT_PROGRAM,
      ...(program || {}),
      tiers: program?.tiers?.length ? program.tiers : DEFAULT_TIERS,
    });
    setError("");
  }, [program?.id, program?.updated_date]);

  const save = useMutation({
    mutationFn: (data) =>
      program
        ? base44.entities.LoyaltyProgram.update(program.id, data)
        : base44.entities.LoyaltyProgram.create({ ...data, company_id: companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyPrograms"] });
      setError("");
    },
    onError: (e) => setError(e?.message || "Could not save the loyalty programme"),
  });

  if (!form) return null;

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const submit = (e) => {
    e.preventDefault();
    if (!companyId) {
      setError("Your account is not linked to a store yet.");
      return;
    }
    if (!form.name?.trim()) {
      setError("Give the programme a name.");
      return;
    }
    save.mutate(payloadOf(form));
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Earning and redemption rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Programme name *</Label>
              <Input value={form.name || ""} onChange={(e) => set({ name: e.target.value })} />
            </div>
            <div>
              <Label>Points per 1 spent *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.points_per_dollar ?? 1}
                onChange={(e) => set({ points_per_dollar: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Value of 1 point (discount)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.redemption_value ?? 0}
                onChange={(e) => set({ redemption_value: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Minimum purchase to earn</Label>
              <Input
                type="number"
                step="0.01"
                value={form.minimum_purchase ?? 0}
                onChange={(e) => set({ minimum_purchase: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Label>Description shown to customers</Label>
            <Textarea
              rows={2}
              value={form.description || ""}
              onChange={(e) => set({ description: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Programme active</p>
              <p className="text-xs text-slate-500">When off, the POS stops awarding points.</p>
            </div>
            <Switch checked={form.active !== false} onCheckedChange={(v) => set({ active: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tiers and progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-500">
            Customers move up a tier as their points grow. The multiplier lifts the points they earn in that tier.
          </p>
          <TierEditor tiers={form.tiers || []} onChange={(tiers) => set({ tiers })} />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving..." : "Save programme"}
        </Button>
      </div>
    </form>
  );
}