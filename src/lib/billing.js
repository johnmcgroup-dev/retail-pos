/**
 * Subscription billing rules.
 *
 * A store pays either an annual or a monthly subscription from day one — there
 * is no free trial and no one-off activation fee (the fee stays configurable and
 * is simply 0 by default). A store is only open while its billing status is
 * active, complimentary, or the developer has granted manual access.
 * The developer can change every number here from Company Setup → Subscription.
 */

export const BILLING_DEFAULTS = {
  activation_fee: 0,
  annual_price: 95000,
  monthly_price: 13500,
  trials_enabled: false,
  trial_days: 0,
  payment_instructions: "",
  checkout_url_annual: "",
  checkout_url_monthly: "",
};

const STATUS_LABELS = {
  pending_activation: "Awaiting activation",
  active: "Active",
  past_due: "Payment due",
  suspended: "Suspended",
  comped: "Complimentary",
};

export function money(value) {
  const amount = Number(value || 0);
  return `₦${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  })}`;
}

export function withDefaults(config) {
  return { ...BILLING_DEFAULTS, ...(config || {}) };
}

export function priceFor(cycle, config) {
  const cfg = withDefaults(config);
  return cycle === "monthly" ? cfg.monthly_price : cfg.annual_price;
}

/**
 * The hosted checkout page a tenant is sent to for the plan they picked.
 * The reference is attached so the payment can be matched to the store.
 */
export function checkoutLinkFor(cycle, config, reference) {
  const cfg = withDefaults(config);
  const link = (cycle === "monthly" ? cfg.checkout_url_monthly : cfg.checkout_url_annual) || "";
  if (!link) return "";
  try {
    const url = new URL(link);
    if (reference) url.searchParams.set("client_reference_id", reference);
    return url.toString();
  } catch (_) {
    return link;
  }
}

export function annualSaving(config) {
  const cfg = withDefaults(config);
  return cfg.monthly_price * 12 - cfg.annual_price;
}

export function activationFee(company, config) {
  const cfg = withDefaults(config);
  return Number(company?.activation_fee ?? cfg.activation_fee);
}

/** Date the next cycle falls due, one cycle after `from`. */
export function addCycle(from, cycle) {
  const date = new Date(from || Date.now());
  if (cycle === "monthly") date.setMonth(date.getMonth() + 1);
  else date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().split("T")[0];
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Where a tenant stands with billing — `locked` is what the app gate keys off.
 *
 * Stores created before subscription billing carry no billing_status: they stay
 * open while their legacy status is active, and are asked to subscribe once it
 * is not.
 */
export function billingState(company) {
  if (!company) return { status: "active", label: STATUS_LABELS.active, locked: false };

  if (company.billing_override) {
    return { status: "comped", label: "Manual billing — access granted", locked: false };
  }

  if (!company.billing_status) {
    const legacyOpen = company.status === "active";
    return {
      status: legacyOpen ? "active" : "pending_activation",
      label: legacyOpen ? STATUS_LABELS.active : STATUS_LABELS.past_due,
      locked: !legacyOpen,
    };
  }

  if (company.billing_status === "comped") {
    return { status: "comped", label: STATUS_LABELS.comped, locked: false };
  }

  if (company.billing_status === "suspended") {
    return { status: "suspended", label: STATUS_LABELS.suspended, locked: true };
  }

  if (company.billing_status === "active") {
    const due = company.next_billing_date ? new Date(company.next_billing_date) : null;
    if (due && due < startOfToday()) {
      return { status: "past_due", label: STATUS_LABELS.past_due, locked: true };
    }
    return { status: "active", label: STATUS_LABELS.active, locked: false };
  }

  return {
    status: company.billing_status,
    label: STATUS_LABELS[company.billing_status] || STATUS_LABELS.past_due,
    locked: true,
  };
}

/** What the store owes right now: setup fee (if unpaid) plus one billing cycle. */
export function amountDue(company, config) {
  if (!billingState(company).locked) return 0;
  const cycle = company?.billing_cycle || "annual";
  const setup = company?.activation_paid ? 0 : activationFee(company, config);
  return setup + priceFor(cycle, config);
}

/** Legacy `status` value that matches a billing status, so older screens agree. */
export const STATUS_FOR_BILLING = {
  pending_activation: "pending_payment",
  active: "active",
  past_due: "expired",
  suspended: "suspended",
  comped: "active",
};