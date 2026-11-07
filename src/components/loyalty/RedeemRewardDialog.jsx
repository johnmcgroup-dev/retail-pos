import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { redeemReward, rewardValue } from "@/lib/loyalty";

export default function RedeemRewardDialog({ open, onClose, reward, customer, companyId }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => redeemReward({ customer, reward, companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyPrograms"] });
      onClose();
    },
    onError: (e) => setError(e?.message || "Could not redeem this reward"),
  });

  if (!reward || !customer) return null;
  const balanceAfter = (customer.loyalty_points || 0) - (reward.points_required || 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Redeem {reward.name}</DialogTitle>
          <DialogDescription>
            {rewardValue(reward)} for {customer.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2 text-sm">
          <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-600">Points needed</span>
            <span className="font-bold text-purple-600">{reward.points_required}</span>
          </div>
          <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-600">Balance after</span>
            <span className="font-bold text-slate-900">{balanceAfter}</span>
          </div>
          <p className="text-xs text-slate-500">
            The points are deducted immediately and the redemption is recorded on the customer's loyalty account.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Redeeming..." : "Confirm redemption"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}