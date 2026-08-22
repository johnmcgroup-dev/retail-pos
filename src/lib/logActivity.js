import { base44 } from "@/api/base44Client";

/**
 * Fire-and-forget audit logger. Never throws — logging must not break the
 * business operation that triggered it.
 */
export async function logActivity({
  companyId,
  entityType,
  action,
  entityId = null,
  referenceNumber = null,
  description = "",
  amount = null,
  performedBy = null,
  performedByName = null,
  details = null,
}) {
  try {
    if (!companyId || !entityType || !action) return;
    await base44.entities.ActivityLog.create({
      company_id: companyId,
      entity_type: entityType,
      action,
      entity_id: entityId,
      reference_number: referenceNumber,
      description,
      amount,
      performed_by: performedBy,
      performed_by_name: performedByName,
      details,
      activity_date: new Date().toISOString(),
    });
  } catch (err) {
    console.error("logActivity failed:", err);
  }
}