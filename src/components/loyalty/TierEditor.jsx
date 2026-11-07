import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

const BLANK_TIER = { name: "New tier", min_points: 0, earn_multiplier: 1, perk: "" };

export default function TierEditor({ tiers = [], onChange }) {
  const update = (index, patch) =>
    onChange(tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)));

  return (
    <div className="space-y-2">
      <div className="hidden md:grid grid-cols-[1.2fr_0.8fr_0.8fr_1.4fr_auto] gap-2 text-xs font-medium text-slate-500 px-1">
        <span>Tier name</span>
        <span>From points</span>
        <span>Multiplier</span>
        <span>Perk</span>
        <span />
      </div>

      {tiers.map((tier, index) => (
        <div key={index} className="grid grid-cols-2 md:grid-cols-[1.2fr_0.8fr_0.8fr_1.4fr_auto] gap-2 items-center">
          <Input
            value={tier.name || ""}
            onChange={(e) => update(index, { name: e.target.value })}
            placeholder="Bronze"
          />
          <Input
            type="number"
            value={tier.min_points ?? 0}
            onChange={(e) => update(index, { min_points: Number(e.target.value) })}
            placeholder="0"
          />
          <Input
            type="number"
            step="0.25"
            value={tier.earn_multiplier ?? 1}
            onChange={(e) => update(index, { earn_multiplier: Number(e.target.value) })}
            placeholder="1"
          />
          <Input
            value={tier.perk || ""}
            onChange={(e) => update(index, { perk: e.target.value })}
            placeholder="Earn double points"
            className="col-span-2 md:col-span-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="justify-self-end"
            onClick={() => onChange(tiers.filter((_, i) => i !== index))}
            disabled={tiers.length <= 1}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...tiers, { ...BLANK_TIER }])}
      >
        <Plus className="w-4 h-4 mr-1" /> Add tier
      </Button>
    </div>
  );
}