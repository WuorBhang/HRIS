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
  PAGE_VIEW: "page.view",
};

// Friendly label for a page path (used in audit metadata + admin analytics).
export const labelForPath = (path) => {
  if (!path) return "Unknown";
  const map = {
    "/dashboard": "Dashboard",
    "/profile": "My profile",
    "/change-password": "Change password",
    "/my-activity": "My activity",
    "/admin/dashboard": "Admin · Dashboard",
    "/admin/users": "Admin · Users",
    "/admin/contracts": "Admin · Contracts",
    "/admin/documents": "Admin · Documents",
    "/admin/public-holidays": "Admin · Public holidays",
    "/admin/audit-logs": "Admin · Audit logs",
    "/admin/salary-advances": "Admin · Salary advances",
    "/admin/profile": "Admin · Profile",
    "/employer/dashboard": "Employer · Dashboard",
    "/employer/employees": "Employer · My employees",
    "/employer/leave-requests": "Employer · Leave requests",
    "/employer/timesheets": "Employer · Timesheets",
    "/employer/documents": "Employer · Documents",
    "/employer/payslips": "Employer · Payslips",
    "/employer/profile": "Employer · Profile",
    "/employee/dashboard": "Employee · Dashboard",
    "/employee/leave": "Employee · Leave",
    "/employee/overtime": "Employee · Overtime",
    "/employee/holiday": "Employee · Holiday work",
    "/employee/documents": "Employee · My documents",
    "/employee/payslips": "Employee · Payslips",
    "/employee/profile": "Employee · Profile",
  };
  if (map[path]) return map[path];
  if (path.startsWith("/employer/employees/"))
    return "Employer · Employee detail";
  return path;
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
