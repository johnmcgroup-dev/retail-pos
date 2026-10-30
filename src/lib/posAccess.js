/**
 * Who may work the POS / cart screen.
 *
 * Every user of a tenant can ring up sales on the POS and see the tenant's
 * products, except accounts that are no longer authorised to deal with sales
 * at all — deactivated users, and users not attached to a company.
 */
export function canUsePOS(user) {
  if (!user) return false;
  if (user.is_active === false) return false;
  return Boolean(user.company_id || user.tenant_id);
}

// Pages a staff ("user") account may open.
export const STAFF_PATHS = ["/StaffPOS", "/StaffDashboard", "/POS"];