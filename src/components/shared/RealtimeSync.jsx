import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// App-wide near-real-time sync.
//  1. Live entity subscriptions push changes made on any other device/session
//     straight into the current session (stock, products, sales, alerts).
//  2. A short interval re-checks the shared data as a fallback for anything a
//     subscription misses.
// Bursts of events are coalesced, and the interval pauses while the tab is
// hidden, so a busy shop never floods the API with repeat requests.
// The small, frequently-changing lists are re-checked every couple of minutes.
// The two large catalogue lists are re-checked every five, because downloading
// them in full is what consumes the API's read budget — live subscriptions keep
// them current between re-checks. Both intervals skip while the tab is hidden.
const FAST_INTERVAL_MS = 2 * 60 * 1000;
const HEAVY_INTERVAL_MS = 5 * 60 * 1000;
const COALESCE_MS = 1500;

const FAST_KEYS = [["sales"], ["alerts"]];
const HEAVY_KEYS = [["products"], ["inventory"]];

export default function RealtimeSync() {
  const queryClient = useQueryClient();
  const timersRef = useRef({});

  useEffect(() => {
    const schedule = (group, keys) => {
      if (timersRef.current[group]) clearTimeout(timersRef.current[group]);
      timersRef.current[group] = setTimeout(() => {
        delete timersRef.current[group];
        keys.forEach((key) => queryClient.invalidateQueries(key));
      }, COALESCE_MS);
    };

    const unsubscribers = [
      base44.entities.Product.subscribe(() => schedule("catalog", [["products"], ["inventory"]])),
      base44.entities.Inventory.subscribe(() => schedule("stock", [["inventory"], ["products"]])),
      base44.entities.Sale.subscribe(() => schedule("sales", [["sales"]])),
      base44.entities.Alert.subscribe(() => schedule("alerts", [["alerts"]])),
    ];

    const refresh = (keys) => {
      if (document.visibilityState !== "visible") return;
      keys.forEach((key) => queryClient.invalidateQueries(key));
    };
    const fastTimer = setInterval(() => refresh(FAST_KEYS), FAST_INTERVAL_MS);
    const heavyTimer = setInterval(() => refresh(HEAVY_KEYS), HEAVY_INTERVAL_MS);

    return () => {
      unsubscribers.forEach((unsubscribe) => {
        if (typeof unsubscribe === "function") unsubscribe();
      });
      Object.values(timersRef.current).forEach(clearTimeout);
      timersRef.current = {};
      clearInterval(fastTimer);
      clearInterval(heavyTimer);
    };
  }, [queryClient]);

  return null;
}