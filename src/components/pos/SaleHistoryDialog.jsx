import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, Printer, Receipt as ReceiptIcon, X, ShoppingBag, RotateCcw, CheckCircle2, Loader2, Mail } from "lucide-react";
import DrawerSelect from "@/components/shared/DrawerSelect";
import { format } from "date-fns";
import PrintableReceipt from "@/components/pos/PrintableReceipt";
import EmailReceiptForm from "@/components/pos/EmailReceiptForm";
import { formatCurrency } from "@/utils";
import { logActivity } from "@/lib/logActivity";
import useInvoiceCustomer from "@/components/pos/useInvoiceCustomer";

export default function SaleHistoryDialog({ open, onClose, companyId, company, user, initialSale }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);
  const [returnMode, setReturnMode] = useState(false);
  const [returnSelections, setReturnSelections] = useState({});
  const [refundMethod, setRefundMethod] = useState("cash");
  const [returnReason, setReturnReason] = useState("");
  const [returnSuccess, setReturnSuccess] = useState(null);
  const [showEmail, setShowEmail] = useState(false);
  const receiptRef = React.useRef(null);
  const { customer: receiptCustomer, isLoading: isLoadingReceiptCustomer } = useInvoiceCustomer(selectedSale, open);

  React.useEffect(() => {
    if (open && initialSale) setSelectedSale(initialSale);
    if (!open) {
      setSelectedSale(null);
      setReturnMode(false);
      setReturnSelections({});
      setReturnSuccess(null);
      setReturnReason("");
      setShowEmail(false);
    }
  }, [open, initialSale]);

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["staff_sale_history", companyId],
    queryFn: () => base44.entities.Sale.filter({ company_id: companyId }, "-sale_date", 50),
    enabled: open && !!companyId && !initialSale,
  });

  const currency = company?.currency || "NGN";
  const fmt = (n) => formatCurrency(n || 0, currency);

  const filteredSales = sales.filter(s =>
    s.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = () => {
    if (isLoadingReceiptCustomer) return;
    const receiptHtml = receiptRef.current?.outerHTML;
    if (!receiptHtml) return;
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-9999px";
    iframe.style.top = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <html><head><title>Receipt ${selectedSale?.invoice_number || ""}</title>
      <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; font-weight: 700; }
        @media print { @page { size: 80mm auto; margin: 4mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>${receiptHtml}</body></html>
    `);
    doc.close();
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 500);
  };

  const closeAll = () => {
    setSelectedSale(null);
    setReturnMode(false);
    setReturnSelections({});
    setReturnSuccess(null);
    onClose();
  };

  const updateReturnQty = (productId, qty, maxQty) => {
    const clamped = Math.max(0, Math.min(qty, maxQty));
    setReturnSelections(prev => ({ ...prev, [productId]: clamped }));
  };

  const selectedReturnItems = selectedSale?.items?.filter(item => returnSelections[item.product_id] > 0) || [];
  const refundTotal = selectedReturnItems.reduce((sum, item) => {
    return sum + (item.unit_price * returnSelections[item.product_id]);
  }, 0);

  const processReturnMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();
      const returnNumber = `RET-${Date.now()}`;

      const returnItems = selectedReturnItems.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: returnSelections[item.product_id],
        unit_price: item.unit_price,
        total: item.unit_price * returnSelections[item.product_id],
      }));

      const returnRecord = await base44.entities.Return.create({
        company_id: companyId,
        return_number: returnNumber,
        original_sale_id: selectedSale.id,
        invoice_number: selectedSale.invoice_number,
        customer_id: selectedSale.customer_id || null,
        customer_name: selectedSale.customer_name || "Walk-in Customer",
        items: returnItems,
        refund_amount: refundTotal,
        refund_method: refundMethod,
        return_reason: returnReason || "Customer return",
        processed_by: currentUser.email,
        return_date: new Date().toISOString(),
        status: "completed",
      });

      // Restock inventory
      for (const item of returnItems) {
        const invRecords = await base44.entities.Inventory.filter({
          product_id: item.product_id,
          company_id: companyId,
        });
        if (invRecords.length > 0) {
          const inv = invRecords[0];
          await base44.entities.Inventory.update(inv.id, {
            quantity: (inv.quantity || 0) + item.quantity,
            last_updated: new Date().toISOString(),
          });
        } else {
          await base44.entities.Inventory.create({
            company_id: companyId,
            product_id: item.product_id,
            quantity: item.quantity,
            last_updated: new Date().toISOString(),
          });
        }
      }

      // Reverse loyalty points
      if (selectedSale.customer_id && selectedSale.loyalty_points_earned > 0) {
        const ratio = refundTotal / (selectedSale.total_amount || 1);
        const pointsToReverse = Math.round(selectedSale.loyalty_points_earned * ratio);
        if (pointsToReverse > 0) {
          const customers = await base44.entities.Customer.filter({ id: selectedSale.customer_id });
          const customer = customers[0];
          if (customer && customer.loyalty_points > 0) {
            const newBalance = Math.max(0, customer.loyalty_points - pointsToReverse);
            await base44.entities.Customer.update(customer.id, { loyalty_points: newBalance });
          }
        }
      }

      // Audit: log the return and the inventory restock it triggered
      await logActivity({
        companyId,
        entityType: "return",
        action: "create",
        entityId: returnRecord.id,
        referenceNumber: returnNumber,
        amount: refundTotal,
        performedBy: currentUser.email,
        performedByName: currentUser.full_name,
        description: `Return ${returnNumber} for invoice ${selectedSale.invoice_number} — ${returnItems.length} item(s), ${refundMethod}`,
        details: { original_sale_id: selectedSale.id, invoice_number: selectedSale.invoice_number, refund_method: refundMethod, reason: returnReason || "Customer return" },
      });
      await logActivity({
        companyId,
        entityType: "inventory",
        action: "restock",
        referenceNumber: `Return ${returnNumber}`,
        performedBy: currentUser.email,
        performedByName: currentUser.full_name,
        description: `Restock from return ${returnNumber}: ${returnItems.map(i => `${i.product_name} +${i.quantity}`).join(", ")}`,
        details: { return_id: returnRecord.id, items: returnItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })) },
      });

      return returnRecord;
    },
    onSuccess: (returnRecord) => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      setReturnSuccess(returnRecord);
      setReturnMode(false);
      setReturnSelections({});
      setReturnReason("");
    },
  });

  const startReturnMode = () => {
    const initial = {};
    selectedSale?.items?.forEach(item => { initial[item.product_id] = 0; });
    setReturnSelections(initial);
    setReturnSuccess(null);
    setReturnMode(true);
  };

  return (
    <>
      {/* Sale list dialog */}
      <Dialog open={open && !selectedSale} onOpenChange={(o) => !o && closeAll()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" /> Sale History
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col gap-3">
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search by invoice # or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2">
              {isLoading ? (
                <div className="text-center py-8 text-slate-400 text-sm">Loading sales...</div>
              ) : filteredSales.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <ReceiptIcon className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                  <p className="text-sm">No sales found</p>
                </div>
              ) : (
                filteredSales.map(sale => (
                  <button
                    key={sale.id}
                    onClick={() => setSelectedSale(sale)}
                    className="w-full text-left bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg p-3 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-blue-600 text-sm">{sale.invoice_number}</span>
                        <Badge variant="outline" className="capitalize text-[10px] py-0">
                          {sale.payment_method?.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        {sale.customer_name} · {format(new Date(sale.sale_date), "MMM d, yyyy h:mm a")}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {sale.items?.length || 0} items · {sale.cashier?.split("@")[0] || "staff"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-900 text-sm">{fmt(sale.total_amount)}</p>
                      <Badge
                        className={
                          sale.payment_status === "paid"
                            ? "bg-green-100 text-green-700 text-[10px] py-0"
                            : sale.payment_status === "partial"
                            ? "bg-yellow-100 text-yellow-700 text-[10px] py-0"
                            : "bg-red-100 text-red-700 text-[10px] py-0"
                        }
                      >
                        {sale.payment_status}
                      </Badge>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Return success dialog */}
      <Dialog open={!!returnSuccess} onOpenChange={(o) => { if (!o) { setReturnSuccess(null); setReturnMode(false); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" /> Return Processed
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Return <span className="font-semibold text-slate-900">{returnSuccess?.return_number}</span> completed.
              Refund of <span className="font-semibold">{fmt(returnSuccess?.refund_amount)}</span> via {returnSuccess?.refund_method}.
            </p>
            <p className="text-xs text-slate-500">Items have been restocked to inventory.</p>
            <Button className="w-full" onClick={() => { setReturnSuccess(null); setReturnMode(false); }}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt view / return dialog */}
      <Dialog open={!!selectedSale && !returnSuccess} onOpenChange={(o) => !o && setSelectedSale(null)}>
        <DialogContent className={selectedSale && returnMode ? "max-w-lg max-h-[90vh] overflow-y-auto" : "max-w-sm max-h-[90vh] overflow-y-auto"}>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {returnMode ? <RotateCcw className="w-5 h-5" /> : <ReceiptIcon className="w-5 h-5" />}
                {returnMode ? "Process Return" : "Receipt"}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedSale(null); setReturnMode(false); }}>
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedSale && !returnMode && (
            <div className="flex flex-col gap-3">
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <PrintableReceipt ref={receiptRef} sale={selectedSale} company={company} customer={receiptCustomer} user={user} />
                {isLoadingReceiptCustomer && <p role="status">Loading customer details…</p>}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" onClick={handlePrint} disabled={isLoadingReceiptCustomer} className="gap-2">
                  <Printer className="w-4 h-4" /> Print
                </Button>
                <Button variant="outline" onClick={() => setShowEmail(v => !v)} className="gap-2">
                  <Mail className="w-4 h-4" /> Email
                </Button>
                <Button onClick={startReturnMode} className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <RotateCcw className="w-4 h-4" /> Return
                </Button>
              </div>
              {showEmail && <EmailReceiptForm sale={selectedSale} company={company} onClose={() => setShowEmail(false)} />}
            </div>
          )}

          {selectedSale && returnMode && (
            <div className="space-y-4 pt-2">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Invoice</p>
                <p className="font-bold text-slate-900">{selectedSale.invoice_number}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedSale.customer_name} · {format(new Date(selectedSale.sale_date), "MMM d, yyyy")}
                </p>
              </div>

              <p className="text-sm text-slate-600">Select the items to return and enter quantities. Inventory will be restocked automatically.</p>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left p-2.5 font-semibold text-slate-700">Product</th>
                      <th className="text-center p-2.5 font-semibold text-slate-700">Sold</th>
                      <th className="text-center p-2.5 font-semibold text-slate-700">Return</th>
                      <th className="text-right p-2.5 font-semibold text-slate-700">Refund</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items?.map((item, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-2.5">{item.product_name}</td>
                        <td className="p-2.5 text-center text-slate-600">{item.quantity}</td>
                        <td className="p-2.5 text-center">
                          <Input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={returnSelections[item.product_id] || 0}
                            onChange={(e) => updateReturnQty(item.product_id, parseInt(e.target.value) || 0, item.quantity)}
                            className="w-16 h-8 mx-auto text-center"
                          />
                        </td>
                        <td className="p-2.5 text-right font-semibold text-sm">
                          {fmt(item.unit_price * (returnSelections[item.product_id] || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Refund Method</Label>
                  <DrawerSelect
                    value={refundMethod}
                    onValueChange={setRefundMethod}
                    options={[
                      { value: "cash", label: "Cash" },
                      { value: "card", label: "Card" },
                      { value: "bank_transfer", label: "Bank Transfer" },
                      { value: "mobile_money", label: "Mobile Money" },
                      { value: "store_credit", label: "Store Credit" },
                    ]}
                    placeholder="Select method"
                    label="Refund Method"
                    triggerClassName="w-full h-9 border border-input bg-background rounded-md px-3 text-sm font-medium"
                  />
                </div>
                <div>
                  <Label className="text-xs">Reason</Label>
                  <Textarea
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="Reason..."
                    rows={1}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">Total Refund</p>
                <span className="text-xl font-bold text-blue-900">{fmt(refundTotal)}</span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setReturnMode(false)}>Cancel</Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => processReturnMutation.mutate()}
                  disabled={selectedReturnItems.length === 0 || processReturnMutation.isPending}
                >
                  {processReturnMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : <><RotateCcw className="w-4 h-4 mr-2" /> Process Return</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}