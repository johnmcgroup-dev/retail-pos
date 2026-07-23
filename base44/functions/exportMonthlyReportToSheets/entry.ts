import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get Google Sheets OAuth token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    if (!accessToken) {
      return Response.json({ error: "Google Sheets not connected" }, { status: 403 });
    }

    // Determine the month to export — default to previous month
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const now = new Date();
    const targetDate = body.year && body.month
      ? new Date(body.year, body.month - 1, 1)
      : new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const monthName = targetDate.toLocaleString('default', { month: 'long' });

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    // Fetch all sales (paginate if needed)
    let allSales = [];
    let offset = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.Sale.list("-sale_date", 500, offset);
      allSales = allSales.concat(batch);
      if (!batch || batch.length < 500) break;
      offset += 500;
      if (offset > 5000) break; // safety cap
    }

    // Filter to target month
    const monthlySales = allSales.filter(s => {
      if (!s.sale_date) return false;
      const d = new Date(s.sale_date);
      return d >= startDate && d < endDate;
    });

    if (monthlySales.length === 0) {
      return Response.json({
        success: true,
        message: `No sales found for ${monthName} ${year}`,
        totalTransactions: 0,
      });
    }

    // Aggregate data
    const totalRevenue = monthlySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const totalTransactions = monthlySales.length;
    const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const totalItemsSold = monthlySales.reduce((sum, s) =>
      sum + (s.items || []).reduce((sum2, i) => sum2 + (i.quantity || 0), 0), 0);

    // Daily revenue breakdown
    const dailyMap = {};
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      dailyMap[d] = { date: `${monthName} ${d}`, revenue: 0, transactions: 0 };
    }
    monthlySales.forEach(s => {
      const day = new Date(s.sale_date).getDate();
      if (dailyMap[day]) {
        dailyMap[day].revenue += s.total_amount || 0;
        dailyMap[day].transactions += 1;
      }
    });

    // Staff performance
    const staffMap = {};
    monthlySales.forEach(s => {
      const key = s.cashier || "Unknown";
      if (!staffMap[key]) staffMap[key] = { cashier: key, totalSales: 0, transactions: 0, items: 0 };
      staffMap[key].totalSales += s.total_amount || 0;
      staffMap[key].transactions += 1;
      staffMap[key].items += (s.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
    });
    const staffList = Object.values(staffMap).sort((a, b) => b.totalSales - a.totalSales);

    // Top products
    const productMap = {};
    monthlySales.forEach(s => {
      (s.items || []).forEach(item => {
        const key = item.product_name || "Unknown";
        if (!productMap[key]) productMap[key] = { name: key, quantity: 0, revenue: 0 };
        productMap[key].quantity += item.quantity || 0;
        productMap[key].revenue += item.total || (item.unit_price || 0) * (item.quantity || 0);
      });
    });
    const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);

    // Payment method breakdown
    const paymentMap = {};
    monthlySales.forEach(s => {
      const key = s.payment_method || "unknown";
      if (!paymentMap[key]) paymentMap[key] = { method: key, count: 0, total: 0 };
      paymentMap[key].count += 1;
      paymentMap[key].total += s.total_amount || 0;
    });

    // Create Google Sheet
    const sheetTitle = `Sales Report - ${monthName} ${year}`;
    const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: { title: sheetTitle },
        sheets: [
          { properties: { title: "Summary" } },
          { properties: { title: "Daily Revenue" } },
          { properties: { title: "Staff Performance" } },
          { properties: { title: "Top Products" } },
          { properties: { title: "Payment Methods" } },
          { properties: { title: "All Transactions" } },
        ],
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("Google Sheets create failed:", errText);
      return Response.json({ error: "Failed to create Google Sheet: " + errText }, { status: 500 });
    }

    const sheetData = await createRes.json();
    const spreadsheetId = sheetData.spreadsheetId;
    const spreadsheetUrl = sheetData.spreadsheetUrl;

    // Write Summary sheet
    await writeSheet(accessToken, spreadsheetId, "Summary", [
      ["Monthly Sales Report"],
      [`${monthName} ${year}`],
      [],
      ["Metric", "Value"],
      ["Total Revenue", totalRevenue.toFixed(2)],
      ["Total Transactions", totalTransactions],
      ["Average Order Value", avgOrderValue.toFixed(2)],
      ["Total Items Sold", totalItemsSold],
      ["Number of Active Staff", staffList.length],
      ["Number of Products Sold", topProducts.length],
      [],
      ["Top Selling Staff", "Total Sales"],
      ...(staffList.slice(0, 5).map(s => [s.cashier, s.totalSales.toFixed(2)])),
      [],
      ["Top Products", "Revenue"],
      ...(topProducts.slice(0, 5).map(p => [p.name, p.revenue.toFixed(2)])),
      [],
      ["Generated At", new Date().toISOString()],
    ]);

    // Write Daily Revenue
    await writeSheet(accessToken, spreadsheetId, "Daily Revenue", [
      ["Date", "Revenue", "Transactions"],
      ...Object.values(dailyMap).map(d => [d.date, d.revenue.toFixed(2), d.transactions]),
    ]);

    // Write Staff Performance
    await writeSheet(accessToken, spreadsheetId, "Staff Performance", [
      ["Cashier", "Total Sales", "Transactions", "Items Sold", "Avg Sale Value"],
      ...staffList.map(s => [
        s.cashier,
        s.totalSales.toFixed(2),
        s.transactions,
        s.items,
        (s.transactions > 0 ? s.totalSales / s.transactions : 0).toFixed(2),
      ]),
    ]);

    // Write Top Products
    await writeSheet(accessToken, spreadsheetId, "Top Products", [
      ["Product Name", "Quantity Sold", "Revenue", "Avg Price"],
      ...topProducts.map(p => [
        p.name,
        p.quantity,
        p.revenue.toFixed(2),
        (p.quantity > 0 ? p.revenue / p.quantity : 0).toFixed(2),
      ]),
    ]);

    // Write Payment Methods
    await writeSheet(accessToken, spreadsheetId, "Payment Methods", [
      ["Payment Method", "Transaction Count", "Total Amount"],
      ...Object.values(paymentMap).map(p => [p.method, p.count, p.total.toFixed(2)]),
    ]);

    // Write All Transactions
    await writeSheet(accessToken, spreadsheetId, "All Transactions", [
      ["Invoice #", "Date", "Cashier", "Payment Method", "Subtotal", "Tax", "Discount", "Total", "Items Count"],
      ...monthlySales.map(s => [
        s.invoice_number || "",
        s.sale_date || "",
        s.cashier || "",
        s.payment_method || "",
        (s.subtotal || 0).toFixed(2),
        (s.tax_amount || 0).toFixed(2),
        (s.discount_amount || 0).toFixed(2),
        (s.total_amount || 0).toFixed(2),
        (s.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0),
      ]),
    ]);

    console.log(`Export complete: ${spreadsheetUrl} — ${monthlySales.length} transactions, ${totalRevenue.toFixed(2)} revenue`);

    return Response.json({
      success: true,
      spreadsheetId,
      spreadsheetUrl,
      month: monthName,
      year,
      totalRevenue,
      totalTransactions,
      avgOrderValue,
      totalItemsSold,
      staffCount: staffList.length,
    });
  } catch (error) {
    console.error("exportMonthlyReportToSheets error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function writeSheet(accessToken, spreadsheetId, sheetName, values) {
  const range = `${sheetName}!A1`;
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    }
  );
  if (!res.ok) {
    console.error(`writeSheet failed for ${sheetName}:`, await res.text());
  }
}