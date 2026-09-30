import type {
  CasePriority,
  CaseStatus,
  FeeType,
  PracticeArea,
} from "@/lib/domain";

/** Row shape returned by GET /api/cases (and prefetched on the server). */
export type CaseListItem = {
  id: number;
  ref: string;
  title: string;
  status: CaseStatus;
  priority: CasePriority;
  practiceArea: PracticeArea;
  feeType: FeeType;
  feeAmount: number;
  openedAt: string;
  dueDate: string | null;
  client: { id: number; name: string };
  assignee: { id: number; name: string } | null;
};

export type Assignee = { id: number; name: string; title: string };
