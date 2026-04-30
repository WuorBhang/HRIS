import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

// Firestore collection for the activity log. Append-only; admin-only read.
const ACTIVITY_LOGS_COLLECTION = "activity_logs";

export const AUDIT_ACTIONS = Object.freeze({
  // Authentication
  USER_LOGIN: "user.login",
  USER_LOGOUT: "user.logout",
  PASSWORD_CHANGED: "user.password_changed",
  PASSWORD_RESET_REQUESTED: "user.password_reset_requested",

  // User lifecycle (admin-driven)
  ACCOUNT_CREATED: "account.created",
  USER_CREATED: "user.created", // legacy alias of ACCOUNT_CREATED
  USER_APPROVED: "user.approved",
  USER_DISABLED: "user.disabled",
  USER_REENABLED: "user.reenabled",
  USER_DELETED: "user.deleted",
  USER_UPDATED: "user.updated",
  TEMP_PASSWORD_REGENERATED: "user.temp_password_regenerated",

  // Profile (self)
  PROFILE_UPDATED: "profile.updated",

  // Contracts
  CONTRACT_CREATED: "contract.created",
  CONTRACT_UPDATED: "contract.updated",
  CONTRACT_DELETED: "contract.deleted",
  CONTRACT_ACTIVATED: "contract.activated",
  CONTRACT_DEACTIVATED: "contract.deactivated",

  // Leave requests
  LEAVE_SUBMITTED: "leave.submitted",
  LEAVE_APPROVED: "leave.approved",
  LEAVE_REJECTED: "leave.rejected",
  LEAVE_CANCELLED: "leave.cancelled",

  // Overtime
  OVERTIME_SUBMITTED: "overtime.submitted",
  OVERTIME_APPROVED: "overtime.approved",
  OVERTIME_REJECTED: "overtime.rejected",

  // Holiday work
  HOLIDAY_WORK_SUBMITTED: "holiday_work.submitted",
  HOLIDAY_WORK_APPROVED: "holiday_work.approved",
  HOLIDAY_WORK_REJECTED: "holiday_work.rejected",

  // Documents
  DOCUMENT_UPLOADED: "document.uploaded",
  DOCUMENT_DELETED: "document.deleted",
  DOCUMENT_DOWNLOADED: "document.downloaded",

  // Salary advances
  SALARY_ADVANCE_REQUESTED: "salary_advance.requested",
  SALARY_ADVANCE_APPROVED: "salary_advance.approved",
  SALARY_ADVANCE_REJECTED: "salary_advance.rejected",

  // Public holidays (admin)
  PUBLIC_HOLIDAY_CREATED: "public_holiday.created",
  PUBLIC_HOLIDAY_UPDATED: "public_holiday.updated",
  PUBLIC_HOLIDAY_DELETED: "public_holiday.deleted",
  PUBLIC_HOLIDAYS_SEEDED: "public_holiday.seeded",
});

/**
 * Append an entry to the `activity_logs` Firestore collection.
 *
 * Failures are swallowed on purpose — auditing is a best-effort side effect
 * and must never break the user-facing action that triggered it.
 *
 * @param {string} action      One of AUDIT_ACTIONS values.
 * @param {string} performedBy uid of the actor (or "system" for automated jobs).
 * @param {string} role        Role of the actor at the time of the action.
 * @param {object} [metadata]  Free-form context (target ids, before/after, etc.).
 * @returns {Promise<string|null>} The new log document id, or null on failure.
 */
export async function logAction(action, performedBy, role, metadata = {}) {
  try {
    if (!action) return null;
    const safeMetadata =
      metadata && typeof metadata === "object" && !Array.isArray(metadata)
        ? metadata
        : {};
    const ref = await addDoc(collection(db, ACTIVITY_LOGS_COLLECTION), {
      action,
      performedBy: performedBy || "unknown",
      role: role || "unknown",
      metadata: safeMetadata,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[audit] logAction failed (non-fatal):", action, err);
    }
    return null;
  }
}
