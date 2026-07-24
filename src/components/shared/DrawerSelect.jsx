import React, { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export default function DrawerSelect({ value, onValueChange, options, placeholder, triggerClassName = "", label = "Select" }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <>
      {/* Desktop: native select */}
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={`hidden md:block ${triggerClassName}`}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Mobile: button + drawer */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`md:hidden flex items-center justify-between text-left min-h-[44px] ${triggerClassName}`}
      >
        <span className="truncate">{selected?.label || placeholder || "Select..."}</span>
        <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0 ml-2" />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{label}</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-auto p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] max-h-[60vh]">
            {options.map(o => (
              <button
                key={o.value}
                onClick={() => { onValueChange(o.value); setOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-colors min-h-[44px] ${
                  o.value === value ? "bg-blue-50 text-blue-700 font-semibold" : "hover:bg-slate-50"
                }`}
              >
                <span className="text-sm">{o.label}</span>
                {o.value === value && <Check className="w-4 h-4 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}