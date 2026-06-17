import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const promptedRef = useRef(false);

  useEffect(() => {
    // Already installed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    // Detect iOS (Safari doesn't fire beforeinstallprompt)
    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !window.MSStream;
    setIsIOS(ios);

    if (ios) {
      // Show iOS instructions banner after 3s (only once per session)
      const dismissed = sessionStorage.getItem("ios_install_dismissed");
      if (!dismissed) {
        setTimeout(() => setShowBanner(true), 3000);
      }
      return;
    }

    // Android / Chrome — capture beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Auto-trigger native install prompt once available
  useEffect(() => {
    if (!deferredPrompt || promptedRef.current) return;
    promptedRef.current = true;

    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(({ outcome }) => {
      if (outcome === "dismissed") setShowBanner(true);
      setDeferredPrompt(null);
    });
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem("ios_install_dismissed", "1");
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-500 p-4 flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm">Install My Retailer Pro</p>
          {isIOS ? (
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 flex-wrap">
              Tap <Share className="w-3 h-3 inline text-blue-600" /> then
              <strong className="text-slate-700">"Add to Home Screen"</strong>
            </p>
          ) : (
            <p className="text-xs text-slate-500 mt-0.5">Works offline · Faster · Full-screen</p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          {!isIOS && (
            <Button size="sm" onClick={handleInstall} className="bg-blue-600 hover:bg-blue-700 text-xs px-3">
              Install
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handleDismiss} className="px-2">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}