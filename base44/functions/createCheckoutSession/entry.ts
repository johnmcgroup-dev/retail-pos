import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@16.2.0';

const MONTHLY_PRICE_ID = 'price_1TkY5hIveb6OSAWQHBbjZUuA';
const YEARLY_PRICE_ID = 'price_1TkY5hIveb6OSAWQHYh06TKe';

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

    const priceId = plan === 'monthly' ? MONTHLY_PRICE_ID : YEARLY_PRICE_ID;

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    // Build success/cancel URLs based on origin
    const origin = req.headers.get('origin') || 'https://app.base44.com';
    const successUrl = `${origin}/Dashboard?payment=success`;
    const cancelUrl = `${origin}/?payment=cancelled`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        company_id: company.id,
        user_id: user.id,
        plan
      },
      subscription_data: {
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          company_id: company.id,
          plan
        }
      }
    });

    console.log(`Checkout session created for user ${user.email}, plan: ${plan}, session: ${session.id}`);

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return Response.json({ error: error.message || 'Failed to create checkout session' }, { status: 500 });
  }
});