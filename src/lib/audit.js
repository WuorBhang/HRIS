// Append-only audit log writer.
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { COLLECTIONS } from "./constants";

export const AUDIT = {
  USER_LOGIN: "user.login",
  USER_LOGOUT: "user.logout",
  PASSWORD_CHANGED: "user.password_changed",
  SESSION_END: "user.session_end",
  ACCOUNT_CREATED: "account.created",
  USER_APPROVED: "user.approved",
  USER_DISABLED: "user.disabled",
  USER_REENABLED: "user.reenabled",
  PROFILE_UPDATED: "profile.updated",
  CONTRACT_CREATED: "contract.created",
  CONTRACT_DELETED: "contract.deleted",
  LEAVE_SUBMITTED: "leave.submitted",
  LEAVE_APPROVED: "leave.approved",
  LEAVE_REJECTED: "leave.rejected",
  OVERTIME_SUBMITTED: "overtime.submitted",
  OVERTIME_APPROVED: "overtime.approved",
  OVERTIME_REJECTED: "overtime.rejected",
  HOLIDAY_WORK_SUBMITTED: "holiday_work.submitted",
  HOLIDAY_WORK_APPROVED: "holiday_work.approved",
  HOLIDAY_WORK_REJECTED: "holiday_work.rejected",
  DOCUMENT_UPLOADED: "document.uploaded",
  DOCUMENT_DELETED: "document.deleted",
};

// Best-effort audit log write.
export const logAction = (action, performedBy, role, metadata = {}) =>
  addDoc(collection(db, COLLECTIONS.ACTIVITY_LOGS), {
    action,
    performedBy: performedBy || "unknown",
    role: role || "unknown",
    metadata: metadata && typeof metadata === "object" ? metadata : {},
    createdAt: serverTimestamp(),
  }).catch(() => null);
