import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { generateLowStockAlerts } from "@/lib/generateLowStockAlerts";

// How long before the same stock picture is reconciled again. Without this the
// watcher fired on every product/inventory refresh — including the ones caused
// by real-time sync — which is exactly the kind of repeat request that trips a
// rate limit.
const MIN_RUN_INTERVAL_MS = 5 * 60 * 1000;

// App-wide automated low-stock alert: runs when product/inventory data loads or
// refreshes (e.g. after a sale), creates Alert records for items below their
// reorder_level, and fires an in-app toast for newly-triggered alerts.
export default function LowStockAlertWatcher() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const lastRunRef = useRef(0);
  const signatureRef = useRef("");

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });
  const companyId = user?.company_id || user?.tenant_id;

  const { data: products = [] } = useQuery({
    queryKey: ["products", companyId],
    queryFn: () => base44.entities.Product.filter({ company_id: companyId }),
    enabled: !!companyId,
  });
  const { data: inventory = [], isSuccess: invLoaded } = useQuery({
    queryKey: ["inventory", companyId],
    queryFn: () => base44.entities.Inventory.filter({ company_id: companyId }),
    enabled: !!companyId,
  });

  useEffect(() => {
    if (!companyId || !products.length || !invLoaded) return;
    if (document.visibilityState !== "visible") return;

    // Only reconcile when the stock picture actually changed, and at most once
    // per interval — a page revisit or a sync refresh alone is not a reason to
    // write again.
    const signature = inventory
      .map((inv) => `${inv.product_id}:${inv.quantity}`)
      .sort()
      .join("|");
    const now = Date.now();
    if (signature === signatureRef.current && now - lastRunRef.current < MIN_RUN_INTERVAL_MS) return;
    if (now - lastRunRef.current < MIN_RUN_INTERVAL_MS) return;

    signatureRef.current = signature;
    lastRunRef.current = now;

    generateLowStockAlerts({ companyId, products, inventory }).then((res) => {
      if (res.created > 0) {
        queryClient.invalidateQueries(["alerts"]);
        toast({
          title: "Low stock alert",
          description: `${res.created} product(s) fell below their reorder threshold. Tap the bell to review.`,
          variant: "destructive",
        });
      }
    }).catch(() => {});
  }, [companyId, products, inventory, invLoaded]);

  return null;
}