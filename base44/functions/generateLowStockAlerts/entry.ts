import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Automated low-stock alert generator — runs on a schedule (no user request).
// Scans every company's inventory + products and creates Alert records for
// out-of-stock, low-stock and expiring-soon items, skipping any that already
// have an active (non-dismissed) alert for the same product + type.
Deno.serve(async (req) => {
  const startedAt = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    // Scheduled jobs have no user session — use the service role (admin scope).
    const b = base44.asServiceRole;

    const companies = await b.entities.Company.list();
    let created = 0;
    let scanned = 0;
    const errors = [];

    const now = new Date();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    for (const company of companies) {
      const cid = company.id;
      let inventory = [];
      let products = [];
      try {
        inventory = await b.entities.Inventory.filter({ company_id: cid });
      } catch (e) { errors.push(`inventory:${cid} ${e.message}`); continue; }
      try {
        products = await b.entities.Product.filter({ company_id: cid });
      } catch (e) { errors.push(`products:${cid} ${e.message}`); }

      // Aggregate total available stock per product across batches/warehouses
      const stockByProduct = {};
      let earliestExpiryByProduct = {};
      for (const inv of inventory) {
        const pid = inv.product_id;
        if (!pid) continue;
        stockByProduct[pid] = (stockByProduct[pid] || 0) + (inv.quantity || 0);
        if (inv.expiration_date) {
          if (!earliestExpiryByProduct[pid] ||
              new Date(inv.expiration_date) < new Date(earliestExpiryByProduct[pid])) {
            earliestExpiryByProduct[pid] = inv.expiration_date;
          }
        }
      }

      // Existing active alerts so we don't duplicate
      const existing = await b.entities.Alert.filter({ company_id: cid, is_dismissed: false });
      const keyOf = (a) => `${a.company_id}|${a.product_id || ''}|${a.type}`;
      const existingKeys = new Set((existing || []).map(keyOf));

      for (const product of products) {
        if (product.status && product.status !== 'active') continue;
        scanned++;
        const stock = stockByProduct[product.id] || 0;
        const reorderLevel = product.reorder_level || 10;
        const candidates = [];

        if (stock === 0) {
          candidates.push({
            company_id: cid, type: 'out_of_stock', severity: 'critical',
            product_id: product.id, product_name: product.name,
            title: 'Out of Stock',
            message: `${product.name} is out of stock.`,
            current_stock: 0, reorder_level: reorderLevel,
            suggested_order_quantity: Math.max(reorderLevel * 2, 10),
          });
        } else if (stock <= reorderLevel) {
          candidates.push({
            company_id: cid, type: 'low_stock',
            severity: stock <= reorderLevel / 2 ? 'critical' : 'warning',
            product_id: product.id, product_name: product.name,
            title: 'Low Stock',
            message: `${product.name} has only ${stock} units remaining (reorder level: ${reorderLevel}).`,
            current_stock: stock, reorder_level: reorderLevel,
            suggested_order_quantity: Math.max((reorderLevel * 2) - stock, reorderLevel),
          });
        }

        const exp = earliestExpiryByProduct[product.id];
        if (exp) {
          const daysUntilExpiry = Math.ceil((new Date(exp).getTime() - now.getTime()) / MS_PER_DAY);
          if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
            candidates.push({
              company_id: cid, type: 'expiring_soon',
              severity: daysUntilExpiry <= 7 ? 'critical' : 'warning',
              product_id: product.id, product_name: product.name,
              title: 'Expiring Soon',
              message: `${product.name} expires in ${daysUntilExpiry} day(s) (batch expiring ${exp.slice(0,10)}).`,
              days_until_expiry: daysUntilExpiry,
            });
          }
        }

        for (const alert of candidates) {
          if (existingKeys.has(keyOf(alert))) continue;
          try {
            await b.entities.Alert.create({ ...alert, is_read: false, is_dismissed: false, created_date: now.toISOString() });
            existingKeys.add(keyOf(alert));
            created++;
          } catch (e) {
            errors.push(`alert:${product.id}:${alert.type} ${e.message}`);
          }
        }
      }
    }

    return Response.json({
      status: 'ok',
      companies: companies.length,
      products_scanned: scanned,
      alerts_created: created,
      duration_seconds: (Date.now() - startedAt) / 1000,
      errors,
    });
  } catch (error) {
    console.error('generateLowStockAlerts error:', error);
    return Response.json({ status: 'error', error: error.message }, { status: 500 });
  }
});