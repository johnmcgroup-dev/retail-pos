import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  Package, 
  Calendar, 
  TrendingUp, 
  X, 
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const alertIcons = {
  low_stock: AlertTriangle,
  expiring_soon: Calendar,
  reorder_suggestion: TrendingUp,
  out_of_stock: Package,
  high_demand: TrendingUp
};

const severityStyles = {
  info: "bg-blue-50 border-blue-200 text-blue-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  critical: "bg-red-50 border-red-200 text-red-800"
};

export default function NotificationCenter({ open, onClose }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");

  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => base44.entities.Alert.filter({ is_dismissed: false }, "-created_date"),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (alertId) => base44.entities.Alert.update(alertId, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(["alerts"]);
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (alertId) => base44.entities.Alert.update(alertId, { is_dismissed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(["alerts"]);
    },
  });

  const dismissAllMutation = useMutation({
    mutationFn: async () => {
      const dismissPromises = alerts.map(alert => 
        base44.entities.Alert.update(alert.id, { is_dismissed: true })
      );
      await Promise.all(dismissPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["alerts"]);
    },
  });

  const filteredAlerts = filter === "all" 
    ? alerts 
    : alerts.filter(a => a.severity === filter);

  const unreadCount = alerts.filter(a => !a.is_read).length;
  const criticalCount = alerts.filter(a => a.severity === "critical").length;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              Notifications
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
              )}
            </div>
            {alerts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissAllMutation.mutate()}
                disabled={dismissAllMutation.isPending}
              >
                Clear All
              </Button>
            )}
          </SheetTitle>
          <SheetDescription>
            Stay updated on inventory alerts and notifications
          </SheetDescription>
        </SheetHeader>

        <Tabs value={filter} onValueChange={setFilter} className="mt-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="all">
              All
              {alerts.length > 0 && (
                <Badge variant="secondary" className="ml-2">{alerts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="critical">
              Critical
              {criticalCount > 0 && (
                <Badge variant="destructive" className="ml-2">{criticalCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="warning">Warning</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-4 space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto">
            {filteredAlerts.map((alert) => {
              const Icon = alertIcons[alert.type] || AlertCircle;
              
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "p-4 border rounded-lg transition-all",
                    severityStyles[alert.severity],
                    !alert.is_read && "shadow-md"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        alert.severity === "critical" && "bg-red-200",
                        alert.severity === "warning" && "bg-yellow-200",
                        alert.severity === "info" && "bg-blue-200"
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">{alert.title}</h4>
                        <p className="text-sm opacity-90 mb-2">{alert.message}</p>
                        
                        {alert.product_name && (
                          <div className="text-xs opacity-80 space-y-1">
                            <p>Product: <span className="font-semibold">{alert.product_name}</span></p>
                            {alert.current_stock !== undefined && (
                              <p>Current Stock: <span className="font-semibold">{alert.current_stock}</span></p>
                            )}
                            {alert.suggested_order_quantity && (
                              <p>Suggested Order: <span className="font-semibold">{alert.suggested_order_quantity} units</span></p>
                            )}
                            {alert.days_until_expiry !== undefined && (
                              <p>Days Until Expiry: <span className="font-semibold">{alert.days_until_expiry}</span></p>
                            )}
                          </div>
                        )}
                        
                        <p className="text-xs opacity-70 mt-2">
                          {format(new Date(alert.created_date), "MMM d, yyyy h:mm a")}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      {!alert.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => markAsReadMutation.mutate(alert.id)}
                          className="h-8 w-8"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => dismissMutation.mutate(alert.id)}
                        className="h-8 w-8"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {filteredAlerts.length === 0 && (
              <div className="text-center py-12">
                <Info className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No {filter !== "all" ? filter : ""} notifications</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}