import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

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

    // Last full month
    const now = new Date();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const monthlySales = sales.filter(s => {
      const d = new Date(s.sale_date);
      return d >= startOfLastMonth && d <= endOfLastMonth;
    });

    const totalRevenue = monthlySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const totalTransactions = monthlySales.length;
    const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    const totalCost = monthlySales.reduce((sum, s) => {
      return sum + (s.items || []).reduce((isum, item) => {
        const p = products.find(x => x.id === item.product_id);
        return isum + ((p?.cost_price || 0) * item.quantity);
      }, 0);
    }, 0);

    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : "0.0";

    // Weekly breakdown
    const weekMap = {};
    monthlySales.forEach(s => {
      const d = new Date(s.sale_date);
      const week = `Week ${Math.ceil(d.getDate() / 7)}`;
      if (!weekMap[week]) weekMap[week] = { revenue: 0, transactions: 0 };
      weekMap[week].revenue += s.total_amount || 0;
      weekMap[week].transactions += 1;
    });

    // Top 10 products
    const productMap = {};
    monthlySales.forEach(s => {
      (s.items || []).forEach(item => {
        if (!productMap[item.product_id]) {
          productMap[item.product_id] = { name: item.product_name || "Unknown", qty: 0, revenue: 0 };
        }
        productMap[item.product_id].qty += item.quantity;
        productMap[item.product_id].revenue += item.total || (item.unit_price * item.quantity);
      });
    });
    const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // Staff performance
    const staffMap = {};
    monthlySales.forEach(s => {
      const name = s.cashier ? s.cashier.split("@")[0] : "Unknown";
      if (!staffMap[name]) staffMap[name] = { totalSales: 0, transactions: 0 };
      staffMap[name].totalSales += s.total_amount || 0;
      staffMap[name].transactions += 1;
    });

    const monthLabel = startOfLastMonth.toLocaleString("en-NG", { month: "long", year: "numeric" });
    const fmt = (n) => Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const topProductsHtml = topProducts.length > 0
      ? topProducts.map((p, i) => `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${i + 1}. ${p.name}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">${p.qty}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">₦${fmt(p.revenue)}</td>
        </tr>`).join("")
      : `<tr><td colspan="3" style="padding:12px;color:#94a3b8;text-align:center;">No sales this month</td></tr>`;

    const weeklyHtml = Object.entries(weekMap)
      .map(([week, d]) => `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${week}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">${d.transactions}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">₦${fmt(d.revenue)}</td>
      </tr>`).join("") || `<tr><td colspan="3" style="padding:12px;color:#94a3b8;text-align:center;">No data</td></tr>`;

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
  <div style="max-width:640px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
    <div style="background:linear-gradient(135deg,#1d4ed8,#7c3aed);padding:28px;color:white;">
      <h1 style="margin:0;font-size:22px;">📅 Monthly Revenue Report</h1>
      <p style="margin:6px 0 0;opacity:0.85;font-size:14px;">${company.name} — ${monthLabel}</p>
    </div>
    <div style="padding:28px;">
      <!-- KPI Cards -->
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:28px;">
        <div style="background:#eff6ff;border-radius:8px;padding:16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#3b82f6;font-weight:600;">TOTAL REVENUE</p>
          <p style="margin:6px 0 0;font-size:22px;font-weight:bold;color:#1e3a5f;">₦${fmt(totalRevenue)}</p>
        </div>
        <div style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#16a34a;font-weight:600;">GROSS PROFIT</p>
          <p style="margin:6px 0 0;font-size:22px;font-weight:bold;color:#14532d;">₦${fmt(grossProfit)}</p>
        </div>
        <div style="background:#faf5ff;border-radius:8px;padding:16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#7c3aed;font-weight:600;">PROFIT MARGIN</p>
          <p style="margin:6px 0 0;font-size:22px;font-weight:bold;color:#4c1d95;">${profitMargin}%</p>
        </div>
        <div style="background:#fff7ed;border-radius:8px;padding:16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#ea580c;font-weight:600;">AVG ORDER VALUE</p>
          <p style="margin:6px 0 0;font-size:22px;font-weight:bold;color:#7c2d12;">₦${fmt(avgOrderValue)}</p>
        </div>
      </div>

      <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Total Transactions: <strong>${totalTransactions}</strong></p>

      <h2 style="font-size:15px;color:#1e293b;margin:20px 0 8px;">📆 Weekly Breakdown</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;">
        <thead><tr style="background:#f8fafc;">
          <th style="padding:8px 12px;text-align:left;color:#64748b;">Week</th>
          <th style="padding:8px 12px;text-align:center;color:#64748b;">Transactions</th>
          <th style="padding:8px 12px;text-align:right;color:#64748b;">Revenue</th>
        </tr></thead>
        <tbody>${weeklyHtml}</tbody>
      </table>

      <h2 style="font-size:15px;color:#1e293b;margin:20px 0 8px;">🏆 Top 10 Products</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;">
        <thead><tr style="background:#f8fafc;">
          <th style="padding:8px 12px;text-align:left;color:#64748b;">Product</th>
          <th style="padding:8px 12px;text-align:center;color:#64748b;">Units Sold</th>
          <th style="padding:8px 12px;text-align:right;color:#64748b;">Revenue</th>
        </tr></thead>
        <tbody>${topProductsHtml}</tbody>
      </table>

      <h2 style="font-size:15px;color:#1e293b;margin:20px 0 8px;">👤 Staff Performance</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="background:#f8fafc;">
          <th style="padding:8px 12px;text-align:left;color:#64748b;">Staff</th>
          <th style="padding:8px 12px;text-align:center;color:#64748b;">Transactions</th>
          <th style="padding:8px 12px;text-align:right;color:#64748b;">Total Sales</th>
        </tr></thead>
        <tbody>${staffHtml}</tbody>
      </table>
    </div>
    <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#94a3b8;">
      Automated monthly report from My Retailer Pro · Generated ${new Date().toUTCString()}
    </div>
  </div>
</body>
</html>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: reportEmail,
      subject: `📅 Monthly Report — ${company.name} — ${monthLabel}`,
      body: emailBody,
    });

    return Response.json({
      success: true,
      month: monthLabel,
      totalRevenue,
      grossProfit,
      profitMargin,
      totalTransactions,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});