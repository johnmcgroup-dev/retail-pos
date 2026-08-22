/**
 * Retail POS assistant knowledge base, page-context map, and quick-start suggestions.
 * Used by the chatbot to give context-aware, app-specific help.
 */

export const SUGGESTIONS = [
  "How do I add a product?",
  "How to process a sale?",
  "How to manage inventory?",
  "How to add a customer?",
  "How to generate reports?",
];

export const KNOWLEDGE = `My Retailer Pro is a multi-tenant Retail POS by JmtSolution.
Key pages and how to use them:

- Dashboard: business overview — today/month revenue, low-stock alerts, recent sales, quick links.
- POS (Point of Sale): the checkout screen. Add products to the cart by tapping tiles or scanning barcodes, pick a customer, apply discounts/loyalty points, choose payment method (cash, card, bank transfer, mobile money, credit), then "Complete Sale". F9 completes a sale, F2 searches, F4 clears the cart, Esc closes dialogs.
- Products: create/edit products with name, SKU, barcodes, cost/selling/wholesale price, tax rate, unit, reorder level, image. Use the AI image generator for product photos. Export to CSV/XLSX. Bulk-import via the Bulk Import page.
- Categories: group products; assign color and icon. Used to filter in POS and Products.
- Inventory: see stock per warehouse/branch, adjust stock (with a reason: stock count, damage, expired, theft, return, supplier delivery, correction). Every adjustment is logged.
- Branches (Warehouses): create company branches/warehouses with address and manager. Stock is tracked per branch.
- Stocking: receive new stock into a warehouse (stock-in). Increases inventory quantity and creates an adjustment log.
- Stocking Report: history of stock-in entries.
- Sales: invoice history; open a sale to view/print/email the receipt or process a return.
- Returns: process customer returns by searching an invoice, selecting items, calculating the refund, and restocking inventory. Loyalty points are reversed automatically.
- Online Store: set up a public storefront with branding, currency, shipping, payment gateways.
- Online Orders: view and fulfil orders placed on the online store.
- E-commerce Sync: connect Shopify/WooCommerce/etc. and sync products, orders, inventory.
- Purchases: create purchase orders from vendors; record goods received and payments.
- Customers: add customers (retail/wholesale/VIP), track loyalty points, total purchases, outstanding balance, credit limit.
- CRM: build customer segments, run marketing campaigns, send communications.
- Vendors: manage suppliers with payment terms and bank details.
- Vendor Dashboard: view total purchases, outstanding balances, and record vendor payments.
- Expenses: record expenses with category and date; monthly expense report.
- Reports: revenue, profit/loss, sales performance, staff performance, inventory value.
- My Loyalty / Loyalty Management: customer loyalty points and rewards program.
- Staff Sales / Sales Report: per-staff performance and revenue breakdown.
- Inventory Dashboard: stock value and quantity charts per warehouse.
- Tenant Management (admin): manage all companies/tenants and their subscription status.
- User Management: invite users to a tenant and assign roles (owner, admin, manager, supervisor, cashier, user). Invited users auto-join the tenant on first login — no onboarding.
- Bulk Import: import products from .xlsx/.csv files.
- Activity Log: audit trail of sales, returns, inventory and invoice changes.
- Settings (Company Setup): edit company name, currency, logo, address, subscription plan, payment gateway.

Subscription: 14-day free trial, then $6/month, $56/year, or $360 one-time. Expired trial/subscription blocks checkout until renewed.

General tips: currency is set per company in Settings; the active company is derived from your user's assigned company_id; staff ("user" role) see a simplified POS-focused shell.`;

export function getPageContext(pathname) {
  const map = {
    '/Dashboard': 'the Dashboard (business overview: KPIs, recent sales, low-stock alerts)',
    '/POS': 'the POS / Point of Sale checkout page (cart, barcode scan, payments)',
    '/Products': 'the Products page (add/edit products, prices, SKUs, barcodes, images)',
    '/Categories': 'the Categories page',
    '/Inventory': 'the Inventory page (stock levels per warehouse, stock adjustments)',
    '/Warehouses': 'the Branches / Warehouses page',
    '/Stocking': 'the Stocking page (receive new stock / stock-in)',
    '/StockingReport': 'the Stocking Report page',
    '/Sales': 'the Sales / invoice history page',
    '/Returns': 'the Returns page (process returns and refunds)',
    '/OnlineStore': 'the Online Store setup page',
    '/OnlineOrders': 'the Online Orders page',
    '/EcommerceSync': 'the E-commerce Sync page',
    '/Purchases': 'the Purchases / purchase orders page',
    '/Customers': 'the Customers page',
    '/CRM': 'the CRM page (segments, campaigns, communication)',
    '/Vendors': 'the Vendors / suppliers page',
    '/VendorDashboard': 'the Vendor Dashboard (payables and vendor payments)',
    '/Expenses': 'the Expenses page',
    '/Reports': 'the Reports page',
    '/MyLoyalty': 'My Loyalty page (customer loyalty)',
    '/LoyaltyManagement': 'Loyalty Management (admin)',
    '/StaffSales': 'the Staff Sales / performance page',
    '/SalesReport': 'the Sales Report page',
    '/InventoryDashboard': 'the Inventory Dashboard page',
    '/TenantManagement': 'Tenant Management (admin)',
    '/UserManagement': 'User Management (invite users, assign roles)',
    '/BulkImport': 'the Bulk Import page (import products via xlsx/csv)',
    '/ActivityLog': 'the Activity Log / audit page',
    '/Settings': 'Company Setup / Settings page',
  };
  for (const key of Object.keys(map)) {
    if (pathname === key || pathname.startsWith(key + '/')) return map[key];
  }
  return 'the app';
}