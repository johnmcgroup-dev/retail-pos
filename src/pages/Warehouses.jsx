import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import DrawerSelect from "@/components/shared/DrawerSelect";
import { Building2, Plus, Edit2, Trash2, MapPin, Phone, X, Loader2 } from "lucide-react";

export default function Warehouses() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    phone: "",
    manager_name: "",
    manager_email: "",
    warehouse_type: "main",
    notes: "",
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });
  const company = companies[0];

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => base44.entities.Warehouse.filter({ company_id: company?.id }),
    enabled: !!company?.id,
  });

  const resetForm = () => {
    setForm({ name: "", code: "", address: "", city: "", state: "", phone: "", manager_name: "", manager_email: "", warehouse_type: "main", notes: "" });
    setEditing(null);
    setShowForm(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = { ...form, company_id: company.id };
      if (editing) {
        return base44.entities.Warehouse.update(editing.id, data);
      }
      return base44.entities.Warehouse.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Warehouse.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["warehouses"] }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) return;
    saveMutation.mutate();
  };

  const startEdit = (wh) => {
    setEditing(wh);
    setForm({
      name: wh.name || "",
      code: wh.code || "",
      address: wh.address || "",
      city: wh.city || "",
      state: wh.state || "",
      phone: wh.phone || "",
      manager_name: wh.manager_name || "",
      manager_email: wh.manager_email || "",
      warehouse_type: wh.warehouse_type || "main",
      notes: wh.notes || "",
    });
    setShowForm(true);
  };

  const typeLabels = {
    main: "Main",
    branch: "Branch",
    retail_store: "Retail Store",
    distribution_center: "Distribution Center",
  };

  const typeColors = {
    main: "bg-blue-100 text-blue-700",
    branch: "bg-green-100 text-green-700",
    retail_store: "bg-purple-100 text-purple-700",
    distribution_center: "bg-orange-100 text-orange-700",
  };

  if (!company) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-200" />
        <p>Loading company data...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600" />
            Branches & Warehouses
          </h1>
          <p className="text-slate-500 mt-1">Manage multiple locations for {company.name}</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Branch
        </Button>
      </div>

      {/* Form dialog */}
      {showForm && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">{editing ? "Edit Branch" : "Add New Branch"}</h2>
              <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Branch Name *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Lekki Branch" required className="mt-1" />
                </div>
                <div>
                  <Label>Branch Code</Label>
                  <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. LK-01" className="mt-1" />
                </div>
              </div>

              <div>
                <Label>Type</Label>
                <DrawerSelect
                  value={form.warehouse_type}
                  onValueChange={v => setForm({ ...form, warehouse_type: v })}
                  options={[
                    { value: "main", label: "Main Warehouse" },
                    { value: "branch", label: "Branch" },
                    { value: "retail_store", label: "Retail Store" },
                    { value: "distribution_center", label: "Distribution Center" },
                  ]}
                  placeholder="Select type"
                  label="Type"
                  triggerClassName="w-full h-9 border border-input bg-background rounded-md px-3 text-sm font-medium mt-1"
                />
              </div>

              <div>
                <Label>Address</Label>
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street address" className="mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>City</Label>
                  <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} className="mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+234..." className="mt-1" />
                </div>
                <div>
                  <Label>Manager Name</Label>
                  <Input value={form.manager_name} onChange={e => setForm({ ...form, manager_name: e.target.value })} className="mt-1" />
                </div>
              </div>

              <div>
                <Label>Manager Email</Label>
                <Input type="email" value={form.manager_email} onChange={e => setForm({ ...form, manager_email: e.target.value })} className="mt-1" />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="mt-1" />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit" disabled={saveMutation.isPending} className="gap-2">
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editing ? "Update" : "Create"} Branch
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Warehouse list */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">
          <Loader2 className="w-8 h-8 mx-auto animate-spin" />
        </div>
      ) : warehouses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-200" />
            <p>No branches yet. Create your first branch to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map(wh => (
            <Card key={wh.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <h3 className="font-bold text-slate-900 truncate">{wh.name}</h3>
                    </div>
                    {wh.code && <span className="text-xs text-slate-400 font-mono">{wh.code}</span>}
                  </div>
                  <Badge className={`text-xs ${typeColors[wh.warehouse_type] || "bg-slate-100 text-slate-700"}`}>
                    {typeLabels[wh.warehouse_type] || wh.warehouse_type}
                  </Badge>
                </div>

                {(wh.address || wh.city || wh.state) && (
                  <div className="flex items-start gap-1.5 text-sm text-slate-600 mb-2">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400 flex-shrink-0" />
                    <span>{[wh.address, wh.city, wh.state].filter(Boolean).join(", ")}</span>
                  </div>
                )}

                {wh.phone && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600 mb-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{wh.phone}</span>
                  </div>
                )}

                {wh.manager_name && (
                  <p className="text-xs text-slate-500 mt-2">
                    Manager: <span className="font-medium text-slate-700">{wh.manager_name}</span>
                  </p>
                )}

                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => startEdit(wh)}>
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => {
                      if (confirm(`Delete branch "${wh.name}"?`)) deleteMutation.mutate(wh.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}