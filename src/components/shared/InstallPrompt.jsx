import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Auto-trigger after a short delay so the page has loaded
      setTimeout(() => {
        if (!dismissed) setShowPrompt(true);
      }, 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Auto-trigger the native prompt immediately when available
  useEffect(() => {
    if (deferredPrompt && !dismissed) {
      // Attempt auto-install: show native prompt right away
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(({ outcome }) => {
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          setShowPrompt(false);
        } else {
          // User dismissed native prompt — show our fallback banner
          setShowPrompt(true);
        }
      });
    }
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-500 p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm">Install My Retailer Pro</p>
          <p className="text-xs text-slate-500">Works offline, faster & full-screen</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button size="sm" onClick={handleInstall} className="bg-blue-600 hover:bg-blue-700 text-xs px-3">
            Install
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDismiss} className="px-2">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}