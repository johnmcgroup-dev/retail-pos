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

export default function PaymentGatewayDialog({ open, onClose, total, onComplete, isProcessing, isOffline }) {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isProcessingPayment, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [amountReceived, setAmountReceived] = useState(total);
  const [completedSale, setCompletedSale] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
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
    const printWindow = window.open('', '', 'height=800,width=800');
    printWindow.document.write('<html><head><title>Invoice</title>');
    printWindow.document.write('<style>body{font-family:Arial,sans-serif;padding:20px;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(invoiceRef.current.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handlePayment = async () => {
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

      await onComplete(paymentData);
      setCompletedSale(paymentData);
      setShowInvoice(true);
    } catch (error) {
      setError(error.message || "Payment failed");
      setIsProcessing(false);
    }
  };

  const handleCloseInvoice = () => {
    setShowInvoice(false);
    setCompletedSale(null);
    onClose();
  };

  const change = paymentMethod === "cash" && amountReceived > total ? amountReceived - total : 0;

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
              <p className="text-3xl font-bold text-blue-900">${total.toFixed(2)}</p>
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
              </div>
            </div>

            {paymentMethod === "cash" && (
              <div>
                <Label>Amount Received</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                  className="text-lg font-semibold"
                />
                {change > 0 && (
                  <p className="mt-2 text-green-600 font-semibold">
                    Change: ${change.toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isProcessingPayment}>
              Cancel
            </Button>
            <Button onClick={handlePayment} disabled={isProcessingPayment}>
              {isProcessingPayment ? "Processing..." : "Complete Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={showInvoice} onOpenChange={handleCloseInvoice}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Generated</DialogTitle>
          </DialogHeader>
          <div ref={invoiceRef}>
            <InvoiceReceipt 
              sale={completedSale}
              company={companies[0]}
              customer={customers.find(c => c.id === completedSale?.customer_id)}
              user={user}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseInvoice}>
              Close
            </Button>
            <Button onClick={handlePrint} className="bg-blue-600">
              <Printer className="w-4 h-4 mr-2" />
              Print Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}