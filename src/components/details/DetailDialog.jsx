import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";

const SIZES = {
  md: "max-w-2xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

/**
 * Read-only detail shell for a clicked card.
 *
 * Closing: the X button (from DialogContent), clicking outside, or Esc.
 * It only renders what it is given — it never writes, saves or deletes.
 */
export default function DetailDialog({ open, onClose, title, subtitle, badge, size = "lg", children }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose?.(); }}>
      <DialogContent className={`${SIZES[size] || SIZES.lg} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base md:text-lg pr-6">
            {title}
            {badge && <Badge variant="secondary" className="text-[10px]">{badge}</Badge>}
          </DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 border-b border-slate-100 pb-2">
          <Eye className="w-3 h-3 flex-shrink-0" />
          Read-only view — viewing this cannot change any data.
        </div>
        <div className="space-y-5">{children}</div>
      </DialogContent>
    </Dialog>
  );
}