import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@16.2.0';

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
  const base44 = createClientFromRequest(req);

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event;
  try {
    // Use constructEventAsync for Deno's async Web Crypto API
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return Response.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const companyId = session.metadata?.company_id;
        const plan = session.metadata?.plan;

        if (companyId) {
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
              payment_gateway: 'stripe',
              payment_gateway_customer_id: session.customer
            });
            console.log(`Company ${company.name} activated with ${plan} plan`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const companyId = subscription.metadata?.company_id;
        if (companyId) {
          const companies = await base44.asServiceRole.entities.Company.filter({ id: companyId });
          if (companies.length > 0) {
            const status = subscription.status === 'active' ? 'active' :
                          subscription.status === 'past_due' ? 'suspended' :
                          subscription.status === 'canceled' ? 'expired' : 'suspended';
            await base44.asServiceRole.entities.Company.update(companies[0].id, { status });
            console.log(`Company ${companies[0].name} status updated to ${status}`);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const companyId = subscription.metadata?.company_id;
        if (companyId) {
          const companies = await base44.asServiceRole.entities.Company.filter({ id: companyId });
          if (companies.length > 0) {
            await base44.asServiceRole.entities.Company.update(companies[0].id, { status: 'expired' });
            console.log(`Company ${companies[0].name} subscription expired`);
          }
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        const companyId = invoice.subscription_details?.metadata?.company_id;
        if (companyId) {
          const companies = await base44.asServiceRole.entities.Company.filter({ id: companyId });
          if (companies.length > 0) {
            await base44.asServiceRole.entities.Company.update(companies[0].id, {
              status: 'active',
              subscription_end_date: new Date(invoice.period.end * 1000).toISOString().split('T')[0]
            });
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});