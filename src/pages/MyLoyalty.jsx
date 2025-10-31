import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Award, 
  TrendingUp, 
  Gift, 
  History, 
  Star, 
  ShoppingBag,
  Calendar,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function MyLoyalty() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [selectedReward, setSelectedReward] = useState(null);
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Find customer record by email
        const customers = await base44.entities.Customer.filter({ email: currentUser.email });
        if (customers.length > 0) {
          setCustomer(customers[0]);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const { data: transactions = [] } = useQuery({
    queryKey: ["loyaltyTransactions", customer?.id],
    queryFn: () => base44.entities.LoyaltyTransaction.filter({ 
      customer_id: customer.id 
    }, "-transaction_date"),
    enabled: !!customer,
  });

  const { data: rewards = [] } = useQuery({
    queryKey: ["rewards"],
    queryFn: () => base44.entities.Reward.filter({ status: "active" }),
  });

  const { data: mySales = [] } = useQuery({
    queryKey: ["mySales", customer?.id],
    queryFn: () => base44.entities.Sale.filter({ 
      customer_id: customer.id 
    }, "-sale_date", 10),
    enabled: !!customer,
  });

  const redeemMutation = useMutation({
    mutationFn: async (reward) => {
      // Create redemption transaction
      const transaction = await base44.entities.LoyaltyTransaction.create({
        company_id: customer.company_id,
        customer_id: customer.id,
        transaction_type: "redeemed",
        points: -reward.points_required,
        reference_type: "reward",
        reference_id: reward.id,
        description: `Redeemed: ${reward.name}`,
        balance_after: customer.loyalty_points - reward.points_required,
        transaction_date: new Date().toISOString()
      });

      // Update customer points
      await base44.entities.Customer.update(customer.id, {
        loyalty_points: customer.loyalty_points - reward.points_required
      });

      // Update reward redemption count
      await base44.entities.Reward.update(reward.id, {
        redemptions_count: (reward.redemptions_count || 0) + 1
      });

      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["loyaltyTransactions"]);
      queryClient.invalidateQueries(["rewards"]);
      setShowRedeemDialog(false);
      setSelectedReward(null);
      // Reload customer data
      window.location.reload();
    },
  });

  const handleRedeemClick = (reward) => {
    setSelectedReward(reward);
    setShowRedeemDialog(true);
  };

  const handleConfirmRedeem = () => {
    if (selectedReward) {
      redeemMutation.mutate(selectedReward);
    }
  };

  if (!customer) {
    return (
      <div className="p-6 md:p-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-12 text-center">
            <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Join Our Loyalty Program</h2>
            <p className="text-slate-600 mb-6">
              You need to be registered as a customer to access loyalty rewards. 
              Please contact our store to create your customer account.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableRewards = rewards.filter(r => {
    const canAfford = r.points_required <= customer.loyalty_points;
    const notMaxed = r.max_redemptions === 0 || r.redemptions_count < r.max_redemptions;
    const validDate = (!r.valid_until || new Date(r.valid_until) >= new Date());
    return canAfford && notMaxed && validDate;
  });

  const upcomingRewards = rewards.filter(r => {
    return r.points_required > customer.loyalty_points && r.status === 'active';
  }).sort((a, b) => a.points_required - b.points_required).slice(0, 3);

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Loyalty Rewards</h1>
          <p className="text-slate-500 mt-1">Earn points with every purchase and redeem for rewards</p>
        </div>
      </div>

      {/* Points Balance Card */}
      <Card className="bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />
        <CardContent className="p-8 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 mb-2">Your Points Balance</p>
              <div className="flex items-baseline gap-2">
                <h2 className="text-5xl font-bold">{customer.loyalty_points || 0}</h2>
                <Star className="w-8 h-8 fill-yellow-300 text-yellow-300" />
              </div>
              <p className="text-sm opacity-80 mt-3">
                {customer.customer_type === 'vip' && (
                  <Badge className="bg-yellow-400 text-yellow-900">VIP Member</Badge>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-90">Lifetime Purchases</p>
              <p className="text-2xl font-bold">${(customer.total_purchases || 0).toFixed(2)}</p>
              <p className="text-xs opacity-80 mt-1">{mySales.length} orders</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Points Earned</p>
              <p className="text-2xl font-bold text-slate-900">
                {transactions.filter(t => t.transaction_type === 'earned').reduce((sum, t) => sum + t.points, 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Gift className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Points Redeemed</p>
              <p className="text-2xl font-bold text-slate-900">
                {Math.abs(transactions.filter(t => t.transaction_type === 'redeemed').reduce((sum, t) => sum + t.points, 0))}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Award className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Rewards Available</p>
              <p className="text-2xl font-bold text-slate-900">{availableRewards.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rewards" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rewards" className="gap-2">
            <Gift className="w-4 h-4" />
            Available Rewards
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Upcoming Rewards
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Points History
          </TabsTrigger>
          <TabsTrigger value="purchases" className="gap-2">
            <ShoppingBag className="w-4 h-4" />
            Purchase History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableRewards.map((reward) => (
              <Card key={reward.id} className="hover:shadow-lg transition-shadow border-2 border-green-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Badge className="bg-green-100 text-green-700">Ready to Redeem</Badge>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-600">{reward.points_required}</p>
                      <p className="text-xs text-slate-500">points</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reward.image_url && (
                    <img src={reward.image_url} alt={reward.name} className="w-full h-32 object-cover rounded-lg" />
                  )}
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
                  <Button 
                    onClick={() => handleRedeemClick(reward)}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    Redeem Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {availableRewards.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Gift className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">No rewards available yet. Keep shopping to earn more points!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingRewards.map((reward) => {
              const pointsNeeded = reward.points_required - customer.loyalty_points;
              const progress = (customer.loyalty_points / reward.points_required) * 100;
              
              return (
                <Card key={reward.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Badge variant="secondary">Locked</Badge>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-400">{reward.points_required}</p>
                        <p className="text-xs text-slate-500">points</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {reward.image_url && (
                      <img src={reward.image_url} alt={reward.name} className="w-full h-32 object-cover rounded-lg opacity-60" />
                    )}
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{reward.name}</h3>
                      <p className="text-sm text-slate-600 mt-1">{reward.description}</p>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600">Progress</span>
                        <span className="font-semibold text-purple-600">{pointsNeeded} more points</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {upcomingRewards.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">You've unlocked all available rewards!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Points History</CardTitle>
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
                          {format(new Date(transaction.transaction_date), "MMM d, yyyy h:mm a")}
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
                {transactions.length === 0 && (
                  <div className="text-center py-12">
                    <History className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No transaction history yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <CardTitle>Recent Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mySales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{sale.invoice_number}</p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(sale.sale_date), "MMM d, yyyy h:mm a")}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {sale.items?.length || 0} items
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">${sale.total_amount?.toFixed(2)}</p>
                      {sale.loyalty_points_earned > 0 && (
                        <p className="text-xs text-green-600">+{sale.loyalty_points_earned} pts</p>
                      )}
                    </div>
                  </div>
                ))}
                {mySales.length === 0 && (
                  <div className="text-center py-12">
                    <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No purchase history yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Redeem Confirmation Dialog */}
      <Dialog open={showRedeemDialog} onOpenChange={setShowRedeemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Redemption</DialogTitle>
            <DialogDescription>
              Are you sure you want to redeem this reward?
            </DialogDescription>
          </DialogHeader>
          {selectedReward && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="font-bold text-lg text-slate-900">{selectedReward.name}</h3>
                <p className="text-sm text-slate-600 mt-1">{selectedReward.description}</p>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-700">Points Required:</span>
                <span className="font-bold text-purple-600">{selectedReward.points_required}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-700">Your Balance After:</span>
                <span className="font-bold text-slate-900">
                  {customer.loyalty_points - selectedReward.points_required}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRedeemDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmRedeem}
              disabled={redeemMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {redeemMutation.isPending ? "Redeeming..." : "Confirm Redemption"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}