import React, { useState, useEffect } from "react";
import { Mic, X, Volume2, Sparkles } from "lucide-react";
import { useVoiceAssistant } from "@/hooks/useVoiceAssistant";

const wordToNum = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20, fifty: 50, hundred: 100,
};

function findProduct(query, products) {
  if (!query) return null;
  const q = query.toLowerCase().trim();
  let match = products.find(p => p.name?.toLowerCase() === q);
  if (match) return match;
  match = products.find(p => p.name?.toLowerCase().startsWith(q));
  if (match) return match;
  match = products.find(p => p.name?.toLowerCase().includes(q));
  if (match) return match;
  match = products.find(p => p.sku?.toLowerCase() === q);
  if (match) return match;
  match = products.find(p => (p.barcodes || []).some(b => b.toLowerCase() === q));
  if (match) return match;
  match = products.find(p => p.sku?.toLowerCase().includes(q));
  return match || null;
}

function parseQuantity(text) {
  const words = text.split(/\s+/);
  const first = words[0];
  if (/^\d+$/.test(first)) return { quantity: parseInt(first), rest: words.slice(1).join(" ") };
  if (wordToNum[first]) return { quantity: wordToNum[first], rest: words.slice(1).join(" ") };
  const m = text.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty)/);
  if (m) {
    const num = /^\d+$/.test(m[0]) ? parseInt(m[0]) : wordToNum[m[0]];
    if (num) {
      const rest = text.replace(m[0], "").replace(/^(add|plus|put|of|some)\s*/gi, "").trim();
      return { quantity: num, rest };
    }
  }
  return { quantity: 1, rest: text.replace(/^(add|plus|put)\s*/gi, "").trim() };
}

