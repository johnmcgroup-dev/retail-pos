import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/utils";
import { format } from "date-fns";

export default function EmailReceiptForm({ sale, company, onClose }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadEmail() {
      if (sale?.customer_id) {
        try {
          const customers = await base44.entities.Customer.filter({ id: sale.customer_id });
          if (!cancelled && customers[0]?.email) setEmail(customers[0].email);
        } catch { /* ignore */ }
      }
    }
    loadEmail();
    return () => { cancelled = true; };
  }, [sale?.customer_id]);

  const cur = company?.currency || "NGN";
  const showSymbol = company?.show_currency_symbol !== false;
  const fmt = (n) => formatCurrency(n || 0, cur, showSymbol);

  const buildBody = () => {
    const itemsHtml = (sale.items || []).map((it) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${it.product_name}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${it.quantity}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${fmt(it.unit_price)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${fmt(it.total)}</td>
      </tr>`).join("");
    return `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1e293b">
        <h2 style="margin:0">${company?.name || "Store"}</h2>
        <p style="margin:2px 0;color:#64748b;font-size:13px">${company?.address || ""}${company?.phone ? " &middot; " + company.phone : ""}</p>
        <hr style="border:0;border-top:1px dashed #cbd5e1;margin:10px 0">
        <p style="font-size:13px;margin:2px 0"><b>Invoice:</b> ${sale.invoice_number}</p>
        <p style="font-size:13px;margin:2px 0"><b>Date:</b> ${format(new Date(sale.sale_date), "MMM d, yyyy h:mm a")}</p>
        <p style="font-size:13px;margin:2px 0"><b>Customer:</b> ${sale.customer_name || "Walk-in Customer"}</p>
        <table style="width:100%;border-collapse:collapse;margin-top:10px;font-size:13px">
          <thead><tr style="background:#f1f5f9">
            <th style="padding:6px 8px;text-align:left">Item</th>
            <th style="padding:6px 8px;text-align:center">Qty</th>
            <th style="padding:6px 8px;text-align:right">Price</th>
            <th style="padding:6px 8px;text-align:right">Total</th>
          </tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <table style="width:100%;font-size:13px;margin-top:8px">
          <tr><td style="text-align:right;padding:2px 0">Subtotal:</td><td style="text-align:right;padding:2px 0 2px 8px">${fmt(sale.subtotal)}</td></tr>
          ${sale.discount_amount ? `<tr><td style="text-align:right;padding:2px 0">Discount:</td><td style="text-align:right;padding:2px 0 2px 8px">-${fmt(sale.discount_amount)}</td></tr>` : ""}
          ${sale.tax_amount ? `<tr><td style="text-align:right;padding:2px 0">Tax:</td><td style="text-align:right;padding:2px 0 2px 8px">${fmt(sale.tax_amount)}</td></tr>` : ""}
          <tr><td style="text-align:right;font-weight:bold;padding:6px 0;font-size:15px">Total:</td><td style="text-align:right;font-weight:bold;padding:6px 0 6px 8px;font-size:15px">${fmt(sale.total_amount)}</td></tr>
        </table>
        <p style="text-align:center;color:#64748b;font-size:12px;margin-top:14px">${company?.goodwill_message || "Thank you for your business!"}</p>
      </div>`;
  };

  const handleSend = async () => {
    if (!email) { setError("Enter an email address"); return; }
    setStatus("sending"); setError("");
    try {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `Receipt ${sale.invoice_number} — ${company?.name || "Store"}`,
        body: buildBody(),
      });
      setStatus("sent");
    } catch (e) {
      setStatus("error");
      setError(e?.message || "Failed to send. Emailing non-registered customers may require a paid plan with a custom domain.");
    }
  };

  if (status === "sent") {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
        <CheckCircle2 className="w-4 h-4" /> Receipt emailed to {email}.
        <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={onClose}>Close</Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@email.com" className="h-9 text-sm" />
        <Button onClick={handleSend} disabled={status === "sending"} className="gap-2 bg-blue-600 hover:bg-blue-700 shrink-0">
          {status === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          {status === "sending" ? "Sending..." : "Send"}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600 flex items-start gap-1"><AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />{error}</p>}
      <p className="text-[11px] text-slate-400">Reaching non-registered customer emails requires a paid plan with a custom domain.</p>
    </div>
  );
}