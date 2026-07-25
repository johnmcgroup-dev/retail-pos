import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Sends an expiring-stock summary email to each company's owner/admin.
// Runs on a schedule (no user session). Uses 24h de-dup based on
// Alert records with title "Owner notified: Expiring soon" so it doesn't
// conflict with the generateLowStockAlerts or notifyOwnerLowStock functions.
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
      if (a.product_id && a.created_date && a.title && a.title.includes('Owner notified: Expiring')) {
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

      const productMap = new Map(products.map(p => [p.id, p]));
      const notifiedProducts = new Set();
      const expiringItems = [];

      for (const inv of inventory) {
        if (!inv.expiration_date || !inv.product_id) continue;
        const product = productMap.get(inv.product_id);
        if (!product || (product.status && product.status !== 'active')) continue;

        const key = `${company.id}|${product.id}`;
        if (recentlyNotified.has(key)) continue;
        if (notifiedProducts.has(key)) continue;

        const expiryDate = new Date(inv.expiration_date);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
          notifiedProducts.add(key);
          expiringItems.push({
            product,
            batch: inv.batch_number || "N/A",
            expiryDate: inv.expiration_date,
            daysUntilExpiry,
            quantity: inv.quantity || 0
          });
        }
      }

      if (expiringItems.length === 0) continue;

      expiringItems.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

      const companyUsers = allUsers.filter(u =>
        u.company_id === company.id || u.tenant_id === company.id
      );
      const admin = companyUsers.find(u => u.role === 'admin' || u.role === 'owner') || companyUsers[0];
      if (!admin || !admin.email) {
        log.push(`No registered user found for ${company.name}, skipping`);
        continue;
      }

      const itemRows = expiringItems.map((item, i) => {
        const urgencyColor = item.daysUntilExpiry <= 7 ? '#ef4444' : item.daysUntilExpiry <= 14 ? '#f97316' : '#eab308';
        const urgencyLabel = item.daysUntilExpiry <= 7 ? 'URGENT' : item.daysUntilExpiry <= 14 ? 'Soon' : 'Warning';
        return `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${i + 1}. ${item.product.name}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">${item.batch}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">${new Date(item.expiryDate).toLocaleDateString()}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:${urgencyColor};font-weight:bold;">${item.daysUntilExpiry} day(s)</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:${urgencyColor};font-weight:bold;">${urgencyLabel}</td>
        </tr>`;
      }).join('');

      const emailBody = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
    <div style="background:linear-gradient(135deg,#eab308,#f97316);padding:24px;color:white;">
      <h1 style="margin:0;font-size:20px;">📅 Expiring Stock Alert</h1>
      <p style="margin:4px 0 0;opacity:0.85;font-size:14px;">${company.name} — ${expiringItems.length} item(s) expiring soon</p>
    </div>
    <div style="padding:24px;">
      <p style="color:#475569;font-size:14px;">Hello ${admin.full_name || 'Store Owner'},</p>
      <p style="color:#475569;font-size:14px;">The following items are nearing their expiration date. Please consider discounting them or removing them from shelves before they spoil.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px 12px;text-align:left;color:#64748b;">Product</th>
            <th style="padding:8px 12px;text-align:center;color:#64748b;">Batch</th>
            <th style="padding:8px 12px;text-align:center;color:#64748b;">Expiry Date</th>
            <th style="padding:8px 12px;text-align:center;color:#64748b;">Days Left</th>
            <th style="padding:8px 12px;text-align:center;color:#64748b;">Status</th>
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
          subject: `📅 Expiring Stock Alert — ${expiringItems.length} item(s) expiring soon`,
          body: emailBody,
        });
        emailsSent++;
        log.push(`Sent expiring-stock email to ${admin.email} for ${company.name} (${expiringItems.length} items)`);

        for (const item of expiringItems) {
          await b.entities.Alert.create({
            company_id: company.id,
            type: 'reorder_suggestion',
            severity: item.daysUntilExpiry <= 7 ? 'critical' : 'warning',
            product_id: item.product.id,
            product_name: item.product.name,
            title: 'Owner notified: Expiring soon',
            message: `Owner (${admin.email}) was notified that ${item.product.name} (batch: ${item.batch}) expires in ${item.daysUntilExpiry} day(s) (${new Date(item.expiryDate).toLocaleDateString()}).`,
            days_until_expiry: item.daysUntilExpiry,
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
    console.error('notifyOwnerExpiringStock error:', error);
    return Response.json({ status: 'error', error: error.message, logs: log }, { status: 500 });
  }
});