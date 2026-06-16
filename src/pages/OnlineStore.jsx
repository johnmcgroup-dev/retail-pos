import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Store, 
  Globe, 
  ShoppingBag, 
  Package,
  Settings as SettingsIcon,
  Palette,
  CreditCard,
  Truck,
  Eye,
  Copy,
  Check,
  ExternalLink
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function OnlineStore() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("settings");

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ["onlineStores"],
    queryFn: () => base44.entities.OnlineStore.list(),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["onlineOrders"],
    queryFn: () => base44.entities.OnlineOrder.list("-order_date"),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.filter({ status: "active" }),
  });

  const store = stores[0];
  const company = companies[0];

  const [storeForm, setStoreForm] = useState({
    store_name: store?.store_name || "",
    store_url: store?.store_url || "",
    description: store?.description || "",
    theme_color: store?.theme_color || "#3b82f6",
    currency: store?.currency || "USD",
    payment_gateways: store?.payment_gateways || ["stripe", "paypal"],
    shipping_enabled: store?.shipping_enabled ?? true,
    shipping_fee: store?.shipping_fee || 0,
    free_shipping_threshold: store?.free_shipping_threshold || 50,
    tax_rate: store?.tax_rate || 0,
    contact_email: store?.contact_email || company?.email || "",
    contact_phone: store?.contact_phone || company?.phone || "",
    is_active: store?.is_active ?? true
  });

  const saveStoreMutation = useMutation({
    mutationFn: async (data) => {
      if (store) {
        return base44.entities.OnlineStore.update(store.id, data);
      }
      return base44.entities.OnlineStore.create({
        ...data,
        company_id: company.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["onlineStores"]);
      alert("Store settings saved successfully!");
    },
  });

  const handleSaveStore = () => {
    saveStoreMutation.mutate(storeForm);
  };

  const handleCopyUrl = () => {
    const storeUrl = `${window.location.origin}/store/${storeForm.store_url}`;
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pendingOrders = orders.filter(o => o.order_status === 'pending').length;
  const processingOrders = orders.filter(o => o.order_status === 'processing').length;
  const totalRevenue = orders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const storeUrl = `${window.location.origin}/store/${storeForm.store_url || 'your-store'}`;

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Online Store</h1>
          <p className="text-slate-500 mt-1">Manage your e-commerce storefront</p>
        </div>
        {store && (
          <Button
            onClick={() => window.open(storeUrl, '_blank')}
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview Store
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Store Status</p>
                <p className="text-2xl font-bold">
                  {store?.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>
              <Store className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Online Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
              </div>
              <CreditCard className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Pending Orders</p>
                <p className="text-2xl font-bold">{pendingOrders}</p>
              </div>
              <ShoppingBag className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Products</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
              <Package className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Store URL */}
      {storeForm.store_url && (
        <Alert className="bg-blue-50 border-blue-200">
          <Globe className="h-4 w-4 text-blue-600" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-blue-900 mb-1">Your Store URL:</p>
              <code className="text-sm text-blue-700">{storeUrl}</code>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyUrl}
                className="gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button
                size="sm"
                onClick={() => window.open(storeUrl, '_blank')}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Visit
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings" className="gap-2">
            <SettingsIcon className="w-4 h-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="design" className="gap-2">
            <Palette className="w-4 h-4" />
            Design
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="shipping" className="gap-2">
            <Truck className="w-4 h-4" />
            Shipping
          </TabsTrigger>
        </TabsList>

        {/* Store Settings */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Store Name *</Label>
                  <Input
                    value={storeForm.store_name}
                    onChange={(e) => setStoreForm({ ...storeForm, store_name: e.target.value })}
                    placeholder="My Awesome Store"
                  />
                </div>

                <div>
                  <Label>Store URL Slug *</Label>
                  <Input
                    value={storeForm.store_url}
                    onChange={(e) => setStoreForm({ ...storeForm, store_url: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="my-store"
                  />
                  <p className="text-xs text-slate-500 mt-1">Only lowercase letters, numbers, and hyphens</p>
                </div>

                <div className="md:col-span-2">
                  <Label>Store Description</Label>
                  <Textarea
                    value={storeForm.description}
                    onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
                    rows={3}
                    placeholder="Tell customers about your store..."
                  />
                </div>

                <div>
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={storeForm.contact_email}
                    onChange={(e) => setStoreForm({ ...storeForm, contact_email: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Contact Phone</Label>
                  <Input
                    value={storeForm.contact_phone}
                    onChange={(e) => setStoreForm({ ...storeForm, contact_phone: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Store Active</Label>
                    <p className="text-sm text-slate-500">Make store visible to customers</p>
                  </div>
                  <Switch
                    checked={storeForm.is_active}
                    onCheckedChange={(checked) => setStoreForm({ ...storeForm, is_active: checked })}
                  />
                </div>
              </div>

              <Button onClick={handleSaveStore} disabled={saveStoreMutation.isPending}>
                {saveStoreMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Design Settings */}
        <TabsContent value="design">
          <Card>
            <CardHeader>
              <CardTitle>Store Design</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Primary Color</Label>
                <div className="flex gap-4 items-center">
                  <Input
                    type="color"
                    value={storeForm.theme_color}
                    onChange={(e) => setStoreForm({ ...storeForm, theme_color: e.target.value })}
                    className="w-20 h-12"
                  />
                  <Input
                    value={storeForm.theme_color}
                    onChange={(e) => setStoreForm({ ...storeForm, theme_color: e.target.value })}
                    placeholder="#3b82f6"
                  />
                </div>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <Palette className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  To upload custom logo and banner images, use the File Upload integration in your product images or contact support for advanced customization.
                </AlertDescription>
              </Alert>

              <Button onClick={handleSaveStore} disabled={saveStoreMutation.isPending}>
                {saveStoreMutation.isPending ? 'Saving...' : 'Save Design'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment Gateways</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {['stripe', 'paypal', 'mainstack'].map((gateway) => (
                  <div key={gateway} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={storeForm.payment_gateways?.includes(gateway)}
                        onCheckedChange={(checked) => {
                          const current = storeForm.payment_gateways || [];
                          setStoreForm({
                            ...storeForm,
                            payment_gateways: checked
                              ? [...current, gateway]
                              : current.filter(g => g !== gateway)
                          });
                        }}
                      />
                      <div>
                        <p className="font-medium text-slate-900 capitalize">{gateway}</p>
                        <p className="text-xs text-slate-500">
                          {gateway === 'stripe' && 'Credit cards, Apple Pay, Google Pay'}
                          {gateway === 'paypal' && 'PayPal balance and linked cards'}
                          {gateway === 'mainstack' && 'African payment methods'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Demo Mode</Badge>
                  </div>
                ))}
              </div>

              <Alert className="bg-yellow-50 border-yellow-200">
                <CreditCard className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Setup Required:</strong> Configure payment gateway API keys in Dashboard → Settings → Backend Functions to process real payments.
                </AlertDescription>
              </Alert>

              <div>
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={storeForm.tax_rate}
                  onChange={(e) => setStoreForm({ ...storeForm, tax_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <Button onClick={handleSaveStore} disabled={saveStoreMutation.isPending}>
                {saveStoreMutation.isPending ? 'Saving...' : 'Save Payment Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipping Settings */}
        <TabsContent value="shipping">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Enable Shipping</Label>
                  <p className="text-sm text-slate-500">Offer shipping to customers</p>
                </div>
                <Switch
                  checked={storeForm.shipping_enabled}
                  onCheckedChange={(checked) => setStoreForm({ ...storeForm, shipping_enabled: checked })}
                />
              </div>

              {storeForm.shipping_enabled && (
                <>
                  <div>
                    <Label>Shipping Fee ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={storeForm.shipping_fee}
                      onChange={(e) => setStoreForm({ ...storeForm, shipping_fee: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <Label>Free Shipping Threshold ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={storeForm.free_shipping_threshold}
                      onChange={(e) => setStoreForm({ ...storeForm, free_shipping_threshold: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g., 50"
                    />
                    <p className="text-xs text-slate-500 mt-1">Orders above this amount ship free</p>
                  </div>
                </>
              )}

              <Button onClick={handleSaveStore} disabled={saveStoreMutation.isPending}>
                {saveStoreMutation.isPending ? 'Saving...' : 'Save Shipping Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}