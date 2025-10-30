import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wifi, WifiOff, RefreshCw, Database } from 'lucide-react';
import { useOnlineStatus } from '../../utils/connectionStatus';
import { Badge } from '@/components/ui/badge';

export default function ConnectionStatus({ showWhenOnline = false, usingCache = false }) {
  const { isOnline, wasOffline } = useOnlineStatus();

  // Don't show anything if online and not requested to show
  if (isOnline && !showWhenOnline && !wasOffline && !usingCache) {
    return null;
  }

  if (!isOnline) {
    return (
      <Alert variant="destructive" className="mb-4 border-2 border-red-500 bg-red-50">
        <WifiOff className="h-5 w-5" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <span className="font-bold">Offline Mode</span>
            <p className="text-sm mt-1">
              You're working with cached data. Sales will be saved locally and synced when connection returns.
            </p>
          </div>
          <Database className="h-8 w-8 opacity-50" />
        </AlertDescription>
      </Alert>
    );
  }

  if (wasOffline) {
    return (
      <Alert className="mb-4 border-2 border-green-500 bg-green-50">
        <Wifi className="h-5 w-5 text-green-600" />
        <AlertDescription className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-green-600" />
          <span className="font-semibold text-green-800">
            Connection Restored! Syncing data...
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  if (usingCache) {
    return (
      <Badge variant="outline" className="mb-4 bg-blue-50 text-blue-700 border-blue-300">
        <Database className="h-3 w-3 mr-1" />
        Using cached data
      </Badge>
    );
  }

  if (showWhenOnline) {
    return (
      <Badge variant="outline" className="mb-4 bg-green-50 text-green-700 border-green-300">
        <Wifi className="h-3 w-3 mr-1" />
        Online
      </Badge>
    );
  }

  return null;
}