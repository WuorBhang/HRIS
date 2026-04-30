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
  MONTHLY_RECORDS: "monthly_records",
  ACTIVITY_LOGS: "activity_logs",
};

// Categories shown in the document upload dropdown. The values are the
// machine-readable strings stored in Firestore; the labels are what the
// user sees.
export const DOCUMENT_CATEGORIES = [
  { value: "contract", label: "Contract" },
  { value: "payslip", label: "Payslip" },
  { value: "id", label: "ID / Passport" },
  { value: "policy", label: "Policy" },
  { value: "other", label: "Other" },
];

// Top-level document "kinds" — re-exported here so UI files can import the
// catalogue + their human-readable labels from a single place. The source
// of truth for the values is `src/lib/documents.js`.
export const DOCUMENT_TYPES = Object.freeze({
  PAYSLIP: "payslip",
  STATUTORY: "statutory",
  PAYROLL_SUMMARY: "payroll_summary",
  CONTRACT: "contract",
  ID: "id",
  POLICY: "policy",
  OTHER: "other",
});

export const DOCUMENT_TYPE_LABELS = Object.freeze({
  [DOCUMENT_TYPES.CONTRACT]: "Contract",
  [DOCUMENT_TYPES.PAYSLIP]: "Payslip",
  [DOCUMENT_TYPES.STATUTORY]: "Statutory filing",
  [DOCUMENT_TYPES.PAYROLL_SUMMARY]: "Payroll summary",
  [DOCUMENT_TYPES.ID]: "ID / Passport",
  [DOCUMENT_TYPES.POLICY]: "Policy",
  [DOCUMENT_TYPES.OTHER]: "Other",
});

// 25 MB cap on uploaded documents. Anything bigger should go through the
// admin team out-of-band.
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export const LEAVE_TYPES = ["Annual", "Sick", "Unpaid", "Compassionate"];

// Contract types shown in the admin "New contract" modal.
export const CONTRACT_TYPES = [
  "Permanent",
  "Fixed-term",
  "Casual",
  "Probation",
  "Internship",
];

// We always *fetch / detect* upcoming holidays this many days ahead so the
// app knows about them in advance, but we only *show* them in the dashboard
// widget when they fall within the display window.
export const HOLIDAY_FETCH_WINDOW_DAYS = 10;
export const HOLIDAY_DISPLAY_WINDOW_DAYS = 4;

// Kept for backwards compatibility with anything still importing this name.
export const UPCOMING_HOLIDAY_WINDOW_DAYS = HOLIDAY_DISPLAY_WINDOW_DAYS;

export const TEMP_PASSWORD_TTL_MS = 60 * 1000;
