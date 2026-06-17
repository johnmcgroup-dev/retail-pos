import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const apiKey = Deno.env.get("TERMII_API_KEY");
    const senderId = Deno.env.get("TERMII_SENDER_ID") || "MyRetailer";
    const phoneNumber = Deno.env.get("ALERT_PHONE_NUMBER");

    if (!apiKey || !phoneNumber) {
      return Response.json({
        skipped: true,
        message: "TERMII_API_KEY or ALERT_PHONE_NUMBER secret not set. Configure them in dashboard → Secrets to enable SMS alerts."
      });
    }

    const [inventory, products] = await Promise.all([
      base44.asServiceRole.entities.Inventory.list(),
      base44.asServiceRole.entities.Product.list(),
    ]);

    // Find products below their reorder level
    const lowStockItems = [];
    for (const inv of inventory) {
      const product = products.find(p => p.id === inv.product_id);
      if (!product) continue;
      const reorderLevel = product.reorder_level || 10;
      if (inv.quantity <= reorderLevel) {
        lowStockItems.push({
          name: product.name,
          quantity: inv.quantity,
          reorderLevel,
        });
      }
    }

    if (lowStockItems.length === 0) {
      return Response.json({ success: true, message: "No low stock items found", alertsSent: 0 });
    }

    const itemLines = lowStockItems
      .slice(0, 5) // Keep SMS short
      .map(i => `- ${i.name}: ${i.quantity} left (min: ${i.reorderLevel})`)
      .join("\n");

    const extraNote = lowStockItems.length > 5 ? `\n+ ${lowStockItems.length - 5} more items.` : "";

    const message = `⚠️ LOW STOCK ALERT\n${new Date().toDateString()}\n\n${itemLines}${extraNote}\n\nRestock urgently — My Retailer Pro`;

    const response = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        to: phoneNumber,
        from: senderId,
        sms: message,
        type: "plain",
        channel: "generic",
      }),
    });

    const result = await response.json();

    return Response.json({
      success: true,
      alertsSent: lowStockItems.length,
      lowStockItems,
      termiiResponse: result,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});