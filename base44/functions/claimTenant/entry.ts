import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Called on first login when a ?tid= param is in the URL.
 * Assigns tenant_id + company_id to the currently-logged-in user if not already set.
 *
 * Body: { tenantId }
 * Returns: { success, alreadySet }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId } = await req.json();
    if (!tenantId) {
      return Response.json({ error: 'tenantId is required' }, { status: 400 });
    }

    // If already has a tenant, don't overwrite
    if (user.tenant_id && user.tenant_id !== tenantId) {
      return Response.json({ success: true, alreadySet: true, tenant_id: user.tenant_id });
    }

    // Verify the company actually exists
    const companies = await base44.asServiceRole.entities.Company.filter({ id: tenantId });
    if (companies.length === 0) {
      return Response.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Assign tenant
    await base44.entities.User.update(user.id, {
      tenant_id: tenantId,
      company_id: tenantId,
    });

    return Response.json({ success: true, alreadySet: false, tenant_id: tenantId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});