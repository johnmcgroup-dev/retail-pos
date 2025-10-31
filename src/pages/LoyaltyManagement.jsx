import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Gift, Award, Users, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function LoyaltyManagement() {
  const queryClient = useQueryClient();
  const [showRewardDialog, setShowRewardDialog] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [rewardForm, setRewardForm] = useState({
    name: "",
    description: "",
    points_required: 100,
    reward_type: "discount_percentage",
    discount_value: 10,
    max_redemptions: 0,
    status: "active"
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });

  const { data: rewards = [] } = useQuery({
    queryKey: ["rewards"],
    queryFn: () => base44.entities.Reward.list("-created_date"),
  });

  const { data: loyaltyPrograms = [] } = useQuery({
    queryKey: ["loyaltyPrograms"],
    queryFn: () => base44.entities.LoyaltyProgram.list(),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["loyaltyTransactions"],
    queryFn: () => base44.entities.LoyaltyTransaction.list("-transaction_date", 50),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  const saveRewardMutation = useMutation({
    mutationFn: (data) => {
      const company_id = companies[0]?.id;
      if (editingReward) {
        return base44.entities.Reward.update(editingReward.id, data);
      }
      return base44.entities.Reward.create({ ...data, company_id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["rewards"]);
      setShowRewardDialog(false);
      setEditingReward(null);
      resetForm();
    },
  });

  const deleteRewardMutation = useMutation({
    mutationFn: (id) => base44.entities.Reward.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["rewards"]);
    },
  });

  const resetForm = () => {
    setRewardForm({
      name: "",
      description: "",
      points_required: 100,
      reward_type: "discount_percentage",
      discount_value: 10,
      max_redemptions: 0,
      status: "active"
    });
  };

  const handleEdit = (reward) => {
    setEditingReward(reward);
    setRewardForm(reward);
    setShowRewardDialog(true);
  };

  const handleSave = () => {
    saveRewardMutation.mutate(rewardForm);
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this reward?")) {
      deleteRewardMutation.mutate(id);
    }
  };

  // Calculate stats
  const totalPointsEarned = transactions
    .filter(t => t.transaction_type === 'earned')
    .reduce((sum, t) => sum + t.points, 0);

  const totalPointsRedeemed = Math.abs(transactions
    .filter(t => t.transaction_type === 'redeemed')
    .reduce((sum, t) => sum + t.points, 0));

  const activeMembers = customers.filter(c => (c.loyalty_points || 0) > 0).length;

  const topCustomers = customers
    .sort((a, b) => (b.loyalty_points || 0) - (a.loyalty_points || 0))
    .slice(0, 10);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Loyalty Program Management</h1>
          <p className="text-slate-500 mt-1">Manage rewards and track customer loyalty</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowRewardDialog(true);
          }}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Reward
        </Button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Members</p>
                <p className="text-2xl font-bold text-slate-900">{activeMembers}</p>
              </div>
              <Users className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Points Earned</p>
                <p className="text-2xl font-bold text-slate-900">{totalPointsEarned}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Points Redeemed</p>
                <p className="text-2xl font-bold text-slate-900">{totalPointsRedeemed}</p>
              </div>
              <Gift className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Rewards</p>
                <p className="text-2xl font-bold text-slate-900">
                  {rewards.filter(r => r.status === 'active').length}
                </p>
              </div>
              <Award className="w-10 h-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rewards" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rewards">Rewards Catalog</TabsTrigger>
          <TabsTrigger value="customers">Top Customers</TabsTrigger>
          <TabsTrigger value="transactions">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="rewards">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewards.map((reward) => (
              <Card key={reward.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Badge variant={reward.status === 'active' ? 'default' : 'secondary'}>
                      {reward.status}
                    </Badge>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-600">{reward.points_required}</p>
                      <p className="text-xs text-slate-500">points</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{reward.name}</h3>
                    <p className="text-sm text-slate-600 mt-1">{reward.description}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    {reward.reward_type === 'discount_percentage' && (
                      <Badge variant="outline">{reward.discount_value}% Off</Badge>
                    )}
                    {reward.reward_type === 'discount_amount' && (
                      <Badge variant="outline">${reward.discount_value} Off</Badge>
                    )}
                    {reward.reward_type === 'free_product' && (
                      <Badge variant="outline">Free Item</Badge>
                    )}
                  </div>
                  <div className="text-sm text-slate-600">
                    <p>Redeemed: {reward.redemptions_count || 0} times</p>
                    {reward.max_redemptions > 0 && (
                      <p>Limit: {reward.max_redemptions}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(reward)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(reward.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {rewards.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Gift className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No rewards created yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>Top Loyalty Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left p-3 text-sm font-semibold text-slate-700">Rank</th>
                      <th className="text-left p-3 text-sm font-semibold text-slate-700">Customer</th>
                      <th className="text-right p-3 text-sm font-semibold text-slate-700">Points</th>
                      <th className="text-right p-3 text-sm font-semibold text-slate-700">Total Purchases</th>
                      <th className="text-left p-3 text-sm font-semibold text-slate-700">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {topCustomers.map((customer, index) => (
                      <tr key={customer.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <Badge variant={index < 3 ? 'default' : 'secondary'}>
                            #{index + 1}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-900">{customer.name}</p>
                          <p className="text-xs text-slate-500">{customer.email}</p>
                        </td>
                        <td className="p-3 text-right font-bold text-purple-600">
                          {customer.loyalty_points || 0}
                        </td>
                        <td className="p-3 text-right font-semibold text-slate-900">
                          ${(customer.total_purchases || 0).toFixed(2)}
                        </td>
                        <td className="p-3">
                          <Badge variant={customer.customer_type === 'vip' ? 'default' : 'secondary'}>
                            {customer.customer_type}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.transaction_type === 'earned' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-purple-100 text-purple-600'
                      }`}>
                        {transaction.transaction_type === 'earned' ? (
                          <TrendingUp className="w-5 h-5" />
                        ) : (
                          <Gift className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{transaction.description}</p>
                        <p className="text-xs text-slate-500">
                          Customer ID: {transaction.customer_id?.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        transaction.points > 0 ? 'text-green-600' : 'text-purple-600'
                      }`}>
                        {transaction.points > 0 ? '+' : ''}{transaction.points}
                      </p>
                      <p className="text-xs text-slate-500">Balance: {transaction.balance_after}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reward Dialog */}
      <Dialog open={showRewardDialog} onOpenChange={setShowRewardDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingReward ? "Edit Reward" : "Create New Reward"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Reward Name *</Label>
                <Input
                  value={rewardForm.name}
                  onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                  placeholder="e.g., 10% Off Your Next Purchase"
                />
              </div>
              <div>
                <Label>Points Required *</Label>
                <Input
                  type="number"
                  value={rewardForm.points_required}
                  onChange={(e) => setRewardForm({ ...rewardForm, points_required: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={rewardForm.description}
                onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                placeholder="Describe the reward..."
                rows={3}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Reward Type</Label>
                <Select 
                  value={rewardForm.reward_type} 
                  onValueChange={(value) => setRewardForm({ ...rewardForm, reward_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount_percentage">Percentage Discount</SelectItem>
                    <SelectItem value="discount_amount">Fixed Amount Discount</SelectItem>
                    <SelectItem value="free_product">Free Product</SelectItem>
                    <SelectItem value="special_offer">Special Offer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(rewardForm.reward_type === 'discount_percentage' || rewardForm.reward_type === 'discount_amount') && (
                <div>
                  <Label>Discount Value</Label>
                  <Input
                    type="number"
                    value={rewardForm.discount_value}
                    onChange={(e) => setRewardForm({ ...rewardForm, discount_value: parseFloat(e.target.value) || 0 })}
                    placeholder={rewardForm.reward_type === 'discount_percentage' ? "10" : "5.00"}
                  />
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Max Redemptions (0 = unlimited)</Label>
                <Input
                  type="number"
                  value={rewardForm.max_redemptions}
                  onChange={(e) => setRewardForm({ ...rewardForm, max_redemptions: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select 
                  value={rewardForm.status} 
                  onValueChange={(value) => setRewardForm({ ...rewardForm, status: value })}
                >
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRewardDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saveRewardMutation.isPending || !rewardForm.name}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saveRewardMutation.isPending ? "Saving..." : "Save Reward"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}