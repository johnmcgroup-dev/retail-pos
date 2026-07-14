import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

/**
 * Initializes a Paystack transaction for a POS sale.
 * Body: { amount, email, currency, callback_url }
 * Returns: { authorization_url, reference }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, email, currency, callback_url } = await req.json();

    if (!amount || amount <= 0) {
      return Response.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    // Use the provided email, or fall back to the logged-in user's email
    const customerEmail = email || user.email;
    if (!customerEmail) {
      return Response.json({ error: 'Customer email is required for Paystack payment' }, { status: 400 });
    }

    // Paystack expects amounts in the smallest currency unit (kobo for NGN, cents for USD)
    const amountInSmallestUnit = Math.round(amount * 100);
    const reference = `pos_${user.id}_${Date.now()}`;

    const origin = req.headers.get('origin') || 'https://app.base44.com';
    const callbackUrl = callback_url || `${origin}/POS?payment=success&reference=${reference}`;

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: customerEmail,
        amount: amountInSmallestUnit,
        currency: currency || 'NGN',
        reference,
        callback_url: callbackUrl,
        metadata: {
          user_id: user.id,
          type: 'pos_sale',
          base44_app_id: Deno.env.get('BASE44_APP_ID')
        }
      })
    });

    const data = await paystackResponse.json();

    if (!data.status || !data.data?.authorization_url) {
      console.error('Paystack POS initialization failed:', data);
      return Response.json({ error: data.message || 'Failed to initialize payment' }, { status: 500 });
    }

    console.log(`Paystack POS transaction initialized for user ${user.email}, reference: ${reference}, amount: ${amount}`);

    return Response.json({
      authorization_url: data.data.authorization_url,
      reference
    });
  } catch (error) {
    console.error('Error initializing POS payment:', error);
    return Response.json({ error: error.message || 'Failed to initialize payment' }, { status: 500 });
  }
});