import {
  createLoader,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server";
import { CLIENT_TYPES, CONSULTATION_STATUSES, DOCUMENT_KINDS } from "@/lib/domain";

/** URL contracts for the read-mostly list pages (rendered on the server). */

const common = {
  q: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
};

export const clientListParams = { ...common, type: parseAsStringLiteral(CLIENT_TYPES) };
export const consultationListParams = {
  page: common.page,
  when: parseAsStringLiteral(["upcoming", "past"] as const).withDefault("upcoming"),
  status: parseAsStringLiteral(CONSULTATION_STATUSES),
};
export const documentListParams = { ...common, kind: parseAsStringLiteral(DOCUMENT_KINDS) };

export const loadClientListParams = createLoader(clientListParams);
export const loadConsultationListParams = createLoader(consultationListParams);
export const loadDocumentListParams = createLoader(documentListParams);

export type ClientListParams = inferParserType<typeof clientListParams>;
export type ConsultationListParams = inferParserType<typeof consultationListParams>;
export type DocumentListParams = inferParserType<typeof documentListParams>;

export const LIST_PAGE_SIZE = 15;
