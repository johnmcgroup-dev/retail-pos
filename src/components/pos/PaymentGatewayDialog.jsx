import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Smartphone, DollarSign, AlertCircle, Printer } from "lucide-react";
import InvoiceReceipt from "./InvoiceReceipt";
import PrintableReceipt from "./PrintableReceipt";
import { formatCurrency, getCurrencySymbol } from "@/utils";

export default function PaymentGatewayDialog({ open, onClose, total, onComplete, isProcessing, isOffline, currency = 'USD' }) {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isProcessingPayment, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [amountReceived, setAmountReceived] = useState(total);
  const [completedSale, setCompletedSale] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [receiptView, setReceiptView] = useState("thermal");
  const [paystackReference, setPaystackReference] = useState(null);
  const [paystackStep, setPaystackStep] = useState(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const invoiceRef = useRef();

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    setAmountReceived(total);
  }, [total]);

  const handlePrint = () => {
    // Use a hidden inline iframe instead of window.open() to avoid WebView sandbox blockages
    const existingIframe = document.getElementById('print-iframe');
    if (existingIframe) existingIframe.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = receiptView === 'thermal' ? '380px' : '800px';
    iframe.style.height = '600px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();

    if (receiptView === 'thermal') {
      doc.write('<html><head><title>Receipt</title>');
      doc.write('<style>');
      doc.write('@page { margin: 6mm; }');
      doc.write('body { font-family: "Courier New", monospace; margin: 0; padding: 8px; color: #1e293b; }');
      doc.write('.dashed { border-top: 1px dashed #cbd5e1; margin: 8px 0; }');
      doc.write('.row { display: flex; justify-content: space-between; }');
      doc.write('.center { text-align: center; }');
      doc.write('.bold { font-weight: 700; }');
      doc.write('.item-line { margin: 3px 0; }');
      doc.write('</style>');
      doc.write('</head><body>');
      doc.write(invoiceRef.current.innerHTML);
      doc.write('</body></html>');
      doc.close();
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => iframe.remove(), 500);
    } else {
      doc.write('<html><head><title>Invoice</title>');
      doc.write('<script src="https://cdn.tailwindcss.com"><\/script>');
      doc.write('<style>@page { margin: 12mm; } body { margin: 0; padding: 16px; }</style>');
      doc.write('</head><body>');
      doc.write(invoiceRef.current.innerHTML);
      doc.write('</body></html>');
      doc.close();
      iframe.contentWindow.focus();
      setTimeout(() => {
        iframe.contentWindow.print();
        setTimeout(() => iframe.remove(), 500);
      }, 1000);
    }
  };

  const handlePaystackPayment = async () => {
    setError("");

    // Step 2: Verify payment after customer has paid
    if (paystackStep === "link_ready") {
      setIsProcessing(true);
      try {
        const response = await base44.functions.invoke("verifyPaystackTransaction", {
          reference: paystackReference,
        });
        const result = response.data;
        if (result.status === "success") {
          const paymentData = {
            payment_method: "paystack",
            amount_paid: total,
            amount_due: 0,
            payment_data: {
              method: "paystack",
              gateway: "paystack",
              transaction_id: String(result.transaction_id || paystackReference),
              transaction_reference: paystackReference,
              payment_status: "completed",
            },
          };
          const sale = await onComplete(paymentData);
          setCompletedSale(sale || paymentData);
          setShowInvoice(true);
        } else {
          setError("Payment not yet confirmed. Please complete payment on the Paystack page, then click Verify again.");
          setIsProcessing(false);
        }
      } catch (err) {
        setError(err.message || "Verification failed. Please try again.");
        setIsProcessing(false);
      }
      return;
    }

    // Step 1: Initialize payment and open Paystack checkout
    if (!customerEmail) {
      setError("Customer email is required for Paystack payment");
      return;
    }
    setIsProcessing(true);
    try {
      const response = await base44.functions.invoke("initializePosPayment", {
        amount: total,
        email: customerEmail,
        currency: currency,
      });
      if (response.data?.authorization_url) {
        window.open(response.data.authorization_url, "_blank");
        setPaystackReference(response.data.reference);
        setPaystackStep("link_ready");
        setIsProcessing(false);
      } else {
        setError("Failed to generate Paystack payment link");
        setIsProcessing(false);
      }
    } catch (err) {
      setError(err.message || "Failed to initialize Paystack payment");
      setIsProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (paymentMethod === "paystack") {
      return handlePaystackPayment();
    }

    setError("");
    setIsProcessing(true);

    // Validate amount for cash payments
    if (paymentMethod === "cash" && amountReceived < total) {
      setError("Amount received cannot be less than total");
      setIsProcessing(false);
      return;
    }

    try {
      const paymentData = {
        payment_method: paymentMethod,
        amount_paid: paymentMethod === "cash" ? amountReceived : total,
        amount_due: paymentMethod === "cash" ? 0 : 0,
      };

      // Simulate payment processing for digital methods
      if (paymentMethod !== "cash") {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const sale = await onComplete(paymentData);
      setCompletedSale(sale || paymentData);
      setShowInvoice(true);
    } catch (error) {
      setError(error.message || "Payment failed");
      setIsProcessing(false);
    }
  };

  // Auto-print thermal receipt immediately when a sale completes
  useEffect(() => {
    if (showInvoice && completedSale) {
      const timer = setTimeout(() => handlePrint(), 600);
      return () => clearTimeout(timer);
    }
  }, [showInvoice, completedSale]);

  const handleCloseInvoice = () => {
    setShowInvoice(false);
    setCompletedSale(null);
    onClose();
  };

  const change = paymentMethod === "cash" && amountReceived > total ? amountReceived - total : 0;

  // Resolve the receipt's company from the completed sale's own company_id (not companies[0],
  // which for a multi-tenant admin can be a different tenant). Falls back to the signed-in user's company.
  const receiptCompany =
    (completedSale?.company_id && companies.find(c => c.id === completedSale.company_id)) ||
    (user?.company_id && companies.find(c => c.id === user.company_id)) ||
    (user?.tenant_id && companies.find(c => c.id === user.tenant_id)) ||
    companies[0];

  return (
    <>
      <Dialog open={open && !showInvoice} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment</DialogTitle>
          </DialogHeader>

          {isOffline && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                You're offline. Only cash payments are available. Transaction will sync when online.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <p className="text-sm text-blue-700 font-medium">Total Amount</p>
              <p className="text-3xl font-bold text-blue-900">{formatCurrency(total, currency)}</p>
            </div>

            <div>
              <Label className="mb-3 block">Select Payment Method</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    paymentMethod === "cash"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="font-semibold text-slate-900">Cash</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  disabled={isOffline}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    paymentMethod === "card"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  } ${isOffline ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <p className="font-semibold text-slate-900">Card</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("mobile_money")}
                  disabled={isOffline}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    paymentMethod === "mobile_money"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  } ${isOffline ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <Smartphone className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <p className="font-semibold text-slate-900">Mobile Money</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("bank_transfer")}
                  disabled={isOffline}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    paymentMethod === "bank_transfer"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  } ${isOffline ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-indigo-600" />
                  <p className="font-semibold text-slate-900">Bank Transfer</p>
                </button>

                <button
                  type="button"
                  onClick={() => { setPaymentMethod("paystack"); setPaystackStep(null); setPaystackReference(null); setError(""); }}
                  disabled={isOffline}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    paymentMethod === "paystack"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  } ${isOffline ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="font-semibold text-slate-900">Paystack</p>
                </button>
              </div>
            </div>

            {paymentMethod === "cash" && (
              <div>
                <Label>Amount Received ({getCurrencySymbol(currency)})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                  className="text-lg font-semibold"
                />
                {change > 0 && (
                  <p className="mt-2 text-green-600 font-semibold">
                    Change: {formatCurrency(change, currency)}
                  </p>
                )}
              </div>
            )}

            {paymentMethod === "paystack" && (
              <div className="space-y-3">
                {paystackStep !== "link_ready" ? (
                  <div>
                    <Label>Customer Email (for Paystack receipt)</Label>
                    <Input
                      type="email"
                      placeholder="customer@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      A Paystack payment link will be generated for ₦{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}.
                      The customer pays on the Paystack page, then you verify the payment here.
                    </p>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-semibold text-blue-900">Payment link opened!</p>
                    <p className="text-xs text-blue-700">
                      Reference: <span className="font-mono">{paystackReference}</span>
                    </p>
                    <p className="text-xs text-blue-700">
                      Ask the customer to complete payment on the Paystack page, then click "Verify Payment" below.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isProcessingPayment}>
              Cancel
            </Button>
            <Button onClick={handlePayment} disabled={isProcessingPayment}>
              {isProcessingPayment ? "Processing..." :
                paymentMethod === "paystack" && paystackStep === "link_ready" ? "Verify Payment" :
                paymentMethod === "paystack" ? "Generate Payment Link" :
                "Complete Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog — rendered in a portal at z-[100] so it never underlaps POS */}
      <Dialog open={showInvoice} onOpenChange={handleCloseInvoice}>
        <DialogContent className="fixed inset-4 md:inset-8 max-w-none w-auto h-auto max-h-none overflow-y-auto z-[100] rounded-xl">
          <DialogHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <DialogTitle>Sale Completed</DialogTitle>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setReceiptView("invoice")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${receiptView === "invoice" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                >
                  Standard Invoice
                </button>
                <button
                  onClick={() => setReceiptView("thermal")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${receiptView === "thermal" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                >
                  Thermal Receipt
                </button>
              </div>
            </div>
          </DialogHeader>
          <div ref={invoiceRef} className="overflow-y-auto max-h-[70vh]">
            {receiptView === "thermal" ? (
              <PrintableReceipt
                sale={completedSale}
                company={receiptCompany}
                customer={customers.find(c => c.id === completedSale?.customer_id)}
                user={user}
              />
            ) : (
              <InvoiceReceipt
                sale={completedSale}
                company={receiptCompany}
                customer={customers.find(c => c.id === completedSale?.customer_id)}
                user={user}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseInvoice}>
              Close
            </Button>
            <Button onClick={handlePrint} className="bg-blue-600">
              <Printer className="w-4 h-4 mr-2" />
              {receiptView === "thermal" ? "Print Receipt" : "Print Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}