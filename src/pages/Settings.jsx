
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Building2, Users, CreditCard, Bell, Database, Trash2, AlertCircle, DollarSign, CheckCircle, Lock } from "lucide-react";
import { format } from "date-fns";
import { offlineCache } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PasswordChangeDialog from "../components/settings/PasswordChangeDialog";
import { Input } from "@/components/ui/input";
import { CURRENCIES } from "@/utils";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [cacheInfo, setCacheInfo] = useState({});
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: "",
    type: "retail_store",
    address: "",
    phone: "",
    email: "",
    tax_id: "",
    currency: "USD",
    goodwill_message: "Thank you for your business!"
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });

  const queryClient = useQueryClient();

  const updateCompanyMutation = useMutation({
    mutationFn: (data) => {
      if (companies[0]?.id) {
        return base44.entities.Company.update(companies[0].id, data);
      }
      return Promise.reject("No company found");
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["companies"]);
      alert("Company information updated successfully!");
    },
    onError: (error) => {
      console.error("Failed to update company:", error);
      alert("Failed to update company information.");
    }
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

  useEffect(() => {
    if (companies[0]) {
      setCompanyForm({
        name: companies[0].name || "",
        type: companies[0].type || "retail_store",
        address: companies[0].address || "",
        phone: companies[0].phone || "",
        email: companies[0].email || "",
        tax_id: companies[0].tax_id || "",
        currency: companies[0].currency || "USD",
        goodwill_message: companies[0].goodwill_message || "Thank you for your business!"
      });
    }
  }, [companies]);

  const handleClearCache = () => {
    if (confirm("Are you sure you want to clear all offline cache? This will remove locally stored product data.")) {
      offlineCache.clearAll();
      setCacheInfo(offlineCache.getCacheInfo());
      alert("Cache cleared successfully!");
    }
  };

  const company = companies[0];
  const isSuperAdmin = user?.email === 'johnmcgroup@gmail.com';
  const isTrialExpired = company?.trial_ends_at && new Date(company.trial_ends_at) < new Date();
  const daysLeftInTrial = company?.trial_ends_at 
    ? Math.ceil((new Date(company.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Company Setup</h1>
        <p className="text-slate-500 mt-1">Manage your company and system preferences</p>
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="flex flex-wrap justify-start gap-2">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Company Info</span>
            <span className="sm:hidden">Company</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Payments</span>
            <span className="sm:hidden">Pay</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Subscription</span>
            <span className="sm:hidden">Sub</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Security</span>
            <span className="sm:hidden">Sec</span>
          </TabsTrigger>
          <TabsTrigger value="offline" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">Offline</span>
            <span className="sm:hidden">Cache</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Alerts</span>
            <span className="sm:hidden">Bell</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Company Name *</label>
                    <Input
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Business Type</label>
                    <select
                      value={companyForm.type}
                      onChange={(e) => setCompanyForm({ ...companyForm, type: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md"
                    >
                      <option value="retail_store">Retail Store</option>
                      <option value="warehouse">Warehouse</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="pharmacy">Pharmacy</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Currency *</label>
                    <select
                      value={companyForm.currency}
                      onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md"
                    >
                      {Object.entries(CURRENCIES).map(([code, currency]) => (
                        <option key={code} value={code}>
                          {currency.symbol} - {currency.name} ({code})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">This currency will be used throughout your app</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">Address</label>
                    <Input
                      value={companyForm.address}
                      onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                      className="mt-1"
                      placeholder="Street address, City, State, ZIP"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Phone</label>
                    <Input
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                      className="mt-1"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Email</label>
                    <Input
                      type="email"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Tax ID / Registration Number</label>
                    <Input
                      value={companyForm.tax_id}
                      onChange={(e) => setCompanyForm({ ...companyForm, tax_id: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">Invoice Footer Message</label>
                    <Input
                      value={companyForm.goodwill_message}
                      onChange={(e) => setCompanyForm({ ...companyForm, goodwill_message: e.target.value })}
                      className="mt-1"
                      placeholder="Thank you for your business!"
                    />
                    <p className="text-xs text-slate-500 mt-1">This message will appear at the bottom of customer invoices</p>
                  </div>
                </div>
                <Button 
                  onClick={() => updateCompanyMutation.mutate(companyForm)}
                  disabled={updateCompanyMutation.isPending || !companyForm.name}
                  className="w-full md:w-auto"
                >
                  {updateCompanyMutation.isPending ? "Saving..." : "Save Company Information"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment Gateway Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Multi-Tenant Payment Processing
                  </h4>
                  <p className="text-sm text-blue-800 mb-3">
                    Each tenant/company can configure their own payment gateway. Currently supported:
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li><strong>PayPal</strong> - Global payment processing</li>
                    <li><strong>Mainstack</strong> - African payment gateway</li>
                    <li><strong>Stripe</strong> - International card processing</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Available Payment Methods</h4>
                  <div className="space-y-3">
                    {/* PayPal */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-6 h-6 text-blue-600" />
                        <div>
                          <p className="font-medium text-slate-900">PayPal</p>
                          <p className="text-xs text-slate-500">Global payment processing, buyer protection</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Demo Mode</Badge>
                    </div>

                    {/* Mainstack */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-6 h-6 text-purple-600" />
                        <div>
                          <p className="font-medium text-slate-900">Mainstack</p>
                          <p className="text-xs text-slate-500">Accept payments across Africa</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Demo Mode</Badge>
                    </div>

                    {/* Stripe */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-6 h-6 text-indigo-600" />
                        <div>
                          <p className="font-medium text-slate-900">Stripe</p>
                          <p className="text-xs text-slate-500">Credit/Debit Cards, Apple Pay, Google Pay</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Demo Mode</Badge>
                    </div>

                    {/* Cash */}
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="font-medium text-slate-900">Cash</p>
                          <p className="text-xs text-slate-500">Manual cash handling</p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  <strong>Security Note:</strong> Never store full credit card numbers. Payment gateways handle card details securely and return tokens for processing.
                </div>

                {isSuperAdmin && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="font-semibold text-purple-900 mb-2">Super Admin Gateway Setup</h4>
                    <p className="text-sm text-purple-800">
                      To enable real payment processing, configure API keys in the backend:
                    </p>
                    <ol className="text-sm text-purple-800 mt-2 space-y-1 list-decimal list-inside">
                      <li>Enable Backend Functions in Dashboard</li>
                      <li>Add PayPal/Mainstack/Stripe SDK</li>
                      <li>Configure API keys securely</li>
                      <li>Test in sandbox mode</li>
                      <li>Deploy to production</li>
                    </ol>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Management</CardTitle>
            </CardHeader>
            <CardContent>
              {company ? (
                <div className="space-y-6">
                  {company.status === 'trial' && (
                    <Alert className={isTrialExpired ? "bg-red-50 border-red-300" : "bg-blue-50 border-blue-300"}>
                      <AlertCircle className={`h-4 w-4 ${isTrialExpired ? "text-red-600" : "text-blue-600"}`} />
                      <AlertDescription className={isTrialExpired ? "text-red-800" : "text-blue-800"}>
                        {isTrialExpired ? (
                          <span><strong>Trial Expired!</strong> Please subscribe to continue using RetailPro.</span>
                        ) : (
                          <span><strong>{daysLeftInTrial} days</strong> left in your 14-day free trial.</span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

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

                  {/* Pricing Plans */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="border-2 hover:border-blue-500 transition-colors">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>Monthly Plan</span>
                          <Badge>Popular</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center mb-6">
                          <p className="text-4xl font-bold text-slate-900">${company.monthly_price}</p>
                          <p className="text-slate-600">/month</p>
                        </div>
                        <ul className="space-y-2 text-sm mb-6">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            Unlimited products
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            Multi-warehouse support
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            Offline mode
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            Email support
                          </li>
                        </ul>
                        <Button className="w-full" disabled={company.subscription_plan === 'monthly'}>
                          {company.subscription_plan === 'monthly' ? 'Current Plan' : 'Subscribe Monthly'}
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-green-500 relative overflow-hidden">
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-green-500">Save 17%</Badge>
                      </div>
                      <CardHeader>
                        <CardTitle>Yearly Plan</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center mb-6">
                          <p className="text-4xl font-bold text-slate-900">${company.yearly_price}</p>
                          <p className="text-slate-600">/year</p>
                          <p className="text-xs text-green-600 mt-1">Save ${(company.monthly_price * 12 - company.yearly_price).toFixed(2)}</p>
                        </div>
                        <ul className="space-y-2 text-sm mb-6">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            Everything in Monthly
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            Priority support
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            Advanced analytics
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            API access
                          </li>
                        </ul>
                        <Button className="w-full bg-green-600 hover:bg-green-700" disabled={company.subscription_plan === 'yearly'}>
                          {company.subscription_plan === 'yearly' ? 'Current Plan' : 'Subscribe Yearly'}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="p-4 bg-slate-50 border rounded-lg text-sm">
                    <p className="font-semibold text-slate-900 mb-2">Payment Methods Accepted:</p>
                    <div className="flex gap-4 flex-wrap">
                      <Badge variant="outline">PayPal</Badge>
                      <Badge variant="outline">Mainstack</Badge>
                      <Badge variant="outline">Credit/Debit Cards</Badge>
                      <Badge variant="outline">Bank Transfer</Badge>
                    </div>
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
              <CardTitle>User Management & Security</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {user && (
                  <>
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
                      <Badge className={`capitalize ${
                        user.email === 'johnmcgroup@gmail.com' ? 'bg-red-100 text-red-700' : ''
                      }`}>
                        {user.email === 'johnmcgroup@gmail.com' ? 'Super Admin' : user.role}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Security Settings</h4>
                      <Button
                        variant="outline"
                        onClick={() => setShowPasswordDialog(true)}
                        className="w-full justify-start"
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Change Password
                      </Button>
                    </div>

                    {isSuperAdmin && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          Super Administrator Access
                        </h4>
                        <p className="text-sm text-red-800 mb-2">
                          You have full system access across all tenants/companies.
                        </p>
                        <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                          <li>View and manage all companies</li>
                          <li>Configure system-wide settings</li>
                          <li>Access all user data</li>
                          <li>Manage subscriptions and billing</li>
                        </ul>
                      </div>
                    )}
                  </>
                )}

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Role Hierarchy</h4>
                  <div className="space-y-2 text-sm text-blue-800">
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span className="font-semibold">Super Admin</span>
                      <Badge variant="outline" className="text-red-600">Developer Only</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span className="font-semibold">Admin</span>
                      <Badge variant="outline">Tenant/Company Owner</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span className="font-semibold">Manager</span>
                      <Badge variant="outline">Department Head</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span className="font-semibold">Supervisor</span>
                      <Badge variant="outline">Team Lead</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span className="font-semibold">User</span>
                      <Badge variant="outline">Staff Member</Badge>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-500">
                  To manage other users and roles, contact your system administrator or use the Dashboard → Users section.
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

      <PasswordChangeDialog 
        open={showPasswordDialog} 
        onClose={() => setShowPasswordDialog(false)} 
      />
    </div>
  );
}
