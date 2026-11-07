import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Gift, Pencil, Trash2, Award, Users, TrendingUp } from "lucide-react";
import ProgramSettingsForm from "@/components/loyalty/ProgramSettingsForm";
import RewardEditDialog from "@/components/loyalty/RewardEditDialog";
import MembersList from "@/components/loyalty/MembersList";
import LoyaltyHistory from "@/components/loyalty/LoyaltyHistory";
import { rewardValue } from "@/lib/loyalty";

export default function LoyaltyManagement() {
  const queryClient = useQueryClient();
  const [rewardDialog, setRewardDialog] = useState({ open: false, reward: null });

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const companyId = user?.company_id || user?.tenant_id;

  const { data: programs = [] } = useQuery({
    queryKey: ["loyaltyPrograms", companyId],
    queryFn: () => base44.entities.LoyaltyProgram.filter({ company_id: companyId }),
    enabled: !!companyId,
  });
  const program = programs[0];

  const { data: rewards = [] } = useQuery({
    queryKey: ["rewards", companyId],
    queryFn: () => base44.entities.Reward.filter({ company_id: companyId }, "-created_date"),
    enabled: !!companyId,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date"),
  });
  const members = customers.filter((c) => !companyId || c.company_id === companyId);

  const { data: transactions = [] } = useQuery({
    queryKey: ["loyaltyTransactions", companyId],
    queryFn: () =>
      base44.entities.LoyaltyTransaction.filter(
        { company_id: companyId },
        "-transaction_date",
        100
      ),
    enabled: !!companyId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", companyId],
    queryFn: () => base44.entities.Product.filter({ company_id: companyId }),
    enabled: !!companyId,
  });

  const deleteReward = useMutation({
    mutationFn: (id) => base44.entities.Reward.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rewards"] }),
  });

  const pointsIssued = transactions
    .filter((t) => t.transaction_type === "earned")
    .reduce((sum, t) => sum + (t.points || 0), 0);
  const activeMembers = members.filter((c) => (c.loyalty_points || 0) > 0).length;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Loyalty Program</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Set how customers earn points and what they can redeem them for at your store.
          </p>
        </div>
        <Badge
          variant={program?.active ? "default" : "secondary"}
          className={program?.active ? "bg-green-100 text-green-700 w-fit" : "w-fit"}
        >
          {program ? (program.active ? "Running" : "Paused") : "Not set up yet"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Members earning</p>
            <p className="text-2xl font-bold text-slate-900">{activeMembers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Points issued</p>
            <p className="text-2xl font-bold text-slate-900">{pointsIssued}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Rewards live</p>
            <p className="text-2xl font-bold text-slate-900">
              {rewards.filter((r) => r.status === "active").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Redemptions</p>
            <p className="text-2xl font-bold text-slate-900">
              {transactions.filter((t) => t.transaction_type === "redeemed").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="program" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="program" className="gap-1.5">
            <TrendingUp className="w-4 h-4" /> Program
          </TabsTrigger>
          <TabsTrigger value="rewards" className="gap-1.5">
            <Gift className="w-4 h-4" /> Rewards
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-1.5">
            <Users className="w-4 h-4" /> Customers
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5">
            <Award className="w-4 h-4" /> Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="program">
          <ProgramSettingsForm program={program} companyId={companyId} />
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <div className="flex justify-end">
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => setRewardDialog({ open: true, reward: null })}
            >
              <Plus className="w-4 h-4 mr-2" /> New reward
            </Button>
          </div>

          {rewards.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
              <Gift className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                No rewards yet. Add a discount or a free item customers can claim with points.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rewards.map((reward) => (
                <Card key={reward.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900">{reward.name}</p>
                      <Badge variant={reward.status === "active" ? "default" : "secondary"}>
                        {reward.points_required} pts
                      </Badge>
                    </div>
                    <p className="text-xs font-medium text-purple-600">{rewardValue(reward)}</p>
                    {reward.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">{reward.description}</p>
                    )}
                    <p className="text-xs text-slate-400">
                      Redeemed {reward.redemptions_count || 0}
                      {reward.max_redemptions ? ` / ${reward.max_redemptions}` : ""} times
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setRewardDialog({ open: true, reward })}
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete "${reward.name}"?`)) deleteReward.mutate(reward.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members">
          <MembersList customers={members} program={program} companyId={companyId} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-3">
          <p className="text-sm text-slate-500">Every point earned and redeemed at this store.</p>
          <LoyaltyHistory transactions={transactions} />
        </TabsContent>
      </Tabs>

      <RewardEditDialog
        open={rewardDialog.open}
        reward={rewardDialog.reward}
        companyId={companyId}
        products={products}
        onClose={() => setRewardDialog({ open: false, reward: null })}
      />
    </div>
  );
}