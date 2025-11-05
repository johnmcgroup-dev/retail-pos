import React, { forwardRef } from "react";
import { format } from "date-fns";

const InvoiceReceipt = forwardRef(({ sale, company, customer, user }, ref) => {
  return (
    <div ref={ref} className="bg-white p-8 max-w-3xl mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="text-center border-b-2 border-slate-300 pb-6 mb-6">
        {company?.logo_url && (
          <img src={company.logo_url} alt={company.name} className="h-16 mx-auto mb-4" />
        )}
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{company?.name || "My Retailer PoS"}</h1>
        <p className="text-slate-600">{company?.address || ""}</p>
        <p className="text-slate-600">Phone: {company?.phone || "N/A"}</p>
        <p className="text-slate-600">Email: {company?.email || "N/A"}</p>
        {company?.tax_id && <p className="text-slate-600">Tax ID: {company.tax_id}</p>}
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="font-bold text-slate-900 mb-2">INVOICE TO:</h3>
          <p className="font-semibold text-slate-900">{customer?.name || sale?.customer_name || "Walk-in Customer"}</p>
          {customer?.email && <p className="text-slate-600">{customer.email}</p>}
          {customer?.phone && <p className="text-slate-600">{customer.phone}</p>}
          {customer?.address && <p className="text-slate-600">{customer.address}</p>}
        </div>
        <div className="text-right">
          <p className="text-slate-600">
            <span className="font-bold">Invoice #:</span> {sale?.invoice_number}
          </p>
          <p className="text-slate-600">
            <span className="font-bold">Date:</span> {format(new Date(sale?.sale_date || new Date()), "MMM d, yyyy")}
          </p>
          <p className="text-slate-600">
            <span className="font-bold">Time:</span> {format(new Date(sale?.sale_date || new Date()), "h:mm a")}
          </p>
          <p className="text-slate-600">
            <span className="font-bold">Cashier:</span> {user?.full_name || sale?.cashier?.split('@')[0] || "Staff"}
          </p>
          <p className="text-slate-600">
            <span className="font-bold">Payment:</span> <span className="capitalize">{sale?.payment_method?.replace(/_/g, ' ')}</span>
          </p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-6 border-collapse">
        <thead>
          <tr className="bg-slate-100 border-y-2 border-slate-300">
            <th className="text-left py-3 px-4 font-bold text-slate-900">#</th>
            <th className="text-left py-3 px-4 font-bold text-slate-900">Item</th>
            <th className="text-center py-3 px-4 font-bold text-slate-900">Qty</th>
            <th className="text-right py-3 px-4 font-bold text-slate-900">Unit Price</th>
            <th className="text-right py-3 px-4 font-bold text-slate-900">Total</th>
          </tr>
        </thead>
        <tbody>
          {sale?.items?.map((item, index) => (
            <tr key={index} className="border-b border-slate-200">
              <td className="py-3 px-4 text-slate-700">{index + 1}</td>
              <td className="py-3 px-4 text-slate-900">{item.product_name}</td>
              <td className="py-3 px-4 text-center text-slate-700">{item.quantity}</td>
              <td className="py-3 px-4 text-right text-slate-700">${item.unit_price.toFixed(2)}</td>
              <td className="py-3 px-4 text-right font-semibold text-slate-900">${item.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-64">
          <div className="flex justify-between py-2 border-b border-slate-200">
            <span className="text-slate-600">Subtotal:</span>
            <span className="font-semibold text-slate-900">${sale?.subtotal?.toFixed(2)}</span>
          </div>
          {sale?.tax_amount > 0 && (
            <div className="flex justify-between py-2 border-b border-slate-200">
              <span className="text-slate-600">Tax:</span>
              <span className="font-semibold text-slate-900">${sale?.tax_amount?.toFixed(2)}</span>
            </div>
          )}
          {sale?.discount_amount > 0 && (
            <div className="flex justify-between py-2 border-b border-slate-200">
              <span className="text-slate-600">Discount:</span>
              <span className="font-semibold text-green-600">-${sale?.discount_amount?.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between py-3 border-t-2 border-slate-300">
            <span className="text-xl font-bold text-slate-900">TOTAL:</span>
            <span className="text-xl font-bold text-blue-600">${sale?.total_amount?.toFixed(2)}</span>
          </div>
          {sale?.amount_paid > 0 && (
            <>
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Amount Paid:</span>
                <span className="font-semibold text-slate-900">${sale?.amount_paid?.toFixed(2)}</span>
              </div>
              {sale?.amount_due > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">Balance Due:</span>
                  <span className="font-semibold text-red-600">${sale?.amount_due?.toFixed(2)}</span>
                </div>
              )}
              {(sale?.amount_paid - sale?.total_amount) > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">Change:</span>
                  <span className="font-semibold text-green-600">${(sale?.amount_paid - sale?.total_amount).toFixed(2)}</span>
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
        <p className="text-sm text-slate-600">
          We appreciate your patronage and look forward to serving you again.
        </p>
        <div className="mt-4 text-xs text-slate-500">
          <p>This is a computer-generated invoice and does not require a signature.</p>
          <p>For inquiries, please contact us at {company?.email || company?.phone}</p>
        </div>
      </div>

      {/* Barcode/QR Code placeholder */}
      <div className="mt-6 text-center">
        <svg className="mx-auto" width="200" height="40">
          <rect width="200" height="40" fill="white" />
          {/* Simple barcode representation */}
          {[...Array(20)].map((_, i) => (
            <rect key={i} x={i * 10} y="0" width={Math.random() > 0.5 ? 5 : 3} height="40" fill="black" />
          ))}
        </svg>
        <p className="text-xs text-slate-500 mt-2">{sale?.invoice_number}</p>
      </div>
    </div>
  );
});

InvoiceReceipt.displayName = "InvoiceReceipt";

export default InvoiceReceipt;