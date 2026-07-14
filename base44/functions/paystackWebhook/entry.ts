import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const secretKey = Deno.env.get('PAYSTACK_SECRET_KEY');

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const body = await req.text();
  const signature = req.headers.get('x-paystack-signature');

  if (!signature) {
    console.error('Paystack webhook: missing signature header');
    return Response.json({ error: 'Missing signature' }, { status: 401 });
  }

  // Verify webhook signature: HMAC SHA512 of the raw body using the secret key
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secretKey),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const computedHash = Array.from(new Uint8Array(signed))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (computedHash !== signature) {
    console.error('Paystack webhook: signature verification failed');
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch (err) {
    console.error('Paystack webhook: failed to parse body:', err);
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    if (event.event === 'charge.success') {
      const data = event.data;
      const metadata = data.metadata || {};
      const companyId = metadata.company_id;
      const plan = metadata.plan;

      if (companyId && plan) {
        const companies = await base44.asServiceRole.entities.Company.filter({ id: companyId });
        if (companies.length > 0) {
          const company = companies[0];
          await base44.asServiceRole.entities.Company.update(company.id, {
            status: 'active',
            subscription_plan: plan,
            subscription_start_date: new Date().toISOString().split('T')[0],
            subscription_end_date: plan === 'monthly'
              ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            payment_gateway: 'paystack',
            payment_gateway_customer_id: data.customer?.email || data.customer?.customer_code || data.reference
          });
          console.log(`Company ${company.name} activated with ${plan} plan via Paystack (ref: ${data.reference})`);
        }
      } else {
        console.log(`Paystack charge.success without company_id/plan metadata, ref: ${data?.reference}`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Paystack webhook: error processing event:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});