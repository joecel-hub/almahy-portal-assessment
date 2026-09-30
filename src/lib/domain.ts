/**
 * Domain vocabulary shared by the database schema, validation, API and UI.
 * Defining each list once (as a readonly tuple) means a new status is added in
 * one place and TypeScript flags every switch/label map that must handle it.
 */

export const ROLES = ["admin", "manager", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const CLIENT_TYPES = ["individual", "company"] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];

export const CASE_STATUSES = ["intake", "open", "in_progress", "on_hold", "closed"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CASE_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type CasePriority = (typeof CASE_PRIORITIES)[number];

export const PRACTICE_AREAS = [
  "corporate",
  "litigation",
  "real_estate",
  "employment",
  "family",
  "intellectual_property",
] as const;
export type PracticeArea = (typeof PRACTICE_AREAS)[number];

export const FEE_TYPES = ["fixed", "hourly", "retainer"] as const;
export type FeeType = (typeof FEE_TYPES)[number];

export const CONSULTATION_MODES = ["in_person", "video", "phone"] as const;
export type ConsultationMode = (typeof CONSULTATION_MODES)[number];

export const CONSULTATION_STATUSES = ["scheduled", "completed", "cancelled", "no_show"] as const;
export type ConsultationStatus = (typeof CONSULTATION_STATUSES)[number];

export const DOCUMENT_KINDS = ["contract", "pleading", "evidence", "correspondence", "memo"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const ACTIVITY_TYPES = [
  "created",
  "status_changed",
  "priority_changed",
  "assigned",
  "updated",
  "note",
  "document_added",
  "consultation_scheduled",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

// Human-readable labels. `Record<Union, string>` makes a missing label a type error.
export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  intake: "Intake",
  open: "Open",
  in_progress: "In progress",
  on_hold: "On hold",
  closed: "Closed",
};

export const CASE_PRIORITY_LABELS: Record<CasePriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const PRACTICE_AREA_LABELS: Record<PracticeArea, string> = {
  corporate: "Corporate",
  litigation: "Litigation",
  real_estate: "Real estate",
  employment: "Employment",
  family: "Family",
  intellectual_property: "Intellectual property",
};

export const FEE_TYPE_LABELS: Record<FeeType, string> = {
  fixed: "Fixed fee",
  hourly: "Hourly",
  retainer: "Monthly retainer",
};

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  individual: "Individual",
  company: "Company",
};

export const CONSULTATION_MODE_LABELS: Record<ConsultationMode, string> = {
  in_person: "In person",
  video: "Video call",
  phone: "Phone",
};

export const CONSULTATION_STATUS_LABELS: Record<ConsultationStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  contract: "Contract",
  pleading: "Pleading",
  evidence: "Evidence",
  correspondence: "Correspondence",
  memo: "Memo",
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  manager: "Case manager",
  viewer: "Viewer",
};
