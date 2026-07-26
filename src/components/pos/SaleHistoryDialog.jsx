import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Printer, Receipt as ReceiptIcon, X, ShoppingBag } from "lucide-react";
import { format } from "date-fns";
import PrintableReceipt from "@/components/pos/PrintableReceipt";
import { formatCurrency } from "@/utils";

export default function SaleHistoryDialog({ open, onClose, companyId, company, user, initialSale }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);
  const receiptRef = React.useRef(null);

  // If opened with a specific sale (from Sales page), show receipt directly
  React.useEffect(() => {
    if (open && initialSale) setSelectedSale(initialSale);
    if (!open) setSelectedSale(null);
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
        body { margin: 0; padding: 0; font-family: 'Courier New', monospace; }
        @media print { @page { margin: 6mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>${receiptHtml}</body></html>
    `);
    doc.close();
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 500);
  };

  const closeAll = () => {
    setSelectedSale(null);
    onClose();
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

      {/* Receipt view dialog */}
      <Dialog open={!!selectedSale} onOpenChange={(o) => !o && setSelectedSale(null)}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><ReceiptIcon className="w-5 h-5" /> Receipt</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedSale(null)}>
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <PrintableReceipt ref={receiptRef} sale={selectedSale} company={company} user={user} />
            </div>
            <Button onClick={handlePrint} className="w-full gap-2">
              <Printer className="w-4 h-4" /> Reprint Receipt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}