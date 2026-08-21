import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import DrawerSelect from "@/components/shared/DrawerSelect";
import { Loader2, Tag } from "lucide-react";

export default function BulkCategoryAssignDialog({ open, onClose, selectedProducts, companies }) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("");

  const companyId = companies[0]?.id;
  const { data: managedCategories = [], isLoading } = useQuery({
    queryKey: ["categories", companyId],
    queryFn: () => base44.entities.Category.filter({ company_id: companyId, is_active: true }, "sort_order"),
    enabled: !!companyId && open,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      const updates = selectedProducts.map(p => ({ id: p.id, category }));
      return base44.entities.Product.bulkUpdate(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      onClose();
      setCategory("");
    },
  });

  const count = selectedProducts.length;
  const hasCategories = managedCategories.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-4 h-4" /> Bulk Assign Category
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-600">
            Assign a category to <span className="font-semibold text-slate-900">{count}</span> selected
            product{count !== 1 ? "s" : ""}. This replaces each product's current category.
          </p>
          <div>
            <Label className="mb-1.5 block">Category</Label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 h-9">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading categories...
              </div>
            ) : hasCategories ? (
              <DrawerSelect
                value={category}
                onValueChange={setCategory}
                options={[
                  { value: "", label: "— No category (clear) —" },
                  ...managedCategories.map(c => ({ value: c.name, label: c.name })),
                ]}
                placeholder="Select a category"
                label="Category"
                triggerClassName="w-full h-9 px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            ) : (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                No categories found. Create categories first from the Categories page.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!count || assignMutation.isPending || !hasCategories}
            onClick={() => assignMutation.mutate()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {assignMutation.isPending
              ? "Assigning..."
              : `Assign to ${count} product${count !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}