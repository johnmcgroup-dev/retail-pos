import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GitBranch } from "lucide-react";

/**
 * Pick the store(s) a team member works at. Their first choice becomes their
 * default branch, which is what the POS and reports open on.
 */
export default function UserBranchesDialog({ open, onOpenChange, user, branches, onSave, saving }) {
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (open && user) setSelected(Array.isArray(user.branch_ids) ? user.branch_ids.filter(Boolean) : []);
  }, [open, user]);

  const toggle = (id) =>
    setSelected((current) => (current.includes(id) ? current.filter((v) => v !== id) : [...current, id]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Branches
          </DialogTitle>
          <DialogDescription>
            {user?.full_name || user?.email} — the stores they can work in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2 max-h-[50vh] overflow-auto">
          {branches.length === 0 ? (
            <p className="text-sm text-slate-500">No branches yet — add one on the Branches page first.</p>
          ) : (
            branches.map((branch) => (
              <label key={branch.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <Checkbox checked={selected.includes(branch.id)} onCheckedChange={() => toggle(branch.id)} />
                <span className="text-sm text-slate-800">{branch.name}</span>
                {branch.is_default && <span className="text-[10px] text-slate-400 uppercase">default</span>}
              </label>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            disabled={saving}
            onClick={() => onSave(selected)}
          >
            Save branches
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}