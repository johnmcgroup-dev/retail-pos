import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Award } from "lucide-react";
import LoyaltyAccount from "@/components/loyalty/LoyaltyAccount";

export default function MyLoyalty() {
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const companyId = user?.company_id || user?.tenant_id;

  // The customer account is the record linked to this user's email.
  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date"),
  });
  const customer = user?.email
    ? customers.find((c) => (c.email || "").toLowerCase() === user.email.toLowerCase())
    : null;

  const { data: programs = [] } = useQuery({
    queryKey: ["loyaltyPrograms", companyId],
    queryFn: () => base44.entities.LoyaltyProgram.filter({ company_id: companyId }),
    enabled: !!companyId,
  });
  const program = programs[0];

  const { data: rewards = [] } = useQuery({
    queryKey: ["rewards", companyId, "active"],
    queryFn: () => base44.entities.Reward.filter({ company_id: companyId, status: "active" }),
    enabled: !!companyId,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["loyaltyTransactions", customer?.id],
    queryFn: () =>
      base44.entities.LoyaltyTransaction.filter(
        { customer_id: customer.id },
        "-transaction_date",
        50
      ),
    enabled: !!customer?.id,
  });

  if (loadingCustomers) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-4 md:p-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-10 text-center">
            <Award className="w-14 h-14 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900">No loyalty account yet</h2>
            <p className="text-slate-600 text-sm mt-2">
              Ask the store to register your email on a customer account. Once it is there, every
              purchase earns points and your balance and tier show up here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          {program?.name || "My Loyalty"}
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          {program?.description || "Earn points as you shop, then redeem them for discounts and free items."}
        </p>
      </div>

      <LoyaltyAccount
        customer={customer}
        program={program}
        rewards={rewards}
        transactions={transactions}
        companyId={companyId}
      />
    </div>
  );
}