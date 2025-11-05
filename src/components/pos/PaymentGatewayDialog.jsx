
import React, { useState, useRef, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  CreditCard, 
  DollarSign, 
  Smartphone, 
  Building2, 
  WifiOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Printer // Added Printer icon
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useReactToPrint } from "react-to-print"; // Added useReactToPrint
import InvoiceReceipt from "./InvoiceReceipt"; // Added InvoiceReceipt component
import { base44 } from "@/api/base44Client"; // Added base44 client
import { useQuery } from "@tanstack/react-query"; // Added useQuery

const STRIPE_ICON = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
  </svg>
);

const PAYPAL_ICON = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
  </svg>
);

export default function PaymentGatewayDialog({ 
  open, 
  onClose, 
  total, 
  onComplete, 
  isProcessing, 
  isOffline 
}) {
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [gateway, setGateway] = useState("stripe");
  const [amountReceived, setAmountReceived] = useState("");
  const [processing, setProcessing] = useState(false);
  
  // Card details
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");

  // New state for invoice and sale data
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

  const handlePrint = useReactToPrint({
    content: () => invoiceRef.current,
  });

  const change = amountReceived ? parseFloat(amountReceived) - total : 0;

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
    }
    return v;
  };

  const handleCardPayment = async () => {
    setProcessing(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const paymentData = {
      method: gateway === "stripe" ? "stripe" : "paypal",
      gateway: gateway,
      amount: total,
      card_last_four: cardNumber.slice(-4),
      card_brand: getCardBrand(cardNumber),
      transaction_id: `${gateway.toUpperCase()}_${Date.now()}`,
      transaction_reference: `TXN-${Date.now()}`,
      payment_status: "completed",
      // Assuming customer_id is passed or derived elsewhere, for demo we'll omit or hardcode
      // For a real app, you'd associate this payment with a customer and order
      customer_id: "demo-customer-123" // Placeholder
    };
    
    try {
      await onComplete(paymentData);
      setCompletedSale(paymentData);
      setShowInvoice(true);
    } catch (error) {
      console.error("Payment failed:", error);
      // Here you might set an error state to display to the user
    } finally {
      setProcessing(false);
    }
  };

  const handleCashPayment = () => {
    const paymentData = {
      method: "cash",
      gateway: "manual",
      amount: parseFloat(amountReceived) || total,
      change: change > 0 ? change : 0,
      payment_status: "completed",
      customer_id: "demo-customer-123" // Placeholder
    };
    try {
      onComplete(paymentData);
      setCompletedSale(paymentData);
      setShowInvoice(true);
    } catch (error) {
      console.error("Cash payment failed:", error);
    }
  };

  const handleOtherPayment = (methodType) => {
    const paymentData = { 
      method: methodType, 
      gateway: "manual",
      payment_status: "pending", // Bank transfer might be pending
      customer_id: "demo-customer-123" // Placeholder
    };
    try {
      onComplete(paymentData);
      setCompletedSale(paymentData);
      setShowInvoice(true);
    } catch (error) {
      console.error("Other payment failed:", error);
    }
  }

  const getCardBrand = (number) => {
    const cleaned = number.replace(/\s/g, '');
    if (/^4/.test(cleaned)) return 'Visa';
    if (/^5[1-5]/.test(cleaned)) return 'Mastercard';
    if (/^3[47]/.test(cleaned)) return 'American Express';
    if (/^6(?:011|5)/.test(cleaned)) return 'Discover';
    return 'Unknown';
  };

  const isCardValid = cardNumber.replace(/\s/g, '').length >= 13 && 
                      cardExpiry.length === 5 && 
                      cardCvc.length >= 3 &&
                      cardName.length > 0;

  const handleCloseInvoice = () => {
    setShowInvoice(false);
    setCompletedSale(null);
    onClose(); // Close the main dialog after invoice is closed
  };

  return (
    <>
      <Dialog open={open && !showInvoice} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center justify-between">
              Complete Payment
              {isOffline && (
                <Badge variant="destructive" className="ml-2">
                  <WifiOff className="w-3 h-3 mr-1" />
                  Offline Mode
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {isOffline && (
              <Alert variant="warning" className="bg-yellow-50 border-yellow-300">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  Card payments unavailable offline. Use cash or save for later sync.
                </AlertDescription>
              </Alert>
            )}

            {/* Total Amount */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <p className="text-sm text-slate-600 mb-1">Total Amount</p>
              <p className="text-3xl font-bold text-slate-900">${total.toFixed(2)}</p>
            </div>

            <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="card" disabled={isOffline}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Card
                </TabsTrigger>
                <TabsTrigger value="cash">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Cash
                </TabsTrigger>
                <TabsTrigger value="other">
                  <Building2 className="w-4 h-4 mr-2" />
                  Other
                </TabsTrigger>
              </TabsList>

              {/* Card Payment */}
              <TabsContent value="card" className="space-y-4 mt-4">
                {/* Gateway Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={gateway === "stripe" ? "default" : "outline"}
                    className={`h-20 flex flex-col gap-2 ${
                      gateway === "stripe" ? "bg-blue-600 hover:bg-blue-700" : ""
                    }`}
                    onClick={() => setGateway("stripe")}
                  >
                    <STRIPE_ICON />
                    <span className="text-sm">Stripe</span>
                  </Button>
                  <Button
                    type="button"
                    variant={gateway === "paypal" ? "default" : "outline"}
                    className={`h-20 flex flex-col gap-2 ${
                      gateway === "paypal" ? "bg-blue-600 hover:bg-blue-700" : ""
                    }`}
                    onClick={() => setGateway("paypal")}
                  >
                    <PAYPAL_ICON />
                    <span className="text-sm">PayPal</span>
                  </Button>
                </div>

                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-xs">
                    <strong>Demo Mode:</strong> This is a simulation. To enable real payments, go to Settings → Backend Functions and add Stripe/PayPal integration.
                  </AlertDescription>
                </Alert>

                {/* Card Details Form */}
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="card-name">Cardholder Name</Label>
                    <Input
                      id="card-name"
                      placeholder="John Doe"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="card-number">Card Number</Label>
                    <Input
                      id="card-number"
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      maxLength={19}
                      className="mt-1"
                    />
                    {cardNumber.length > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        {getCardBrand(cardNumber)}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="card-expiry">Expiry Date</Label>
                      <Input
                        id="card-expiry"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        maxLength={5}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="card-cvc">CVC</Label>
                      <Input
                        id="card-cvc"
                        placeholder="123"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        maxLength={4}
                        type="password"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Your payment information is encrypted and secure</span>
                </div>
              </TabsContent>

              {/* Cash Payment */}
              <TabsContent value="cash" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="amount-received" className="text-sm font-semibold">
                    Amount Received
                  </Label>
                  <Input
                    id="amount-received"
                    type="number"
                    step="0.01"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder="Enter amount"
                    className="mt-2 h-12 text-lg"
                    autoFocus
                  />
                  {change > 0 && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        Change: <span className="font-bold text-lg">${change.toFixed(2)}</span>
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Other Payment Methods */}
              <TabsContent value="other" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col gap-2"
                    onClick={() => handleOtherPayment("bank_transfer")}
                  >
                    <Building2 className="w-6 h-6" />
                    <span className="text-sm">Bank Transfer</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col gap-2"
                    onClick={() => handleOtherPayment("mobile_money")}
                  >
                    <Smartphone className="w-6 h-6" />
                    <span className="text-sm">Mobile Money</span>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose} disabled={processing || isProcessing}>
              Cancel
            </Button>
            {paymentMethod === "card" ? (
              <Button
                onClick={handleCardPayment}
                disabled={processing || isProcessing || !isCardValid || isOffline}
                className="bg-green-600 hover:bg-green-700"
              >
                {(processing || isProcessing) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Pay ${total.toFixed(2)}
                  </>
                )}
              </Button>
            ) : paymentMethod === "cash" ? (
              <Button
                onClick={handleCashPayment}
                disabled={processing || isProcessing || !amountReceived || change < 0}
                className="bg-green-600 hover:bg-green-700"
              >
                Complete Cash Payment
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={showInvoice} onOpenChange={handleCloseInvoice}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Generated</DialogTitle>
          </DialogHeader>
          <InvoiceReceipt 
            ref={invoiceRef}
            sale={completedSale}
            company={companies[0]} // Assuming the first company is the active one
            customer={customers.find(c => c.id === completedSale?.customer_id)}
            user={user}
          />
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