export default function VoiceOrderingButton({
  products = [],
  cart = [],
  onAddToCart,
  onRemoveFromCart,
  onClearCart,
  onCheckout,
  totals,
  currency,
  formatCurrency,
  isProcessing = false,
  saleCompleted = null,
}) {
  const [isActive, setIsActive] = useState(false);
  const [lastFeedback, setLastFeedback] = useState("");

  const speak = (text) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.1;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  };

  // Speak sale completion confirmation when POS signals a completed sale
  useEffect(() => {
    if (saleCompleted) {
      setLastFeedback(saleCompleted);
      speak(saleCompleted);
    }
  }, [saleCompleted]);

  const handleCommand = (transcript) => {
    const text = transcript.toLowerCase().trim();

    // Combined one-step checkout: "checkout with cash", "pay with card", etc.
    const combinedMatch = text.match(/^(checkout|check out|pay)\s+(?:with\s+)?(cash|card|mobile|bank|transfer)/);
    if (combinedMatch) {
      if (cart.length === 0) { speak("Cart is empty"); return; }
      const method = combinedMatch[2];
      if (method.includes("mobile")) {
        const msg = `Processing mobile money payment of ${formatCurrency(totals.total, currency)}`;
        setLastFeedback(msg); speak(msg);
        onCheckout({ payment_method: "mobile_money", amount_paid: totals.total }); return;
      }
      if (method.includes("bank") || method.includes("transfer")) {
        const msg = `Processing bank transfer of ${formatCurrency(totals.total, currency)}`;
        setLastFeedback(msg); speak(msg);
        onCheckout({ payment_method: "bank_transfer", amount_paid: totals.total }); return;
      }
      const msg = `Processing ${method} payment of ${formatCurrency(totals.total, currency)}`;
      setLastFeedback(msg); speak(msg);
      onCheckout({ payment_method: method, amount_paid: totals.total }); return;
    }

    // Help
    if (text === "help" || text.includes("what can you do") || text.includes("commands")) {
      const msg = "You can say: add a product name, remove an item, clear cart, checkout with cash, checkout with card, what's the total, or what's in my cart";
      setLastFeedback(msg); speak(msg); return;
    }

    // What's the total
    if ((text.includes("total") || text.includes("how much")) && !text.includes("add")) {
      const msg = `Total is ${formatCurrency(totals.total, currency)} for ${cart.length} ${cart.length === 1 ? "item" : "items"}`;
      setLastFeedback(msg); speak(msg); return;
    }

    // What's in cart
    if ((text.includes("what") && text.includes("cart")) || text.includes("list cart") || text.includes("cart items")) {
      let msg;
      if (cart.length === 0) { msg = "Your cart is empty"; }
      else { msg = "Your cart has: " + cart.map(i => `${i.quantity} ${i.product_name}`).join(", "); }
      setLastFeedback(msg); speak(msg); return;
    }

    // Checkout
    if (text.includes("checkout") || text.includes("check out")) {
      if (cart.length === 0) { const m = "Cart is empty"; setLastFeedback(m); speak(m); return; }
      const msg = `Total is ${formatCurrency(totals.total, currency)}. Say cash, card, mobile money, or bank transfer to complete.`;
      setLastFeedback(msg); speak(msg); return;
    }

    // Payment methods — direct checkout
    if (text === "cash" || text.includes("pay cash") || text.includes("cash payment")) {
      if (cart.length === 0) { speak("Cart is empty"); return; }
      const msg = `Processing cash payment of ${formatCurrency(totals.total, currency)}`;
      setLastFeedback(msg); speak(msg);
      onCheckout({ payment_method: "cash", amount_paid: totals.total }); return;
    }
    if (text === "card" || text.includes("pay card") || text.includes("card payment")) {
      if (cart.length === 0) { speak("Cart is empty"); return; }
      const msg = `Processing card payment of ${formatCurrency(totals.total, currency)}`;
      setLastFeedback(msg); speak(msg);
      onCheckout({ payment_method: "card", amount_paid: totals.total }); return;
    }
    if (text.includes("mobile money") || text.includes("mobile")) {
      if (cart.length === 0) { speak("Cart is empty"); return; }
      const msg = `Processing mobile money payment of ${formatCurrency(totals.total, currency)}`;
      setLastFeedback(msg); speak(msg);
      onCheckout({ payment_method: "mobile_money", amount_paid: totals.total }); return;
    }
    if (text.includes("bank transfer") || (text.includes("transfer") && !text.includes("add"))) {
      if (cart.length === 0) { speak("Cart is empty"); return; }
      const msg = `Processing bank transfer of ${formatCurrency(totals.total, currency)}`;
      setLastFeedback(msg); speak(msg);
      onCheckout({ payment_method: "bank_transfer", amount_paid: totals.total }); return;
    }

    // Complete / confirm (defaults to cash)
    if (text.includes("complete") || text.includes("confirm") || text.includes("pay now") || text.includes("finish") || text === "pay") {
      if (cart.length === 0) { speak("Cart is empty"); return; }
      const msg = `Completing sale for ${formatCurrency(totals.total, currency)}`;
      setLastFeedback(msg); speak(msg);
      onCheckout({ payment_method: "cash", amount_paid: totals.total }); return;
    }

    // Clear cart
    if ((text.includes("clear") && (text.includes("cart") || text.includes("all"))) || text.includes("empty") || text === "clear") {
      onClearCart();
      const msg = "Cart cleared"; setLastFeedback(msg); speak(msg); return;
    }

    // Remove item
    if (text.includes("remove") || text.includes("delete")) {
      const productName = text.replace(/remove|delete|from cart|item|the|a|an/gi, "").trim();
      const product = findProduct(productName, products);
      if (product) {
        const inCart = cart.find(i => i.product_id === product.id);
        if (inCart) {
          onRemoveFromCart(product.id);
          const msg = `Removed ${product.name}`; setLastFeedback(msg); speak(msg);
        } else {
          const msg = `${product.name} is not in your cart`; setLastFeedback(msg); speak(msg);
        }
      } else {
        const msg = `Could not find ${productName}`; setLastFeedback(msg); speak(msg);
      }
      return;
    }

    // Add item (default)
    const { quantity, rest: productName } = parseQuantity(text);
    const product = findProduct(productName, products);

    if (product) {
      const result = onAddToCart(product, quantity);
      if (result?.success === false && result?.reason === "stock") {
        const msg = `Not enough stock for ${product.name}`; setLastFeedback(msg); speak(msg);
      } else {
        const newTotal = totals.total + product.selling_price * quantity;
        const msg = `Added ${quantity > 1 ? quantity + " " : ""}${product.name}${quantity > 1 ? "s" : ""}. Total is ${formatCurrency(newTotal, currency)}`;
        setLastFeedback(msg); speak(msg);
      }
    } else {
      const msg = `Could not find a product called "${productName}"`;
      setLastFeedback(msg); speak(msg);
    }
  };

  const { isListening, isSupported, transcript, start, stop } = useVoiceAssistant(handleCommand);

  const toggleVoice = () => {
    if (isActive) {
      stop();
      setIsActive(false);
      setLastFeedback("");
      speak("Voice ordering off");
    } else {
      const ok = start();
      if (ok) {
        setIsActive(true);
        setLastFeedback("");
        speak("Voice ordering on. Say a product name to add it to your cart.");
      } else {
        setLastFeedback("Voice recognition not supported on this device");
      }
    }
  };

  if (!isSupported) return null;

  return (
    <>
      {isActive && (
        <div className="fixed bottom-36 right-3 left-3 md:left-auto md:w-96 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden select-none">
          <div className={`px-4 py-2.5 flex items-center justify-between ${isListening ? "bg-red-50" : "bg-slate-50"}`}>
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isListening ? "bg-red-500 animate-pulse" : "bg-slate-300"}`} />
              <span className="text-sm font-semibold text-slate-700">
                {isListening ? "Listening…" : "Voice Ordering"}
              </span>
            </div>
            <button onClick={() => { stop(); setIsActive(false); }} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-2 max-h-44 overflow-y-auto">
            {transcript && (
              <div className="text-sm text-slate-500 italic">"{transcript}"</div>
            )}
            {lastFeedback && (
              <div className="text-sm font-medium text-blue-600 flex items-start gap-1.5">
                <Volume2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{lastFeedback}</span>
              </div>
            )}
            {!transcript && !lastFeedback && (
              <div className="text-xs text-slate-400 space-y-1">
                <p className="font-medium text-slate-500 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Try saying:</p>
                <p>• "Add Coca Cola" / "Add 3 Pepsi"</p>
                <p>• "Remove Sprite"</p>
                <p>• "What's the total?"</p>
                <p>• "Checkout with cash" / "Pay with card"</p>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={toggleVoice}
        disabled={isProcessing}
        className={`fixed bottom-20 right-3 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
          isActive
            ? "bg-gradient-to-br from-red-500 to-pink-600 text-white scale-110"
            : "bg-gradient-to-br from-blue-600 to-indigo-600 text-white hover:scale-105 active:scale-95"
        } ${isProcessing ? "opacity-50" : ""}`}
        title="Voice ordering"
      >
        <Mic className="w-6 h-6" />
        {isActive && (
          <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping" />
        )}
      </button>
    </>
  );
}