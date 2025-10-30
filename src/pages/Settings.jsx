import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Building2, Users, CreditCard, Bell, Database, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { offlineCache } from "@/utils/offlineCache";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [cacheInfo, setCacheInfo] = useState({});

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
    
    // Load cache info
    setCacheInfo(offlineCache.getCacheInfo());
  }, []);

  const handleClearCache = () => {
    if (confirm("Are you sure you want to clear all offline cache? This will remove locally stored product data.")) {
      offlineCache.clearAll();
      setCacheInfo(offlineCache.getCacheInfo());
      alert("Cache cleared successfully!");
    }
  };

  const company = companies[0];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList>
          <TabsTrigger value="company">
            <Building2 className="w-4 h-4 mr-2" />
            Company
          </TabsTrigger>
          <TabsTrigger value="subscription">
            <CreditCard className="w-4 h-4 mr-2" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Users & Roles
          </TabsTrigger>
          <TabsTrigger value="offline">
            <Database className="w-4 h-4 mr-2" />
            Offline Cache
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent>
              {company ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-semibold text-slate-700">Company Name</label>
                      <p className="text-lg text-slate-900 mt-1">{company.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700">Type</label>
                      <p className="text-lg text-slate-900 mt-1 capitalize">{company.type?.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700">Email</label>
                      <p className="text-lg text-slate-900 mt-1">{company.email || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700">Phone</label>
                      <p className="text-lg text-slate-900 mt-1">{company.phone || '-'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-slate-700">Address</label>
                      <p className="text-lg text-slate-900 mt-1">{company.address || '-'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500">No company information available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Details</CardTitle>
            </CardHeader>
            <CardContent>
              {company ? (
                <div className="space-y-6">
                  <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-slate-600">Current Plan</p>
                        <p className="text-2xl font-bold text-slate-900 capitalize">
                          {company.subscription_plan?.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <Badge
                        variant={company.status === 'active' ? 'success' : 'destructive'}
                        className={company.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                      >
                        {company.status}
                      </Badge>
                    </div>
                    {company.subscription_start_date && (
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-600">Start Date</p>
                          <p className="font-semibold text-slate-900">
                            {format(new Date(company.subscription_start_date), "MMM d, yyyy")}
                          </p>
                        </div>
                        {company.subscription_end_date && (
                          <div>
                            <p className="text-slate-600">End Date</p>
                            <p className="font-semibold text-slate-900">
                              {format(new Date(company.subscription_end_date), "MMM d, yyyy")}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-slate-500">No subscription information available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {user && (
                  <div className="p-4 border rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {user.full_name?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{user.full_name}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <Badge className="capitalize">{user.role}</Badge>
                  </div>
                )}
                <p className="text-sm text-slate-500 mt-4">
                  To manage users and roles, contact your system administrator.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offline">
          <Card>
            <CardHeader>
              <CardTitle>Offline Cache Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    About Offline Cache
                  </h4>
                  <p className="text-sm text-blue-800">
                    The POS system caches products, customers, and inventory data locally to enable offline functionality. 
                    Cached data remains valid for 24 hours and automatically syncs when online.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-900">Cache Storage Usage</h4>
                  
                  {Object.entries(cacheInfo).map(([key, value]) => {
                    if (key === 'TOTAL') {
                      return (
                        <div key={key} className="p-4 bg-slate-100 border-2 border-slate-300 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900">Total Storage Used</span>
                            <span className="text-lg font-bold text-blue-600">{value}</span>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div key={key} className="p-3 border rounded-lg flex justify-between items-center">
                        <div>
                          <p className="font-medium text-slate-900">{key.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-slate-500">Last updated: {value.lastUpdate}</p>
                        </div>
                        <Badge variant="outline">{value.size}</Badge>
                      </div>
                    );
                  })}
                </div>

                {offlineCache.getLastSync() && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <span className="font-semibold">Last synchronized:</span>{' '}
                      {new Date(offlineCache.getLastSync()).toLocaleString()}
                    </p>
                  </div>
                )}

                <Button
                  variant="destructive"
                  onClick={handleClearCache}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All Cache
                </Button>

                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                  ⚠️ Clearing cache will require re-downloading all data when online. Only do this if experiencing issues.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2">Email Alerts</h4>
                  <p className="text-sm text-slate-600">
                    Get notified about low stock, expiring items, and important updates via email.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2">SMS Notifications</h4>
                  <p className="text-sm text-slate-600">
                    Receive critical alerts via SMS (email-to-SMS gateway required).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}