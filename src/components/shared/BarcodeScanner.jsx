import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, RefreshCw } from "lucide-react";

// Camera barcode scanner modal — works on mobile + desktop browsers with a camera.
// Uses ZXing's BrowserMultiFormatReader for continuous video decoding (1D + 2D codes).
export default function BarcodeScanner({ open, onDetect, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const [status, setStatus] = useState("starting"); // starting | scanning | denied | error
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    const start = async () => {
      try {
        setStatus("starting");
        // Use the video element directly; ZXing picks the best camera.
        // BrowserMultiFormatReader decodes common 1D retail barcodes + QR/2D codes.
        controlsRef.current = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (cancelled) return;
            if (result) {
              const text = result.getText();
              if (text) {
                onDetect?.(text);
              }
            }
          }
        );
        if (!cancelled) setStatus("scanning");
      } catch (e) {
        if (cancelled) return;
        const msg = String(e?.message || e || "");
        if (msg.includes("Permission") || msg.includes("NotAllowed") || e?.name === "NotAllowedError") {
          setStatus("denied");
          setErrorMsg("Camera access was blocked. Allow camera permission in your browser settings and try again.");
        } else if (msg.includes("NoCamera") || msg.includes("NotFound") || e?.name === "NotFoundError") {
          setStatus("error");
          setErrorMsg("No camera found on this device.");
        } else {
          setStatus("error");
          setErrorMsg(msg || "Could not start the camera.");
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      try { controlsRef.current?.stop(); } catch (_) {}
      controlsRef.current = null;
      // free the camera
      const v = videoRef.current;
      if (v && v.srcObject) {
        try {
          v.srcObject.getTracks?.().forEach((t) => t.stop());
          v.srcObject = null;
        } catch (_) {}
      }
    };
  }, [open]);

  const retry = async () => {
    try { controlsRef.current?.stop(); } catch (_) {}
    controlsRef.current = null;
    setErrorMsg("");
    setStatus("starting");
    try {
      controlsRef.current = await readerRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          if (result) {
            const text = result.getText();
            if (text) onDetect?.(text);
          }
        }
      );
      setStatus("scanning");
    } catch (e) {
      setStatus("error");
      setErrorMsg(String(e?.message || e || "Could not start the camera."));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Camera className="w-5 h-5" /> Scan Barcode
          </DialogTitle>
        </DialogHeader>

        <div className="p-4">
          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
              autoPlay
            />
            {/* Aim frame */}
            <div className="absolute inset-8 border-2 border-white/70 rounded-lg pointer-events-none" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-3 text-white text-xs bg-black/50 px-3 py-1 rounded-full">
              {status === "starting" && "Starting camera…"}
              {status === "scanning" && "Point at a barcode"}
              {(status === "denied" || status === "error") && "Camera unavailable"}
            </div>
            {status === "starting" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </div>

          {(status === "denied" || status === "error") && (
            <div className="mt-3 text-center">
              <p className="text-sm text-red-600 mb-3">{errorMsg}</p>
              <Button variant="outline" size="sm" onClick={retry} className="gap-2">
                <RefreshCw className="w-4 h-4" /> Try again
              </Button>
            </div>
          )}

          {status === "scanning" && (
            <p className="mt-3 text-center text-xs text-slate-500">
              Keep the barcode inside the frame. It scans automatically.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}