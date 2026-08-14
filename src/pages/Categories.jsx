import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Package, GripVertical } from "lucide-react";
import CategoryDialog from "@/components/categories/CategoryDialog";
import { useAuth } from "@/lib/AuthContext";

export default function Categories() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.company_id || user?.tenant_id;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories", companyId],
    queryFn: () => base44.entities.Category.filter({ company_id: companyId }, "sort_order"),
    enabled: !!companyId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products_for_count", companyId],
    queryFn: () => base44.entities.Product.filter({ company_id: companyId }),
    enabled: !!companyId,
  });

  const productCountByCategory = products.reduce((acc, p) => {
    if (p.category) acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  const saveMutation = useMutation({
    mutationFn: async ({ data, id }) => {
      if (id) return base44.entities.Category.update(id, data);
      return base44.entities.Category.create({ ...data, company_id: companyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["categories"]);
      setDialogOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Category.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["categories"]),
  });

  const handleSave = (data) => saveMutation.mutate({ data, id: editing?.id });
  const handleEdit = (cat) => { setEditing(cat); setDialogOpen(true); };
  const handleNew = () => { setEditing(null); setDialogOpen(true); };
  const handleDelete = (cat) => {
    const count = productCountByCategory[cat.name] || 0;
    const msg = count > 0
      ? `"${cat.name}" has ${count} product(s) using it. Products will keep their category text but won't show in filtered views. Delete anyway?`
      : `Delete "${cat.name}"?`;
    if (window.confirm(msg)) deleteMutation.mutate(cat.id);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500">Group products so staff can filter them quickly on the POS screen.</p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="w-4 h-4" /> New Category
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-200" />
            <p className="text-slate-500 mb-2">No categories yet</p>
            <p className="text-sm text-slate-400 mb-4">Create categories like Beverages, Snacks, or Toiletries to organize your products.</p>
            <Button onClick={handleNew} className="gap-2">
              <Plus className="w-4 h-4" /> Create your first category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((cat) => {
            const count = productCountByCategory[cat.name] || 0;
            return (
              <Card key={cat.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${cat.color}20`, border: `1px solid ${cat.color}40` }}
                    >
                      <div className="w-5 h-5 rounded-full" style={{ backgroundColor: cat.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{cat.name}</p>
                      {cat.description && (
                        <p className="text-xs text-slate-500 truncate">{cat.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-slate-400">
                          {count} product{count !== 1 ? "s" : ""}
                        </span>
                        {!cat.is_active && (
                          <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Inactive</span>
                        )}
                        <span className="text-xs text-slate-300">#{cat.sort_order ?? 0}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(cat)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(cat)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CategoryDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onSave={handleSave}
        category={editing}
      />
    </div>
  );
}