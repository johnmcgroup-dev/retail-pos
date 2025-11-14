import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  ShoppingBag,
  Package,
  Users,
  Store,
  Activity,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import ConnectionDialog from "../components/ecommerce/ConnectionDialog";
import SyncControls from "../components/ecommerce/SyncControls";
import ProductMapping from "../components/ecommerce/ProductMapping";

export default function EcommerceSync() {
  const queryClient = useQueryClient();
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [activeTab, setActiveTab] = useState("connections");

  const { data: connections = [] } = useQuery({
    queryKey: ["platformConnections"],
    queryFn: () => base44.entities.PlatformConnection.list("-created_date"),
  });

  const { data: syncLogs = [] } = useQuery({
    queryKey: ["syncLogs"],
    queryFn: () => base44.entities.SyncLog.list("-sync_date", 50),
  });

  const { data: externalProducts = [] } = useQuery({
    queryKey: ["externalProducts"],
    queryFn: () => base44.entities.ExternalProduct.list(),
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: (id) => base44.entities.PlatformConnection.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["platformConnections"]);
    },
  });

  const statusIcons = {
    active: <CheckCircle className="w-5 h-5 text-green-500" />,
    inactive: <XCircle className="w-5 h-5 text-gray-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    pending: <Clock className="w-5 h-5 text-yellow-500" />,
  };

  const platformLogos = {
    shopify: "🛍️",
    woocommerce: "🛒",
    magento: "🏪",
    bigcommerce: "🏬",
    custom: "🌐",
  };

  const recentSyncs = syncLogs.slice(0, 10);
  const totalSynced = externalProducts.length;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">E-commerce Integration</h1>
          <p className="text-slate-500 mt-1">Sync products, orders, and customers with external platforms</p>
        </div>
        <Button
          onClick={() => {
            setSelectedConnection(null);
            setShowConnectionDialog(true);
          }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Connect Platform
        </Button>
      </div>

      {connections.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Store className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Connections Yet</h3>
            <p className="text-slate-500 mb-6">
              Connect your e-commerce platform to start syncing products, orders, and inventory
            </p>
            <Button
              onClick={() => setShowConnectionDialog(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Connect Your First Platform
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="connections">Connections</TabsTrigger>
            <TabsTrigger value="sync">Sync Control</TabsTrigger>
            <TabsTrigger value="mapping">Product Mapping</TabsTrigger>
            <TabsTrigger value="logs">Sync History</TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Active Connections</p>
                      <p className="text-3xl font-bold text-slate-900">
                        {connections.filter(c => c.connection_status === 'active').length}
                      </p>
                    </div>
                    <Activity className="w-10 h-10 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Products Synced</p>
                      <p className="text-3xl font-bold text-slate-900">{totalSynced}</p>
                    </div>
                    <Package className="w-10 h-10 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Recent Syncs</p>
                      <p className="text-3xl font-bold text-slate-900">{recentSyncs.length}</p>
                    </div>
                    <RefreshCw className="w-10 h-10 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4">
              {connections.map((connection) => (
                <Card key={connection.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">{platformLogos[connection.platform_type]}</div>
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {connection.platform_name || connection.platform_type}
                            {statusIcons[connection.connection_status]}
                          </CardTitle>
                          <CardDescription>{connection.store_url}</CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedConnection(connection);
                            setShowConnectionDialog(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                          onClick={() => deleteConnectionMutation.mutate(connection.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-slate-400" />
                        <span className="text-sm">
                          Products: {connection.sync_products ? '✓' : '✗'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-slate-400" />
                        <span className="text-sm">
                          Orders: {connection.sync_orders ? '✓' : '✗'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-sm">
                          Customers: {connection.sync_customers ? '✓' : '✗'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-slate-400" />
                        <span className="text-sm">
                          Inventory: {connection.sync_inventory ? '✓' : '✗'}
                        </span>
                      </div>
                    </div>
                    {connection.last_sync_date && (
                      <p className="text-xs text-slate-500">
                        Last synced: {format(new Date(connection.last_sync_date), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    )}
                    {connection.status_message && (
                      <Alert className="mt-2">
                        <AlertDescription>{connection.status_message}</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="sync">
            <SyncControls connections={connections} />
          </TabsContent>

          <TabsContent value="mapping">
            <ProductMapping connections={connections} />
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Synchronization History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {recentSyncs.map((log) => {
                    const connection = connections.find(c => c.id === log.connection_id);
                    return (
                      <div key={log.id} className="p-4 hover:bg-slate-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">
                              {platformLogos[connection?.platform_type || 'custom']}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">
                                {log.sync_type} sync - {connection?.platform_name || 'Unknown'}
                              </p>
                              <p className="text-sm text-slate-500">
                                {format(new Date(log.sync_date), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                log.status === 'success' ? 'success' :
                                log.status === 'failed' ? 'destructive' : 'warning'
                              }
                              className={
                                log.status === 'success' ? 'bg-green-100 text-green-700' :
                                log.status === 'failed' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }
                            >
                              {log.status}
                            </Badge>
                            <p className="text-xs text-slate-500 mt-1">
                              {log.items_succeeded}/{log.items_processed} items
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {recentSyncs.length === 0 && (
                    <div className="p-12 text-center text-slate-500">
                      <RefreshCw className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p>No sync history yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <ConnectionDialog
        open={showConnectionDialog}
        onClose={() => {
          setShowConnectionDialog(false);
          setSelectedConnection(null);
        }}
        connection={selectedConnection}
      />
    </div>
  );
}