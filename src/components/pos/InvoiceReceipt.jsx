import React, { forwardRef } from "react";
import { format } from "date-fns";
import { formatCurrency } from "@/utils";

const InvoiceReceipt = forwardRef(({ sale, company, customer, user }, ref) => {
  const currency = company?.currency || 'USD';

  return (
    <div ref={ref} className="inv-receipt bg-white p-8 max-w-3xl mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        .inv-receipt { font-family: Arial, sans-serif; font-size: 15pt; font-weight: 700; }
        .inv-receipt, .inv-receipt * { font-family: Arial, sans-serif !important; font-weight: 700 !important; font-size: 15pt !important; }
        .inv-receipt .text-xs, .inv-receipt .text-sm { font-size: 15pt !important; }
        /* Item table — explicit borders/alignment so the on-screen view, the
           printed copy and the exported PDF all render identically. */
        .inv-receipt table.inv-items { width: 100%; border-collapse: collapse; }
        .inv-receipt table.inv-items th,
        .inv-receipt table.inv-items td {
          border: 1px solid #334155;
          padding: 6px 8px;
          color: #0f172a;
          vertical-align: top;
        }
        .inv-receipt table.inv-items thead th { background: #e2e8f0; }
        .inv-receipt table.inv-items .c-sn { text-align: center; width: 9%; }
        .inv-receipt table.inv-items .c-item { text-align: left; }
        .inv-receipt table.inv-items .c-qty { text-align: right; width: 12%; }
        .inv-receipt table.inv-items .c-money { text-align: right; width: 19%; }
        @media print {
          .inv-receipt { max-width: none; padding: 4mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: A4; margin: 6mm; }
        }
      `}</style>
      {/* Header */}
      <div className="text-center border-b-2 border-slate-300 pb-6 mb-6">
        {company?.logo_url && (
          <img src={company.logo_url} alt={company.name} className="h-16 mx-auto mb-4" />
        )}
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{company?.name || "My Retailer PoS"}</h1>
        <p className="text-slate-900 font-semibold">{company?.address || ""}</p>
        <p className="text-slate-900 font-semibold">Phone: {company?.phone || "N/A"}</p>
        <p className="text-slate-900 font-semibold">Email: {company?.email || "N/A"}</p>
        {company?.tax_id && <p className="text-slate-900 font-semibold">Tax ID: {company.tax_id}</p>}
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b-2 border-slate-300">
        <div>
          <h3 className="font-bold text-slate-900 mb-2">CUSTOMER DETAILS:</h3>
          <p className="font-semibold text-slate-900">{customer?.name || sale?.customer_name || "Walk-in Customer"}</p>
          {customer?.email && <p className="text-slate-900 font-semibold">{customer.email}</p>}
          {customer?.phone && <p className="text-slate-900 font-semibold">{customer.phone}</p>}
          {customer?.address && <p className="text-slate-900 font-semibold">{customer.address}</p>}
        </div>
        <div className="text-right">
          <p className="text-slate-900 font-semibold">
            <span className="font-bold">Invoice #:</span> {sale?.invoice_number}
          </p>
          <p className="text-slate-900 font-semibold">
            <span className="font-bold">Date:</span> {format(new Date(sale?.sale_date || new Date()), "MMM d, yyyy")}
          </p>
          <p className="text-slate-900 font-semibold">
            <span className="font-bold">Time:</span> {format(new Date(sale?.sale_date || new Date()), "h:mm a")}
          </p>
          <p className="text-slate-900 font-semibold">
            <span className="font-bold">Cashier:</span> {user?.full_name || sale?.cashier?.split('@')[0] || "Staff"}
          </p>
          <p className="text-slate-900 font-semibold">
            <span className="font-bold">Payment:</span> <span className="capitalize">{sale?.payment_method?.replace(/_/g, ' ')}</span>
          </p>
        </div>
      </div>

      {/* Items Table */}
      <table className="inv-items w-full mb-6">
        <thead>
          <tr>
            <th className="c-sn">S/N</th>
            <th className="c-item">Item</th>
            <th className="c-qty">Qty</th>
            <th className="c-money">Unit Price</th>
            <th className="c-money">Total</th>
          </tr>
        </thead>
        <tbody>
          {sale?.items?.map((item, index) => (
            <tr key={index}>
              <td className="c-sn">{index + 1}</td>
              <td className="c-item">{item.product_name}</td>
              <td className="c-qty">{item.quantity}</td>
              <td className="c-money">{formatCurrency(item.unit_price, currency)}</td>
              <td className="c-money">{formatCurrency(item.total, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-64">
          <div className="flex justify-between py-2 border-b border-slate-200">
            <span className="text-slate-900 font-semibold">Subtotal:</span>
            <span className="font-semibold text-slate-900">{formatCurrency(sale?.subtotal || 0, currency)}</span>
          </div>
          {sale?.tax_amount > 0 && (
            <div className="flex justify-between py-2 border-b border-slate-200">
              <span className="text-slate-900 font-semibold">Tax:</span>
              <span className="font-semibold text-slate-900">{formatCurrency(sale?.tax_amount, currency)}</span>
            </div>
          )}
          {sale?.discount_amount > 0 && (
            <div className="flex justify-between py-2 border-b border-slate-200">
              <span className="text-slate-900 font-semibold">Discount:</span>
              <span className="font-semibold text-green-600">-{formatCurrency(sale?.discount_amount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between py-3 border-t-2 border-slate-300">
            <span className="text-xl font-bold text-slate-900">TOTAL:</span>
            <span className="text-xl font-bold text-blue-600">{formatCurrency(sale?.total_amount || 0, currency)}</span>
          </div>
          {sale?.amount_paid > 0 && (
            <>
              <div className="flex justify-between py-2">
                <span className="text-slate-900 font-semibold">Amount Paid:</span>
                <span className="font-semibold text-slate-900">{formatCurrency(sale?.amount_paid, currency)}</span>
              </div>
              {sale?.amount_due > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-slate-900 font-semibold">Balance Due:</span>
                  <span className="font-semibold text-red-600">{formatCurrency(sale?.amount_due, currency)}</span>
                </div>
              )}
              {(sale?.amount_paid - sale?.total_amount) > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-slate-900 font-semibold">Change:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(sale?.amount_paid - sale?.total_amount, currency)}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Loyalty Points */}
      {sale?.loyalty_points_earned > 0 && (
        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-6 text-center">
          <p className="text-purple-900 font-semibold">
            🎉 You earned <span className="text-2xl font-bold">{sale.loyalty_points_earned}</span> loyalty points!
          </p>
          {customer?.loyalty_points && (
            <p className="text-purple-700 text-sm mt-1">
              Total points: {customer.loyalty_points}
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="border-t-2 border-slate-300 pt-6 text-center">
        <p className="text-lg font-semibold text-slate-900 mb-2">
          {company?.goodwill_message || "Thank you for your business!"}
        </p>
        <p className="text-sm text-slate-900 font-semibold">
          We appreciate your patronage and look forward to serving you again.
        </p>
        <div className="mt-4 text-xs text-slate-700 font-medium">
          <p>This is a computer-generated invoice and does not require a signature.</p>
          <p>For inquiries, please contact us at {company?.email || company?.phone}</p>
        </div>
      </div>

    </div>
  );
});

InvoiceReceipt.displayName = "InvoiceReceipt";

export default InvoiceReceipt;