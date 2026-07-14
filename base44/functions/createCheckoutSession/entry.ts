import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan } = await req.json();

    if (plan !== 'monthly' && plan !== 'yearly') {
      return Response.json({ error: 'Invalid plan. Choose "monthly" or "yearly".' }, { status: 400 });
    }

    // Get the company for this user
    const companies = await base44.asServiceRole.entities.Company.filter({ created_by_id: user.id });
    const company = companies[0];

    if (!company) {
      return Response.json({ error: 'No company found for this user.' }, { status: 404 });
    }

    // Determine if this is the first payment (no prior subscription)
    const hasPriorSubscription = !!company.subscription_start_date && company.status !== 'trial';

    let amount;
    if (plan === 'monthly' && !hasPriorSubscription) {
      // First month introductory price
      amount = company.first_month_price ?? 1;
    } else if (plan === 'monthly') {
      amount = company.monthly_price || 9.9;
    } else {
      amount = company.yearly_price || 127;
    }

    // Paystack expects amounts in the smallest currency unit (kobo for NGN, cents for USD)
    const amountInSmallestUnit = Math.round(amount * 100);
    const currency = company.currency || 'NGN';

    // Generate a unique reference for this transaction
    const reference = `mrp_${company.id}_${plan}_${Date.now()}`;

    // Build callback URL based on origin
    const origin = req.headers.get('origin') || 'https://app.base44.com';
    const callbackUrl = `${origin}/Dashboard?payment=success`;

    // Initialize transaction via Paystack API
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountInSmallestUnit,
        currency,
        reference,
        callback_url: callbackUrl,
        metadata: {
          company_id: company.id,
          user_id: user.id,
          plan,
          is_first_payment: !hasPriorSubscription,
          base44_app_id: Deno.env.get('BASE44_APP_ID')
        }
      })
    });

    const data = await paystackResponse.json();

    if (!data.status || !data.data?.authorization_url) {
      console.error('Paystack initialization failed:', data);
      return Response.json({ error: data.message || 'Failed to initialize payment' }, { status: 500 });
    }

    console.log(`Paystack transaction initialized for user ${user.email}, plan: ${plan}, amount: ${amount}, first payment: ${!hasPriorSubscription}, reference: ${reference}`);

    return Response.json({ url: data.data.authorization_url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return Response.json({ error: error.message || 'Failed to create checkout session' }, { status: 500 });
  }
});