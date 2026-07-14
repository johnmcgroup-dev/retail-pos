import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

/**
 * Verifies a Paystack transaction by reference.
 * Body: { reference }
 * Returns: { status: 'success'|'failed', amount, currency, reference, customer_email }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reference } = await req.json();

    if (!reference) {
      return Response.json({ error: 'Reference is required' }, { status: 400 });
    }

    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await verifyResponse.json();

    if (!data.status) {
      console.error('Paystack verification failed:', data);
      return Response.json({ error: data.message || 'Verification failed' }, { status: 500 });
    }

    const transaction = data.data;
    const isSuccess = transaction.status === 'success';

    console.log(`Paystack transaction verified: ${reference}, status: ${transaction.status}`);

    return Response.json({
      status: isSuccess ? 'success' : 'failed',
      amount: transaction.amount / 100, // Convert from smallest unit back to main currency
      currency: transaction.currency,
      reference: transaction.reference,
      customer_email: transaction.customer?.email,
      transaction_id: transaction.id,
      paid_at: transaction.paid_at
    });
  } catch (error) {
    console.error('Error verifying Paystack transaction:', error);
    return Response.json({ error: error.message || 'Failed to verify transaction' }, { status: 500 });
  }
});