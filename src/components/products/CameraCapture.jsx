import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";

/**
 * Camera capture input — uses HTML5 capture attribute to open the device camera on mobile.
 * Falls back to file picker on desktop (where capture is ignored).
 */
export default function CameraCapture({ onCapture, disabled, label = "Take Photo" }) {
  const inputRef = useRef(null);

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await onCapture(file);
    }
    // Reset so the same file can be selected again
    e.target.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
        id="camera-capture"
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="w-full"
      >
        <Camera className="w-4 h-4 mr-2" />
        {disabled ? "Opening camera..." : label}
      </Button>
    </>
  );
}