import React, { useState, useEffect } from "react";
import { Search, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import BarcodeScanner from "./BarcodeScanner";

// Search input + camera scan button. When a barcode is scanned the value is
// passed to onScan (which fills the search box / triggers add).
export default function SearchInput({
  value, onChange, onScan, placeholder = "Search...", mobilePlaceholder,
  inputRef, className = "", autoFocus, onKeyDown, onFocus, onBlur,
}) {
  const [scanning, setScanning] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const isMobile = typeof window !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  // Phones get a shorter placeholder so it isn't cut off inside the field
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsNarrow(mq.matches);
    const handler = (e) => setIsNarrow(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Normalise onChange so callers can always read e.target.value, whether the
  // value came from a typed keystroke or a camera scan (which passes a string).
  const change = onChange ? (val) => onChange({ target: { value: val } }) : undefined;

  const handleDetect = (text) => {
    setScanning(false);
    if (onScan) onScan(text);
    else if (change) change(text);
  };

  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={isNarrow && mobilePlaceholder ? mobilePlaceholder : placeholder}
          value={value}
          onChange={onChange ? (e) => change(e.target.value) : undefined}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          autoFocus={autoFocus}
          className={`${className || "pl-9"} pr-10`}
          autoComplete="off"
        />
        <button
          type="button"
          aria-label="Scan barcode"
          onClick={() => setScanning(true)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 md:p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          title="Scan with camera"
        >
          <Camera className="w-4 h-4" />
        </button>
      </div>

      <BarcodeScanner
        open={scanning}
        onDetect={handleDetect}
        onClose={() => setScanning(false)}
      />
    </>
  );
}