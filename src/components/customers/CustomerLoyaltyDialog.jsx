import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import LoyaltyAccount from "@/components/loyalty/LoyaltyAccount";

export default function CustomerLoyaltyDialog({ open, onClose, customer, companyId }) {
  const { data: programs = [] } = useQuery({
    queryKey: ["loyaltyPrograms", companyId],
    queryFn: () => base44.entities.LoyaltyProgram.filter({ company_id: companyId }),
    enabled: open && !!companyId,
  });
  const program = programs[0];

  const { data: rewards = [] } = useQuery({
    queryKey: ["rewards", companyId, "active"],
    queryFn: () => base44.entities.Reward.filter({ company_id: companyId, status: "active" }),
    enabled: open && !!companyId,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["loyaltyTransactions", customer?.id],
    queryFn: () =>
      base44.entities.LoyaltyTransaction.filter(
        { customer_id: customer.id },
        "-transaction_date",
        50
      ),
    enabled: open && !!customer?.id,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer?.name || "Customer"} · Loyalty</DialogTitle>
          <DialogDescription>
            {program?.name || "Loyalty programme"} — points earned, tier progress and redemptions
          </DialogDescription>
        </DialogHeader>

        {customer && (
          <LoyaltyAccount
            customer={customer}
            program={program}
            rewards={rewards}
            transactions={transactions}
            companyId={companyId}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}