// Constants & enums.
export const ROLES = {
  ADMIN: "admin",
  EMPLOYER: "employer",
  EMPLOYEE: "employee",
};
export const STATUS = {
  PENDING: "pending_approval",
  APPROVED: "approved",
  ACTIVE: "active",
  DISABLED: "disabled",
};
export const COLLECTIONS = {
  USERS: "users",
  CONTRACTS: "contracts",
  PUBLIC_HOLIDAYS: "public_holidays",
  OVERTIME_RECORDS: "overtime_clock_records",
  LEAVE_REQUESTS: "leave_requests",
  DOCUMENTS: "documents",
  ACTIVITY_LOGS: "activity_logs",
  COUNTERS: "counters",
};

export const DOCUMENT_TYPES = {
  PAYSLIP: "payslip",
  STATUTORY: "statutory",
  CONTRACT: "contract",
};
export const DOCUMENT_TYPE_LABELS = {
  contract: "Contract",
  payslip: "Payslip",
  statutory: "Statutory",
};
// Document types that are filed per calendar month (require a YYYY-MM value).
export const MONTHLY_TYPES = ["payslip", "statutory"];

// File size limits
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB — bulk document uploads
export const MAX_AVATAR_BYTES = 33 * 1024 * 1024; // 33 MB — profile pictures

// Allowed MIME types per upload context
export const ALLOWED_DOCUMENT_MIME_TYPES = ["application/pdf"];
export const ALLOWED_AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

// Human-readable accept strings (for <input accept="...">)
export const DOCUMENT_INPUT_ACCEPT = ".pdf";
export const AVATAR_INPUT_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export const LEAVE_TYPES = ["Annual", "Sick", "Unpaid", "Paid"];
export const CONTRACT_TYPES = [
  "Permanent",
  "Fixed-term",
  "Casual",
  "Probation",
  "Internship",
];

// Employer subscription tiers (admin-managed).
export const EMPLOYER_TIERS = ["Free", "Basic", "Standard", "Premium"];
export const DEFAULT_EMPLOYER_TIER = "Free";

// Employer subscription status (admin-managed).
export const SUBSCRIPTION_STATUS = {
  TRIAL: "trial",
  ACTIVE: "active",
  PAST_DUE: "past_due",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
};
export const SUBSCRIPTION_STATUS_OPTIONS = Object.values(SUBSCRIPTION_STATUS);
export const SUBSCRIPTION_STATUS_LABELS = {
  trial: "Trial",
  active: "Active",
  past_due: "Past due",
  cancelled: "Cancelled",
  expired: "Expired",
};
export const DEFAULT_SUBSCRIPTION_STATUS = SUBSCRIPTION_STATUS.TRIAL;
export const HOLIDAY_FETCH_DAYS = 10;
export const HOLIDAY_DISPLAY_DAYS = 4;
export const TEMP_PASSWORD_TTL_MS = 60_000;
