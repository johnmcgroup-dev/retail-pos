import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  TrendingUp, 
  Target, 
  MessageSquare, 
  Megaphone,
  Plus
} from "lucide-react";
import CustomerSegments from "../components/crm/CustomerSegments";
import MarketingCampaigns from "../components/crm/MarketingCampaigns";
import CustomerInsights from "../components/crm/CustomerInsights";
import CommunicationCenter from "../components/crm/CommunicationCenter";

export default function CRM() {
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  const { data: segments = [] } = useQuery({
    queryKey: ["customerSegments"],
    queryFn: () => base44.entities.CustomerSegment.list(),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["marketingCampaigns"],
    queryFn: () => base44.entities.MarketingCampaign.list("-created_date"),
  });

  const { data: communications = [] } = useQuery({
    queryKey: ["communicationLogs"],
    queryFn: () => base44.entities.CommunicationLog.list("-communication_date", 50),
  });

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const vipCustomers = customers.filter(c => c.customer_type === 'vip').length;
  const totalRevenue = customers.reduce((sum, c) => sum + (c.total_purchases || 0), 0);
  const avgOrderValue = customers.reduce((sum, c) => sum + (c.average_order_value || 0), 0) / (customers.length || 1);
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Customer Relationship Management</h1>
        <p className="text-slate-500 mt-1">Manage customers, segments, and marketing campaigns</p>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Customers</p>
                <p className="text-3xl font-bold">{totalCustomers}</p>
                <p className="text-xs opacity-80 mt-1">{activeCustomers} active</p>
              </div>
              <Users className="w-12 h-12 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Revenue</p>
                <p className="text-3xl font-bold">₦{totalRevenue.toFixed(0)}</p>
                <p className="text-xs opacity-80 mt-1">Lifetime value</p>
              </div>
              <TrendingUp className="w-12 h-12 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Avg Order Value</p>
                <p className="text-3xl font-bold">₦{avgOrderValue.toFixed(2)}</p>
                <p className="text-xs opacity-80 mt-1">Per customer</p>
              </div>
              <Target className="w-12 h-12 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Active Campaigns</p>
                <p className="text-3xl font-bold">{activeCampaigns}</p>
                <p className="text-xs opacity-80 mt-1">{vipCustomers} VIP customers</p>
              </div>
              <Megaphone className="w-12 h-12 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="segments" className="gap-2">
            <Target className="w-4 h-4" />
            Segments
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2">
            <Megaphone className="w-4 h-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="communications" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Communications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights">
          <CustomerInsights customers={customers} />
        </TabsContent>

        <TabsContent value="segments">
          <CustomerSegments segments={segments} customers={customers} />
        </TabsContent>

        <TabsContent value="campaigns">
          <MarketingCampaigns campaigns={campaigns} segments={segments} />
        </TabsContent>

        <TabsContent value="communications">
          <CommunicationCenter communications={communications} customers={customers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}