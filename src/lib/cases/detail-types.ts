import type {
  ActivityType,
  CasePriority,
  CaseStatus,
  ClientType,
  ConsultationMode,
  ConsultationStatus,
  DocumentKind,
  FeeType,
  PracticeArea,
} from "@/lib/domain";

/** Response of GET /api/cases/[id]: the case with everything the detail page shows. */
export type CaseDetail = {
  id: number;
  ref: string;
  title: string;
  description: string;
  status: CaseStatus;
  priority: CasePriority;
  practiceArea: PracticeArea;
  courtName: string | null;
  opposingParty: string | null;
  feeType: FeeType;
  feeAmount: number;
  openedAt: string;
  dueDate: string | null;
  closedAt: string | null;
  updatedAt: string;
  assignee: { id: number; name: string; title: string } | null;
  client: {
    id: number;
    type: ClientType;
    name: string;
    contactName: string | null;
    crNumber: string | null;
    email: string;
    phone: string;
    city: string;
  };
  consultations: {
    id: number;
    subject: string;
    scheduledAt: string;
    mode: ConsultationMode;
    status: ConsultationStatus;
    lawyerName: string | null;
  }[];
  documents: {
    id: number;
    name: string;
    kind: DocumentKind;
    sizeKb: number;
    uploadedAt: string;
    uploadedBy: string | null;
  }[];
  activity: {
    id: number;
    type: ActivityType;
    message: string;
    createdAt: string;
    actorName: string | null;
  }[];
  relatedCases: { id: number; ref: string; title: string; status: CaseStatus; openedAt: string }[];
};
