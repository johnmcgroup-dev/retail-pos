import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// --- helpers ---
function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function encodeHeader(s) {
  return /[^\x00-\x7F]/.test(s) ? `=?utf-8?B?${toBase64(s)}?=` : s;
}
function buildRawEmail(to, subject, bodyText) {
  const lines = [
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    toBase64(bodyText)
  ];
  const raw = lines.join('\r\n');
  // base64url
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

Deno.serve(async (req) => {
  const log = [];
  try {
    const base44 = createClientFromRequest(req);

    const [inventory, products, vendors, purchases, existingAlerts] = await Promise.all([
      base44.asServiceRole.entities.Inventory.list(),
      base44.asServiceRole.entities.Product.list(),
      base44.asServiceRole.entities.Vendor.list(),
      base44.asServiceRole.entities.Purchase.list(),
      base44.asServiceRole.entities.Alert.filter({ type: 'reorder_suggestion' })
    ]);

    log.push(`loaded ${inventory.length} inventory, ${products.length} products, ${vendors.length} vendors, ${purchases.length} purchases, ${existingAlerts.length} prior reorder alerts`);

    // De-dup: products already notified within last 24h
    const now = Date.now();
    const recentlyNotified = new Set();
    for (const a of existingAlerts) {
      if (a.product_id && a.created_date) {
        const age = now - new Date(a.created_date).getTime();
        if (age < 24 * 60 * 60 * 1000) recentlyNotified.add(a.product_id);
      }
    }

    const productById = new Map(products.map(p => [p.id, p]));
    const vendorById = new Map(vendors.filter(v => v.email).map(v => [v.id, v]));
    const companyById = new Map();

    // Newest-first purchases to find the supplying vendor per product
    const sortedPurchases = [...purchases].sort(
      (a, b) => new Date(b.purchase_date || b.created_date || 0) - new Date(a.purchase_date || a.created_date || 0)
    );

    function findVendorForProduct(productId) {
      for (const p of sortedPurchases) {
        const items = p.items || [];
        if (items.some(it => it.product_id === productId) && p.vendor_id && vendorById.has(p.vendor_id)) {
          return vendorById.get(p.vendor_id);
        }
      }
      return null;
    }

    // Group low-stock products by the vendor that supplies them, per company
    // keyed => { vendorId: { vendor, companyId, items: [{product, inv, reorder, suggested}] } }
    const groups = {};
    for (const inv of inventory) {
      const product = productById.get(inv.product_id);
      if (!product) continue;
      const reorder = (product.reorder_level == null ? 10 : product.reorder_level);
      if (reorder <= 0 ? inv.quantity > 0 : inv.quantity > reorder) continue; // above safety stock
      if (recentlyNotified.has(product.id)) continue;

      const vendor = findVendorForProduct(inv.product_id);
      if (!vendor) continue;

      const suggested = Math.max((reorder * 2) - inv.quantity, reorder);
      const key = `${inv.company_id}__${vendor.id}`;
      if (!groups[key]) {
        groups[key] = { vendor, companyId: inv.company_id, items: [] };
      }
      groups[key].items.push({ product, inv, reorder, suggested });
    }

    // Gmail connection (shared — builder's account sends the email)
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    let emailsSent = 0;
    let productsAlerted = 0;
    const errors = [];

    for (const key of Object.keys(groups)) {
      const g = groups[key];
      // company name for signature/subject
      let companyName = g.companyId;
      try {
        const company = await base44.asServiceRole.entities.Company.get(g.companyId);
        if (company?.name) companyName = company.name;
      } catch (e) {
        console.error('company lookup failed', e);
      }

      const lines = [
        `Hello ${g.vendor.name},`,
        '',
        `This is an automated low-stock notification from ${companyName}.`,
        'The following products you supply to us have fallen below our safety stock levels and need replenishment:',
        '',
        'PRODUCT                          | CURRENT STOCK | SAFETY LEVEL | SUGGESTED ORDER',
        '---------------------------------+--------------+--------------+----------------'
      ];
      for (const it of g.items) {
        const name = (it.product.name || 'Unknown').padEnd(31).slice(0, 31);
        lines.push(`${name} | ${String(it.inv.quantity).padStart(12)} | ${String(it.reorder).padStart(12)} | ${String(it.suggested).padStart(15)}`);
        if (it.product.sku) lines.push(`   SKU: ${it.product.sku}`);
      }
      lines.push('');
      lines.push('Please arrange a restock at your earliest convenience.');
      lines.push('Thank you for your continued supply partnership.');
      lines.push('');
      lines.push(`— ${companyName}`);
      const bodyText = lines.join('\n');

      const subject = `Low Stock Reorder Request — ${companyName}`;
      const raw = buildRawEmail(g.vendor.email, subject, bodyText);

      try {
        const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw })
        });
        if (!res.ok) {
          const txt = await res.text();
          errors.push(`send to ${g.vendor.email} (${g.vendor.name}) failed: ${res.status} ${txt}`);
          log.push(`SEND FAIL ${g.vendor.email}: ${res.status} ${txt}`);
          continue;
        }
        emailsSent++;
        log.push(`sent email to ${g.vendor.email} (${g.vendor.name}) for ${g.items.length} product(s)`);

        // Record reorder_suggestion alerts so we don't re-spam within 24h
        for (const it of g.items) {
          await base44.asServiceRole.entities.Alert.create({
            company_id: g.companyId,
            type: 'reorder_suggestion',
            severity: 'critical',
            product_id: it.product.id,
            product_name: it.product.name,
            title: `Reorder sent to ${g.vendor.name}`,
            message: `Vendor ${g.vendor.name} (<${g.vendor.email}>) was emailed to restock ${it.product.name}.`,
            current_stock: it.inv.quantity,
            reorder_level: it.reorder,
            suggested_order_quantity: it.suggested,
            is_read: false,
            is_dismissed: false,
            created_date: new Date().toISOString()
          });
          productsAlerted++;
        }
      } catch (e) {
        errors.push(`email to ${g.vendor.email}: ${e.message}`);
        log.push(`SEND ERROR ${g.vendor.email}: ${e.message}`);
      }
    }

    return Response.json({
      status: 'ok',
      emails_sent: emailsSent,
      products_alerted: productsAlerted,
      vendors_notified: Object.keys(groups).length,
      errors,
      logs: log
    });
  } catch (error) {
    console.error('emailLowStockVendors error', error);
    return Response.json({ status: 'error', error: error.message, logs: log }, { status: 500 });
  }
});