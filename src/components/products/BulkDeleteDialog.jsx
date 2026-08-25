import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle, Download, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Developer-only bulk delete with a local JSON backup downloaded first.
export default function BulkDeleteDialog({ open, onClose, products = [], inventory = [], onDeleted }) {
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("");

  const total = products.length;

  const backupToLocal = () => {
    const invByProduct = {};
    (inventory || []).forEach((inv) => {
      (invByProduct[inv.product_id] ||= []).push(inv);
    });
    const payload = {
      exported_at: new Date().toISOString(),
      count: products.length,
      products: products.map((p) => ({ ...p, _inventory: invByProduct[p.id] || [] })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteAll = async () => {
    if (confirmText !== "DELETE" || total === 0) return;
    setBusy(true);
    try {
      setPhase("Backing up records to this device…");
      backupToLocal();
      await new Promise((r) => setTimeout(r, 500)); // let the download register
      setPhase("Deleting products…");
      let done = 0;
      for (const p of products) {
        await base44.entities.Product.delete(p.id);
        done += 1;
        setProgress(done);
      }
      setPhase("Done");
      onDeleted?.();
      onClose();
    } catch (e) {
      console.error("Bulk delete failed", e);
      setPhase("Error: " + (e?.message || "delete failed"));
    } finally {
      setBusy(false);
      setConfirmText("");
      setProgress(0);
      setPhase("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" /> Delete {total} products
          </DialogTitle>
          <DialogDescription>
            This permanently deletes <b>{total}</b> product records. A backup JSON file
            (products + inventory) is downloaded to this device first. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {!busy ? (
          <>
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <Download className="w-4 h-4 mt-0.5" />
              <span>A backup of all {total} records will be saved before deletion. Keep it safe — deletion is irreversible.</span>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">
                Type <b>DELETE</b> to confirm
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="mt-1"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAll}
                disabled={confirmText !== "DELETE"}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" /> Backup &amp; Delete {total}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-6 space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Loader2 className="w-4 h-4 animate-spin" /> {phase}
            </div>
            {progress > 0 && (
              <div className="text-xs text-slate-500">{progress} / {total} deleted</div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}