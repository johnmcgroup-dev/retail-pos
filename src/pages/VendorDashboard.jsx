import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Building2, Wallet, CreditCard, Landmark, ArrowLeft, Phone, Mail, Plus } from "lucide-react";
import RecordVendorPaymentDialog from "@/components/vendors/RecordVendorPaymentDialog";

const naira = (n) => "₦" + (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function VendorDashboard() {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [preselectedVendorId, setPreselectedVendorId] = useState(null);
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });
  const { data: vendors = [], isLoading: loadingVendors } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => base44.entities.Vendor.list("-created_date"),
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => base44.entities.Purchase.list("-purchase_date"),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-payment_date"),
  });

  const activeVendors = vendors.filter(v => v.status === "active" || !v.status);
  const vendorById = new Map(vendors.map(v => [v.id, v]));

  const totalOutstanding = activeVendors.reduce((s, v) => s + (v.outstanding_balance || 0), 0);
  const totalPurchasesValue = activeVendors.reduce((s, v) => s + (v.total_purchases || 0), 0);

  // Payments made to vendors (reference_type purchase / payer_type vendor)
  const vendorPayments = payments
    .filter(p => p.reference_type === "purchase" || p.payer_type === "vendor")
    .sort((a, b) => new Date(b.payment_date || 0) - new Date(a.payment_date || 0));

  const totalPaid = vendorPayments
    .filter(p => p.payment_status === "completed")
    .reduce((s, p) => s + (p.amount || 0), 0);

  const vendorName = (p) =>
    p.payer_name ||
    (p.payer_id && vendorById.get(p.payer_id)?.name) ||
    "—";

  if (loadingVendors) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/Vendors"><Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button></Link>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Vendor Dashboard</h1>
          </div>
          <p className="text-slate-500 mt-1 ml-10 md:ml-12">Outstanding balances and payment history per vendor</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowPaymentDialog(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Record Payment
          </Button>
          <Link to="/Stocking">
            <Button variant="outline" className="gap-2"><Building2 className="w-4 h-4" /> New Supply Order</Button>
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-slate-500">Active Vendors</p><p className="text-xl font-bold text-slate-900">{activeVendors.length}</p></div>
          <Building2 className="w-8 h-8 text-blue-500" />
        </CardContent></Card>
        <Card className="bg-red-50 border-red-200"><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-red-700">Total Outstanding</p><p className="text-xl font-bold text-red-900">{naira(totalOutstanding)}</p></div>
          <Wallet className="w-8 h-8 text-red-500" />
        </CardContent></Card>
        <Card className="bg-green-50 border-green-200"><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-green-700">Total Paid</p><p className="text-xl font-bold text-green-900">{naira(totalPaid)}</p></div>
          <CreditCard className="w-8 h-8 text-green-500" />
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-slate-500">Total Purchases</p><p className="text-xl font-bold text-slate-900">{naira(totalPurchasesValue)}</p></div>
          <Landmark className="w-8 h-8 text-indigo-500" />
        </CardContent></Card>
      </div>

      {/* Active vendors table */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-600" /> Active Vendors</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3 font-semibold text-slate-700">Vendor</th>
                  <th className="text-left p-3 font-semibold text-slate-700">Contact</th>
                  <th className="text-right p-3 font-semibold text-slate-700">Total Purchases</th>
                  <th className="text-right p-3 font-semibold text-slate-700">Outstanding Balance</th>
                  <th className="text-left p-3 font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activeVendors.map(v => {
                  const paidToVendor = vendorPayments
                    .filter(p => (p.payer_id === v.id || p.payer_name === v.name) && p.payment_status === "completed")
                    .reduce((s, p) => s + (p.amount || 0), 0);
                  const orderCount = purchases.filter(p => p.vendor_id === v.id).length;
                  return (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-medium text-slate-900">{v.name}</div>
                        {v.contact_person && <div className="text-xs text-slate-500">{v.contact_person}</div>}
                        <div className="text-xs text-slate-400">{orderCount} order(s) · paid {naira(paidToVendor)}</div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-0.5">
                          {v.phone && <div className="flex items-center gap-1 text-slate-600"><Phone className="w-3 h-3" />{v.phone}</div>}
                          {v.email && <div className="flex items-center gap-1 text-slate-600"><Mail className="w-3 h-3" />{v.email}</div>}
                          {!v.phone && !v.email && <span className="text-slate-400">—</span>}
                        </div>
                      </td>
                      <td className="p-3 text-right font-medium text-slate-900">{naira(v.total_purchases || 0)}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`font-bold ${(v.outstanding_balance || 0) > 0 ? "text-red-600" : "text-green-600"}`}>{naira(v.outstanding_balance || 0)}</span>
                          {(v.outstanding_balance || 0) > 0 && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setPreselectedVendorId(v.id); setShowPaymentDialog(true); }}>
                              Pay
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className={v.status === "active" || !v.status ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}>
                          {v.status || "active"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
                {activeVendors.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-500">No active vendors</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-green-600" /> Payment History to Vendors</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3 font-semibold text-slate-700">Date</th>
                  <th className="text-left p-3 font-semibold text-slate-700">Vendor</th>
                  <th className="text-left p-3 font-semibold text-slate-700">Method</th>
                  <th className="text-left p-3 font-semibold text-slate-700">Reference</th>
                  <th className="text-right p-3 font-semibold text-slate-700">Amount</th>
                  <th className="text-left p-3 font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {vendorPayments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-600">{p.payment_date ? format(new Date(p.payment_date), "MMM d, yyyy") : "—"}</td>
                    <td className="p-3 font-medium text-slate-900">{vendorName(p)}</td>
                    <td className="p-3 text-slate-600 capitalize">{(p.payment_method || "—").replace("_", " ")}</td>
                    <td className="p-3 text-slate-600">{p.transaction_reference || p.reference_id || "—"}</td>
                    <td className="p-3 text-right font-medium text-slate-900">{naira(p.amount || 0)}</td>
                    <td className="p-3">
                      <Badge className={
                        p.payment_status === "completed" ? "bg-green-100 text-green-700" :
                        p.payment_status === "pending" ? "bg-yellow-100 text-yellow-700" :
                        p.payment_status === "refunded" ? "bg-purple-100 text-purple-700" :
                        "bg-red-100 text-red-700"
                      }>{p.payment_status || "—"}</Badge>
                    </td>
                  </tr>
                ))}
                {vendorPayments.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-500">No payments recorded to vendors yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <RecordVendorPaymentDialog
        open={showPaymentDialog}
        onClose={() => { setShowPaymentDialog(false); setPreselectedVendorId(null); }}
        vendors={vendors}
        company={companies[0]}
        preselectedVendorId={preselectedVendorId}
      />
    </div>
  );
}