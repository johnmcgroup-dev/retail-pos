import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, Package, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

const alertIcons = {
  low_stock: AlertTriangle,
  expiring_soon: Calendar,
  reorder_suggestion: TrendingUp,
  out_of_stock: Package,
  high_demand: TrendingUp
};

export default function AlertBanner({ alerts, onDismiss, onViewAll }) {
  if (!alerts || alerts.length === 0) return null;

  const criticalAlerts = alerts.filter(a => a.severity === "critical" && !a.is_dismissed);
  const warningAlerts = alerts.filter(a => a.severity === "warning" && !a.is_dismissed);
  
  const displayAlerts = [...criticalAlerts.slice(0, 2), ...warningAlerts.slice(0, 1)].slice(0, 3);
  
  if (displayAlerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {displayAlerts.map((alert) => {
        const Icon = alertIcons[alert.type] || AlertTriangle;
        
        return (
          <Alert
            key={alert.id}
            className={cn(
              "border-2",
              alert.severity === "critical" && "bg-red-50 border-red-300",
              alert.severity === "warning" && "bg-yellow-50 border-yellow-300",
              alert.severity === "info" && "bg-blue-50 border-blue-300"
            )}
          >
            <Icon className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <span className="font-semibold">{alert.title}:</span> {alert.message}
                {alert.product_name && (
                  <span className="text-xs ml-2 opacity-80">({alert.product_name})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={alert.severity === "critical" ? "destructive" : "secondary"}>
                  {alert.type.replace(/_/g, " ")}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onDismiss(alert.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        );
      })}
      
      {alerts.length > 3 && (
        <Button
          variant="outline"
          size="sm"
          onClick={onViewAll}
          className="w-full"
        >
          View All {alerts.length} Notifications
        </Button>
      )}
    </div>
  );
}