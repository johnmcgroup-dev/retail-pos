import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "./useOnlineStatus";

export default function OfflineIndicator() {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-2">
      <Alert className="bg-yellow-500 text-white border-yellow-600">
        <WifiOff className="h-4 w-4" />
        <AlertDescription className="font-semibold">
          You're offline. Changes will sync when you're back online.
        </AlertDescription>
      </Alert>
    </div>
  );
}