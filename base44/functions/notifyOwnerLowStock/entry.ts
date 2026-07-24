import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Sends a low-stock summary email to each company's owner/admin.
// Runs on a schedule (no user session). Uses 24h de-dup based on
// Alert records with title containing "Owner notified" so it doesn't
// conflict with the existing emailLowStockVendors function.
Deno.serve(async (req) => {
  const log = [];
  try {
    const base44 = createClientFromRequest(req);
    const b = base44.asServiceRole;

    const companies = await b.entities.Company.list();
    const allUsers = await b.entities.User.list(null, 200);

    // De-dup: products this function already notified about within 24h
    const existingAlerts = await b.entities.Alert.filter({ type: 'reorder_suggestion' });
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const recentlyNotified = new Set();
    for (const a of existingAlerts) {
      if (a.product_id && a.created_date && a.title && a.title.includes('Owner notified')) {
        if (now - new Date(a.created_date).getTime() < DAY) {
          recentlyNotified.add(`${a.company_id}|${a.product_id}`);
        }
      }
    }

    let emailsSent = 0;
    let productsAlerted = 0;
    const errors = [];

    for (const company of companies) {
      const [inventory, products] = await Promise.all([
        b.entities.Inventory.filter({ company_id: company.id }),
        b.entities.Product.filter({ company_id: company.id })
      ]);

      // Aggregate stock per product across batches/warehouses
      const stockByProduct = {};
      for (const inv of inventory) {
        if (!inv.product_id) continue;
        stockByProduct[inv.product_id] = (stockByProduct[inv.product_id] || 0) + (inv.quantity || 0);
      }

      // Find low-stock items not recently notified
      const lowStockItems = [];
      for (const product of products) {
        if (product.status && product.status !== 'active') continue;
        const key = `${company.id}|${product.id}`;
        if (recentlyNotified.has(key)) continue;

        const stock = stockByProduct[product.id] || 0;
        const reorderLevel = product.reorder_level || 10;

        if (stock <= reorderLevel) {
          lowStockItems.push({
            product,
            stock,
            reorderLevel,
            suggested: Math.max((reorderLevel * 2) - stock, reorderLevel)
          });
        }
      }

      if (lowStockItems.length === 0) continue;

      // Find the company owner/admin
      const companyUsers = allUsers.filter(u =>
        u.company_id === company.id || u.tenant_id === company.id
      );
      const admin = companyUsers.find(u => u.role === 'admin' || u.role === 'owner') || companyUsers[0];
      if (!admin || !admin.email) {
        log.push(`No registered user found for ${company.name}, skipping`);
        continue;
      }

      // Build HTML email
      const itemRows = lowStockItems.map((item, i) =>
        `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${i + 1}. ${item.product.name}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:${item.stock === 0 ? '#ef4444' : '#f97316'};font-weight:bold;">${item.stock}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">${item.reorderLevel}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:bold;">${item.suggested}</td>
        </tr>`
      ).join('');

      const emailBody = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
    <div style="background:linear-gradient(135deg,#ef4444,#f97316);padding:24px;color:white;">
      <h1 style="margin:0;font-size:20px;">⚠️ Low Stock Alert</h1>
      <p style="margin:4px 0 0;opacity:0.85;font-size:14px;">${company.name} — ${lowStockItems.length} item(s) need reordering</p>
    </div>
    <div style="padding:24px;">
      <p style="color:#475569;font-size:14px;">Hello ${admin.full_name || 'Store Owner'},</p>
      <p style="color:#475569;font-size:14px;">The following items have dropped below their reorder threshold. Please restock to avoid running out of stock.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px 12px;text-align:left;color:#64748b;">Product</th>
            <th style="padding:8px 12px;text-align:center;color:#64748b;">Current</th>
            <th style="padding:8px 12px;text-align:center;color:#64748b;">Threshold</th>
            <th style="padding:8px 12px;text-align:right;color:#64748b;">Suggested Qty</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>
    <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#94a3b8;">
      Automated alert from My Retailer Pro · ${new Date().toISOString()}
    </div>
  </div>
</body></html>`;

      try {
        await b.integrations.Core.SendEmail({
          to: admin.email,
          subject: `⚠️ Low Stock Alert — ${lowStockItems.length} item(s) need reordering`,
          body: emailBody,
        });
        emailsSent++;
        log.push(`Sent low-stock email to ${admin.email} for ${company.name} (${lowStockItems.length} items)`);

        // Record alerts to prevent re-sending within 24h
        for (const item of lowStockItems) {
          await b.entities.Alert.create({
            company_id: company.id,
            type: 'reorder_suggestion',
            severity: 'critical',
            product_id: item.product.id,
            product_name: item.product.name,
            title: 'Owner notified: Low stock',
            message: `Owner (${admin.email}) was notified that ${item.product.name} is low on stock (${item.stock} remaining, threshold: ${item.reorderLevel}).`,
            current_stock: item.stock,
            reorder_level: item.reorderLevel,
            suggested_order_quantity: item.suggested,
            is_read: false,
            is_dismissed: false,
            created_date: new Date().toISOString()
          });
          productsAlerted++;
        }
      } catch (e) {
        errors.push(`email to ${admin.email}: ${e.message}`);
        log.push(`SEND ERROR: ${e.message}`);
      }
    }

    return Response.json({
      status: 'ok',
      emails_sent: emailsSent,
      products_alerted: productsAlerted,
      errors,
      logs: log
    });
  } catch (error) {
    console.error('notifyOwnerLowStock error:', error);
    return Response.json({ status: 'error', error: error.message, logs: log }, { status: 500 });
  }
});