import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Edit, Trash2, Megaphone, TrendingUp, Target } from "lucide-react";
import { format } from "date-fns";

export default function MarketingCampaigns({ campaigns, segments }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    description: "",
    campaign_type: "promotional_offer",
    discount_type: "percentage",
    discount_value: 10,
    start_date: "",
    end_date: "",
    status: "draft"
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });

  const saveCampaignMutation = useMutation({
    mutationFn: async (data) => {
      const company_id = companies[0]?.id;
      
      if (editingCampaign) {
        return base44.entities.MarketingCampaign.update(editingCampaign.id, data);
      }
      return base44.entities.MarketingCampaign.create({ ...data, company_id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["marketingCampaigns"]);
      setShowDialog(false);
      setEditingCampaign(null);
      resetForm();
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: (id) => base44.entities.MarketingCampaign.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["marketingCampaigns"]);
    },
  });

  const resetForm = () => {
    setCampaignForm({
      name: "",
      description: "",
      campaign_type: "promotional_offer",
      discount_type: "percentage",
      discount_value: 10,
      start_date: "",
      end_date: "",
      status: "draft"
    });
  };

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setCampaignForm(campaign);
    setShowDialog(true);
  };

  const handleSave = () => {
    saveCampaignMutation.mutate(campaignForm);
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      deleteCampaignMutation.mutate(id);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: "bg-gray-100 text-gray-700",
      active: "bg-green-100 text-green-700",
      completed: "bg-blue-100 text-blue-700",
      cancelled: "bg-red-100 text-red-700"
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Marketing Campaigns</h2>
          <p className="text-slate-500 mt-1">Create and manage targeted marketing initiatives</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowDialog(true);
          }}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <Badge className={getStatusColor(campaign.status)}>
                  {campaign.status}
                </Badge>
                <Badge variant="outline">{campaign.campaign_type}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{campaign.name}</h3>
                <p className="text-sm text-slate-600 mt-1">{campaign.description}</p>
              </div>

              {(campaign.discount_type && campaign.discount_value) && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-xs text-orange-700 font-semibold">Offer Details</p>
                  <p className="text-sm text-orange-900">
                    {campaign.discount_type === 'percentage' 
                      ? `${campaign.discount_value}% Off` 
                      : `$${campaign.discount_value} Off`}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2 bg-slate-50 rounded">
                  <p className="text-slate-500">Target Customers</p>
                  <p className="font-bold text-slate-900">{campaign.target_customer_count || 0}</p>
                </div>
                <div className="p-2 bg-slate-50 rounded">
                  <p className="text-slate-500">Conversions</p>
                  <p className="font-bold text-green-600">{campaign.conversion_count || 0}</p>
                </div>
              </div>

              {campaign.start_date && (
                <p className="text-xs text-slate-500">
                  {format(new Date(campaign.start_date), "MMM d")} - 
                  {campaign.end_date ? format(new Date(campaign.end_date), " MMM d, yyyy") : " Ongoing"}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(campaign)}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(campaign.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {campaigns.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Megaphone className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No marketing campaigns created yet</p>
          </CardContent>
        </Card>
      )}

      {/* Campaign Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? "Edit Campaign" : "Create New Campaign"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Campaign Name *</Label>
              <Input
                value={campaignForm.name}
                onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                placeholder="e.g., Summer Sale 2024"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={campaignForm.description}
                onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                placeholder="Describe this campaign..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Campaign Type</Label>
                <Select 
                  value={campaignForm.campaign_type} 
                  onValueChange={(value) => setCampaignForm({ ...campaignForm, campaign_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email Campaign</SelectItem>
                    <SelectItem value="sms">SMS Campaign</SelectItem>
                    <SelectItem value="promotional_offer">Promotional Offer</SelectItem>
                    <SelectItem value="loyalty_reward">Loyalty Reward</SelectItem>
                    <SelectItem value="product_launch">Product Launch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select 
                  value={campaignForm.status} 
                  onValueChange={(value) => setCampaignForm({ ...campaignForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount Type</Label>
                <Select 
                  value={campaignForm.discount_type} 
                  onValueChange={(value) => setCampaignForm({ ...campaignForm, discount_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                    <SelectItem value="free_product">Free Product</SelectItem>
                    <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Discount Value</Label>
                <Input
                  type="number"
                  value={campaignForm.discount_value}
                  onChange={(e) => setCampaignForm({ ...campaignForm, discount_value: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={campaignForm.start_date}
                  onChange={(e) => setCampaignForm({ ...campaignForm, start_date: e.target.value })}
                />
              </div>

              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={campaignForm.end_date}
                  onChange={(e) => setCampaignForm({ ...campaignForm, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saveCampaignMutation.isPending || !campaignForm.name}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {saveCampaignMutation.isPending ? "Saving..." : "Save Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}