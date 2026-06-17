import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const promptedRef = useRef(false);

  useEffect(() => {
    // Already installed as standalone app
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Auto-trigger native install prompt as soon as it's available (once only)
  useEffect(() => {
    if (!deferredPrompt || promptedRef.current) return;
    promptedRef.current = true;

    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(({ outcome }) => {
      if (outcome === 'dismissed') {
        // User declined native prompt — show fallback banner
        setShowBanner(true);
      }
      setDeferredPrompt(null);
    });
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowBanner(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-500 p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm">Install My Retailer Pro</p>
          <p className="text-xs text-slate-500">Works offline, faster &amp; full-screen</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button size="sm" onClick={handleInstall} className="bg-blue-600 hover:bg-blue-700 text-xs px-3">
            Install
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowBanner(false)} className="px-2">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}