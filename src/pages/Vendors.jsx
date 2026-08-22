import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Building2, Mail, Phone, Edit, CreditCard, DollarSign, X, Banknote } from "lucide-react";
import { format } from "date-fns";

const EMPTY_VENDOR = {
  name: "", contact_person: "", email: "", phone: "", address: "",
  tax_id: "", payment_terms: "", bank_name: "", bank_account_number: "",
  bank_account_name: "", bank_sort_code: "", notes: "", status: "active"
};

function VendorDialog({ open, onClose, vendor, companyId }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(vendor ? { ...vendor } : { ...EMPTY_VENDOR });

  React.useEffect(() => {
    setForm(vendor ? { ...vendor } : { ...EMPTY_VENDOR });
  }, [vendor]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (vendor?.id) {
        return base44.entities.Vendor.update(vendor.id, form);
      }
      return base44.entities.Vendor.create({ ...form, company_id: companyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["vendors"]);
      onClose();
    }
  });

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vendor?.id ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vendor Name *</Label>
              <Input className="mt-1" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Company name" />
            </div>
            <div>
              <Label>Contact Person</Label>
              <Input className="mt-1" value={form.contact_person} onChange={e => set("contact_person", e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input className="mt-1" type="email" value={form.email} onChange={e => set("email", e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input className="mt-1" value={form.phone} onChange={e => set("phone", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              <Input className="mt-1" value={form.address} onChange={e => set("address", e.target.value)} />
            </div>
            <div>
              <Label>Tax ID / RC Number</Label>
              <Input className="mt-1" value={form.tax_id} onChange={e => set("tax_id", e.target.value)} />
            </div>
            <div>
              <Label>Payment Terms</Label>
              <Input className="mt-1" value={form.payment_terms} onChange={e => set("payment_terms", e.target.value)} placeholder="e.g. Net 30" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><Banknote className="w-4 h-4 text-green-600" /> Bank / Payment Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bank Name</Label>
                <Input className="mt-1" value={form.bank_name} onChange={e => set("bank_name", e.target.value)} placeholder="e.g. GTBank" />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input className="mt-1" value={form.bank_account_number} onChange={e => set("bank_account_number", e.target.value)} />
              </div>
              <div>
                <Label>Account Name</Label>
                <Input className="mt-1" value={form.bank_account_name} onChange={e => set("bank_account_name", e.target.value)} />
              </div>
              <div>
                <Label>Sort Code / Routing</Label>
                <Input className="mt-1" value={form.bank_sort_code} onChange={e => set("bank_sort_code", e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea className="mt-1" value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Vendor"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PayVendorDialog({ open, onClose, vendor, companyId }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");

  const payMutation = useMutation({
    mutationFn: async () => {
      const paid = parseFloat(amount);
      await base44.entities.Payment.create({
        company_id: companyId,
        reference_type: "purchase",
        payer_type: "vendor",
        payer_id: vendor.id,
        payer_name: vendor.name,
        payment_date: new Date().toISOString(),
        amount: paid,
        payment_method: method,
        transaction_reference: reference,
        payment_status: "completed",
        notes: `Payment to vendor ${vendor.name}`
      });
      const newOutstanding = Math.max(0, (vendor.outstanding_balance || 0) - paid);
      await base44.entities.Vendor.update(vendor.id, { outstanding_balance: newOutstanding });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["vendors"]);
      queryClient.invalidateQueries(["payments"]);
      onClose();
      setAmount("");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pay Vendor — {vendor?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {vendor?.bank_name && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm space-y-1">
              <p className="font-semibold text-green-800">Bank Details</p>
              <p className="text-green-700"><span className="font-medium">Bank:</span> {vendor.bank_name}</p>
              {vendor.bank_account_number && <p className="text-green-700"><span className="font-medium">Account:</span> {vendor.bank_account_number}</p>}
              {vendor.bank_account_name && <p className="text-green-700"><span className="font-medium">Name:</span> {vendor.bank_account_name}</p>}
              {vendor.bank_sort_code && <p className="text-green-700"><span className="font-medium">Sort Code:</span> {vendor.bank_sort_code}</p>}
            </div>
          )}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
            <p className="text-orange-700">Outstanding Balance: <span className="font-bold text-orange-900">₦{(vendor?.outstanding_balance || 0).toLocaleString()}</span></p>
          </div>
          <div>
            <Label>Amount to Pay *</Label>
            <Input className="mt-1" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Cheque</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reference / Transaction ID</Label>
            <Input className="mt-1" value={reference} onChange={e => setReference(e.target.value)} placeholder="Optional reference" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => payMutation.mutate()} disabled={!amount || parseFloat(amount) <= 0 || payMutation.isPending} className="bg-green-600 hover:bg-green-700">
              {payMutation.isPending ? "Processing..." : "Record Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Vendors() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [payDialogVendor, setPayDialogVendor] = useState(null);

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => base44.entities.Vendor.list("-created_date"),
  });

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me(), staleTime: 5 * 60 * 1000 });
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => base44.entities.Purchase.list("-purchase_date"),
  });

  const myCompanyId = user?.company_id || user?.tenant_id;
  const activeCompany = (myCompanyId && companies.find(c => c.id === myCompanyId)) || companies[0];
  const companyId = activeCompany?.id;
  const currency = activeCompany?.currency || "NGN";

  const filteredVendors = vendors.filter(v =>
    v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOutstanding = vendors.reduce((sum, v) => sum + (v.outstanding_balance || 0), 0);
  const totalPurchases = vendors.reduce((sum, v) => sum + (v.total_purchases || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Vendors</h1>
          <p className="text-slate-500 mt-1">Manage supplier accounts & payments</p>
        </div>
        <Button onClick={() => { setEditingVendor(null); setDialogOpen(true); }} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Vendor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Vendors</p>
            <p className="text-2xl font-bold text-slate-900">{vendors.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Purchased</p>
            <p className="text-2xl font-bold text-slate-900">₦{totalPurchases.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Outstanding Balance</p>
            <p className="text-2xl font-bold text-red-600">₦{totalOutstanding.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <Input className="pl-10" placeholder="Search vendors..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {/* Vendor cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredVendors.map(vendor => {
          const vendorPurchases = purchases.filter(p => p.vendor_id === vendor.id);
          return (
            <Card key={vendor.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{vendor.name}</h3>
                      <Badge className={vendor.status === 'active' ? 'bg-green-100 text-green-700 text-xs' : 'bg-slate-100 text-slate-600 text-xs'}>
                        {vendor.status}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingVendor(vendor); setDialogOpen(true); }}>
                    <Edit className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>

                <div className="space-y-1.5 text-xs mb-3">
                  {vendor.contact_person && <p className="text-slate-600">👤 {vendor.contact_person}</p>}
                  {vendor.email && <div className="flex items-center gap-1.5 text-slate-600"><Mail className="w-3 h-3" />{vendor.email}</div>}
                  {vendor.phone && <div className="flex items-center gap-1.5 text-slate-600"><Phone className="w-3 h-3" />{vendor.phone}</div>}
                  {vendor.bank_name && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Banknote className="w-3 h-3 text-green-600" />
                      {vendor.bank_name}{vendor.bank_account_number ? ` — ${vendor.bank_account_number}` : ""}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 py-3 border-t border-b mb-3">
                  <div>
                    <p className="text-xs text-slate-500">Total Supplies</p>
                    <p className="font-bold text-slate-900 text-sm">₦{(vendor.total_purchases || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Outstanding</p>
                    <p className={`font-bold text-sm ${vendor.outstanding_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₦{(vendor.outstanding_balance || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-500 mb-3">{vendorPurchases.length} supply order{vendorPurchases.length !== 1 ? 's' : ''}</div>

                {vendor.outstanding_balance > 0 && (
                  <Button
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700 gap-2 text-xs"
                    onClick={() => setPayDialogVendor(vendor)}
                  >
                    <CreditCard className="w-3 h-3" />
                    Pay ₦{(vendor.outstanding_balance || 0).toLocaleString()}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredVendors.length === 0 && (
        <div className="text-center py-16">
          <Building2 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No vendors found</p>
          <p className="text-slate-400 text-sm mt-1">Add your first vendor to get started</p>
          <Button className="mt-4 gap-2" onClick={() => { setEditingVendor(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4" /> Add Vendor
          </Button>
        </div>
      )}

      <VendorDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        vendor={editingVendor}
        companyId={companyId}
      />

      {payDialogVendor && (
        <PayVendorDialog
          open={!!payDialogVendor}
          onClose={() => setPayDialogVendor(null)}
          vendor={payDialogVendor}
          companyId={companyId}
        />
      )}
    </div>
  );
}