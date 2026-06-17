import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all needed data as service role (scheduled task)
    const [sales, products, companies] = await Promise.all([
      base44.asServiceRole.entities.Sale.list("-sale_date"),
      base44.asServiceRole.entities.Product.list(),
      base44.asServiceRole.entities.Company.list(),
    ]);

    const company = companies[0];
    if (!company) {
      return Response.json({ error: "No company found" }, { status: 400 });
    }

    const reportEmail = Deno.env.get("REPORT_EMAIL");
    if (!reportEmail) {
      return Response.json({ error: "REPORT_EMAIL secret not set" }, { status: 400 });
    }

    // Yesterday's date range
    const now = new Date();
    const startOfYesterday = new Date(now);
    startOfYesterday.setDate(now.getDate() - 1);
    startOfYesterday.setHours(0, 0, 0, 0);
    const endOfYesterday = new Date(startOfYesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    const yesterdaySales = sales.filter(s => {
      const d = new Date(s.sale_date);
      return d >= startOfYesterday && d <= endOfYesterday;
    });

    const totalRevenue = yesterdaySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

    // Gross profit
    const totalCost = yesterdaySales.reduce((sum, s) => {
      return sum + (s.items || []).reduce((isum, item) => {
        const p = products.find(x => x.id === item.product_id);
        return isum + ((p?.cost_price || 0) * item.quantity);
      }, 0);
    }, 0);

    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : "0.0";

    // Top 5 selling products by revenue
    const productMap = {};
    yesterdaySales.forEach(s => {
      (s.items || []).forEach(item => {
        if (!productMap[item.product_id]) {
          productMap[item.product_id] = { name: item.product_name || "Unknown", qty: 0, revenue: 0 };
        }
        productMap[item.product_id].qty += item.quantity;
        productMap[item.product_id].revenue += item.total || (item.unit_price * item.quantity);
      });
    });
    const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Sales by staff
    const staffMap = {};
    yesterdaySales.forEach(s => {
      const name = s.cashier ? s.cashier.split("@")[0] : "Unknown";
      if (!staffMap[name]) staffMap[name] = { totalSales: 0, transactions: 0 };
      staffMap[name].totalSales += s.total_amount || 0;
      staffMap[name].transactions += 1;
    });

    const dateLabel = startOfYesterday.toDateString();
    const fmt = (n) => Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const topProductsHtml = topProducts.length > 0
      ? topProducts.map((p, i) => `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${i + 1}. ${p.name}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">${p.qty}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">₦${fmt(p.revenue)}</td>
        </tr>`).join("")
      : `<tr><td colspan="3" style="padding:12px;color:#94a3b8;text-align:center;">No sales yesterday</td></tr>`;

    const staffHtml = Object.entries(staffMap).length > 0
      ? Object.entries(staffMap).sort((a, b) => b[1].totalSales - a[1].totalSales)
          .map(([name, data]) => `<tr>
            <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-transform:capitalize;">${name}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">${data.transactions}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">₦${fmt(data.totalSales)}</td>
          </tr>`).join("")
      : `<tr><td colspan="3" style="padding:12px;color:#94a3b8;text-align:center;">No staff data</td></tr>`;

    const emailBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
    <div style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:24px;color:white;">
      <h1 style="margin:0;font-size:20px;">📊 Daily Sales Report</h1>
      <p style="margin:4px 0 0;opacity:0.85;font-size:14px;">${company.name} — ${dateLabel}</p>
    </div>
    <div style="padding:24px;">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;">
        <div style="background:#eff6ff;border-radius:8px;padding:16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#3b82f6;">Total Revenue</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:#1e3a5f;">₦${fmt(totalRevenue)}</p>
        </div>
        <div style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#16a34a;">Gross Profit</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:#14532d;">₦${fmt(grossProfit)}</p>
        </div>
        <div style="background:#faf5ff;border-radius:8px;padding:16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#7c3aed;">Profit Margin</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:#4c1d95;">${profitMargin}%</p>
        </div>
      </div>

      <h2 style="font-size:15px;color:#1e293b;margin-bottom:8px;">🏆 Top Selling Products</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;">Product</th>
            <th style="padding:8px 12px;text-align:center;color:#64748b;font-weight:600;">Units</th>
            <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:600;">Revenue</th>
          </tr>
        </thead>
        <tbody>${topProductsHtml}</tbody>
      </table>

      <h2 style="font-size:15px;color:#1e293b;margin-bottom:8px;">👤 Sales by Staff</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;">Staff</th>
            <th style="padding:8px 12px;text-align:center;color:#64748b;font-weight:600;">Transactions</th>
            <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:600;">Total Sales</th>
          </tr>
        </thead>
        <tbody>${staffHtml}</tbody>
      </table>
    </div>
    <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#94a3b8;">
      Automated report from My Retailer Pro · ${new Date().toISOString()}
    </div>
  </div>
</body>
</html>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: reportEmail,
      subject: `📊 Daily Sales Report — ${company.name} — ${dateLabel}`,
      body: emailBody,
    });

    return Response.json({
      success: true,
      date: dateLabel,
      totalRevenue,
      grossProfit,
      profitMargin,
      transactions: yesterdaySales.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});