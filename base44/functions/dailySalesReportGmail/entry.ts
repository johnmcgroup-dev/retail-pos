import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function base64UrlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const [sales, products, companies] = await Promise.all([
      base44.asServiceRole.entities.Sale.list("-sale_date", 500),
      base44.asServiceRole.entities.Product.list(),
      base44.asServiceRole.entities.Company.list(),
    ]);

    const company = companies[0];
    if (!company) {
      return Response.json({ error: "No company found" }, { status: 400 });
    }

    const recipient = company.email || Deno.env.get("REPORT_EMAIL");
    if (!recipient) {
      return Response.json({ error: "No recipient email — set company email or REPORT_EMAIL secret" }, { status: 400 });
    }

    // Today's sales in Lagos timezone (UTC+1)
    const now = new Date();
    const lagosOffset = 1 * 60 * 60 * 1000;
    const lagosNow = new Date(now.getTime() + lagosOffset);
    const startOfTodayLagos = new Date(lagosNow);
    startOfTodayLagos.setHours(0, 0, 0, 0);
    const startOfTodayUTC = new Date(startOfTodayLagos.getTime() - lagosOffset);

    const todaySales = sales.filter(s => new Date(s.sale_date) >= startOfTodayUTC);

    const totalRevenue = todaySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const transactionCount = todaySales.length;

    // Gross profit = revenue - cost of goods sold
    let totalCost = 0;
    todaySales.forEach(s => {
      (s.items || []).forEach(item => {
        const p = products.find(x => x.id === item.product_id);
        totalCost += ((p?.cost_price || 0) * item.quantity);
      });
    });
    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : "0.0";

    // Top 5 products by revenue
    const productMap = {};
    todaySales.forEach(s => {
      (s.items || []).forEach(item => {
        if (!productMap[item.product_id]) {
          productMap[item.product_id] = { name: item.product_name || "Unknown", qty: 0, revenue: 0 };
        }
        productMap[item.product_id].qty += item.quantity;
        productMap[item.product_id].revenue += item.total || (item.unit_price * item.quantity);
      });
    });
    const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    const currency = company.currency || 'NGN';
    const sym = company.show_currency_symbol !== false ? (currency === 'NGN' ? '₦' : '$') : '';
    const fmt = (n) => `${sym}${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const dateLabel = startOfTodayLagos.toDateString();

    const topProductsHtml = topProducts.length > 0
      ? topProducts.map((p, i) => `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${i + 1}. ${p.name}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">${p.qty}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">${fmt(p.revenue)}</td>
        </tr>`).join("")
      : `<tr><td colspan="3" style="padding:12px;color:#94a3b8;text-align:center;">No sales today</td></tr>`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
    <div style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:24px;color:white;">
      <h1 style="margin:0;font-size:20px;">📊 End-of-Day Sales Report</h1>
      <p style="margin:4px 0 0;opacity:0.85;font-size:14px;">${company.name} — ${dateLabel}</p>
    </div>
    <div style="padding:24px;">
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:24px;">
        <div style="background:#eff6ff;border-radius:8px;padding:16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#3b82f6;">Total Sales Revenue</p>
          <p style="margin:4px 0 0;font-size:22px;font-weight:bold;color:#1e3a5f;">${fmt(totalRevenue)}</p>
        </div>
        <div style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#16a34a;">Gross Profit</p>
          <p style="margin:4px 0 0;font-size:22px;font-weight:bold;color:#14532d;">${fmt(grossProfit)}</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:24px;">
        <div style="background:#fffbeb;border-radius:8px;padding:16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#d97706;">Transactions</p>
          <p style="margin:4px 0 0;font-size:22px;font-weight:bold;color:#92400e;">${transactionCount}</p>
        </div>
        <div style="background:#faf5ff;border-radius:8px;padding:16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#7c3aed;">Profit Margin</p>
          <p style="margin:4px 0 0;font-size:22px;font-weight:bold;color:#4c1d95;">${profitMargin}%</p>
        </div>
      </div>

      <h2 style="font-size:15px;color:#1e293b;margin-bottom:8px;">🏆 Top Selling Products</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;">Product</th>
            <th style="padding:8px 12px;text-align:center;color:#64748b;font-weight:600;">Units</th>
            <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:600;">Revenue</th>
          </tr>
        </thead>
        <tbody>${topProductsHtml}</tbody>
      </table>

      <div style="background:#f8fafc;border-radius:8px;padding:12px;margin-top:16px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;">
          <span style="color:#64748b;">Cost of Goods Sold:</span><span>${fmt(totalCost)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;">
          <span style="color:#64748b;">Average Order Value:</span><span>${transactionCount > 0 ? fmt(totalRevenue / transactionCount) : fmt(0)}</span>
        </div>
      </div>
    </div>
    <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#94a3b8;">
      Automated report from ${company.name} · Sent via Gmail · ${new Date().toISOString()}
    </div>
  </div>
</body>
</html>`;

    // Build MIME message and send via Gmail connector
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    const subject = `📊 End-of-Day Report — ${company.name} — ${dateLabel}`;
    const boundary = "b44report_" + Math.random().toString(36).substring(2);
    const mimeMessage = [
      `To: ${recipient}`,
      `From: me`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      htmlBody,
      `--${boundary}--`,
    ].join("\r\n");

    const raw = base64UrlEncode(mimeMessage);

    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    if (!gmailResponse.ok) {
      const errText = await gmailResponse.text();
      console.error("Gmail API error:", errText);
      return Response.json({ error: `Gmail send failed: ${gmailResponse.status}` }, { status: 500 });
    }

    return Response.json({
      success: true,
      date: dateLabel,
      recipient,
      totalRevenue,
      grossProfit,
      profitMargin,
      transactions: transactionCount,
    });
  } catch (error) {
    console.error("dailySalesReportGmail error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});