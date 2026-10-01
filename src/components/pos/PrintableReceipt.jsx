import React, { forwardRef } from "react";
import { format } from "date-fns";
import { formatCurrency } from "@/utils";
import { Award } from "lucide-react";

const PrintableReceipt = forwardRef(({ sale, company, customer, user }, ref) => {
  const currency = company?.currency || 'NGN';
  const symbol = company?.show_currency_symbol !== false;
  const money = (amt) => symbol ? formatCurrency(amt || 0, currency) : `${(amt || 0).toFixed(2)}`;

  const saleDate = new Date(sale?.sale_date || new Date());
  const change = (sale?.amount_paid || 0) - (sale?.total_amount || 0);

  return (
    <div ref={ref} className="receipt-root" style={{
      fontFamily: "Arial, sans-serif",
      background: "white",
      color: "#0f172a",
      fontWeight: 700,
      maxWidth: "360px",
      margin: "0 auto",
      padding: "16px 14px",
      fontSize: "15pt",
      lineHeight: "1.4",
    }}>
      <style>{`
        .receipt-root { font-family: Arial, sans-serif; font-weight: 700; font-size: 15pt; }
        .receipt-root, .receipt-root * { font-family: Arial, sans-serif !important; font-weight: 700 !important; font-size: 15pt !important; }
        .receipt-root .dashed { border-top: 1px dashed #334155; margin: 6px 0; }
        .receipt-root .row { display: flex; justify-content: space-between; }
        .receipt-root .center { text-align: center; }
        .receipt-root .bold { font-weight: 800; }
        .receipt-root .item-line { margin: 3px 0; }
        @media print {
          .receipt-root { max-width: none; padding: 4px; }
          @page { size: 80mm auto; margin: 4mm; }
        }
      `}</style>

      {/* Header / Logo */}
      <div className="center" style={{ marginBottom: "6px" }}>
        {company?.logo_url && (
          <img src={company.logo_url} alt={company.name} style={{ height: "48px", marginBottom: "4px", objectFit: "contain" }} />
        )}
        <div className="bold" style={{ fontSize: "15px" }}>{company?.name || "My Retailer Pro"}</div>
        {company?.address && <div style={{ fontSize: "11px", color: "#334155" }}>{company.address}</div>}
        {company?.phone && <div style={{ fontSize: "11px", color: "#334155" }}>Tel: {company.phone}</div>}
        {company?.email && <div style={{ fontSize: "11px", color: "#334155" }}>{company.email}</div>}
        {company?.tax_id && <div style={{ fontSize: "11px", color: "#334155" }}>Tax ID: {company.tax_id}</div>}
      </div>

      <div className="dashed" />

      {/* Transaction details */}
      <div className="bold center" style={{ fontSize: "13px", marginBottom: "4px" }}>RECEIPT</div>
      <div className="row"><span>Receipt #:</span><span className="bold">{sale?.invoice_number || "—"}</span></div>
      <div className="row"><span>Date:</span><span>{format(saleDate, "MMM d, yyyy")}</span></div>
      <div className="row"><span>Time:</span><span>{format(saleDate, "h:mm a")}</span></div>
      <div className="row"><span>Cashier:</span><span>{user?.full_name || sale?.cashier?.split("@")[0] || "Staff"}</span></div>
      <div className="row"><span>Payment:</span><span className="bold" style={{ textTransform: "capitalize" }}>{sale?.payment_method?.replace(/_/g, " ") || "cash"}</span></div>
      {customer?.name && (
        <div className="row"><span>Customer:</span><span>{customer.name}</span></div>
      )}

      <div className="dashed" />

      {/* Items */}
      {sale?.items?.map((item, i) => (
        <div key={i} className="item-line">
          <div className="bold" style={{ fontSize: "11px" }}>{item.product_name}</div>
          <div className="row" style={{ fontSize: "11px", color: "#1e293b" }}>
            <span>{item.quantity} x {money(item.unit_price)}</span>
            <span className="bold" style={{ color: "#1e293b" }}>{money(item.total)}</span>
          </div>
        </div>
      ))}

      <div className="dashed" />

      {/* Totals */}
      <div className="row"><span>Subtotal:</span><span>{money(sale?.subtotal)}</span></div>
      {sale?.tax_amount > 0 && (
        <div className="row"><span>Tax:</span><span>{money(sale?.tax_amount)}</span></div>
      )}
      {sale?.discount_amount > 0 && (
        <div className="row"><span>Discount:</span><span style={{ color: "#16a34a" }}>-{money(sale?.discount_amount)}</span></div>
      )}
      <div className="row bold" style={{ fontSize: "14px", borderTop: "2px solid #1e293b", paddingTop: "4px", marginTop: "4px" }}>
        <span>TOTAL:</span><span>{money(sale?.total_amount)}</span>
      </div>
      {sale?.amount_paid > 0 && (
        <>
          <div className="row"><span>Paid:</span><span>{money(sale?.amount_paid)}</span></div>
          {change > 0 && (
            <div className="row bold" style={{ color: "#16a34a" }}><span>Change:</span><span>{money(change)}</span></div>
          )}
        </>
      )}

      {/* Loyalty points summary */}
      {(sale?.loyalty_points_earned > 0 || customer?.loyalty_points > 0) && (
        <>
          <div className="dashed" />
          <div style={{
            background: "#faf5ff",
            border: "1px dashed #c4b5fd",
            borderRadius: "6px",
            padding: "8px",
            textAlign: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", marginBottom: "4px" }}>
              <Award size={14} style={{ color: "#7c3aed" }} />
              <span className="bold" style={{ color: "#6b21a8", fontSize: "11px" }}>LOYALTY POINTS</span>
            </div>
            {sale?.loyalty_points_earned > 0 && (
              <div className="row" style={{ fontSize: "11px" }}>
                <span style={{ color: "#7c3aed" }}>Earned this visit:</span>
                <span className="bold" style={{ color: "#6b21a8" }}>+{sale.loyalty_points_earned}</span>
              </div>
            )}
            {customer?.loyalty_points !== undefined && (
              <div className="row bold" style={{ fontSize: "12px", marginTop: "2px" }}>
                <span style={{ color: "#6b21a8" }}>Total balance:</span>
                <span style={{ color: "#6b21a8" }}>{customer.loyalty_points} pts</span>
              </div>
            )}
          </div>
        </>
      )}

      <div className="dashed" />

      {/* Footer */}
      <div className="center" style={{ marginTop: "4px" }}>
        <div className="bold" style={{ fontSize: "12px" }}>{company?.goodwill_message || "Thank you for your business!"}</div>
      </div>
    </div>
  );
});

PrintableReceipt.displayName = "PrintableReceipt";

export default PrintableReceipt;