import {
  createLoader,
  createSerializer,
  parseAsArrayOf,
  parseAsInteger,
  parseAsNumberLiteral,
  parseAsString,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server";
import { CASE_PRIORITIES, CASE_STATUSES, PRACTICE_AREAS } from "@/lib/domain";

/**
 * The case list's filters live in the URL: /cases?q=smith&status=open,on_hold&sort=openedAt&page=2
 *
 * These parsers are the single definition of that URL contract, shared by:
 *  - the page (Server Component) to prefetch the first result,
 *  - the REST API route to read the query string,
 *  - the table (Client Component) to read and update the URL.
 * Unknown or malformed values fall back to defaults instead of erroring.
 */
export const CASE_SORT_FIELDS = ["openedAt", "ref", "title", "priority", "status", "feeAmount", "dueDate"] as const;
export type CaseSortField = (typeof CASE_SORT_FIELDS)[number];
export const PAGE_SIZES = [10, 20, 50] as const;

export const caseSearchParams = {
  q: parseAsString.withDefault(""),
  status: parseAsArrayOf(parseAsStringLiteral(CASE_STATUSES)).withDefault([]),
  priority: parseAsArrayOf(parseAsStringLiteral(CASE_PRIORITIES)).withDefault([]),
  area: parseAsArrayOf(parseAsStringLiteral(PRACTICE_AREAS)).withDefault([]),
  sort: parseAsStringLiteral(CASE_SORT_FIELDS).withDefault("openedAt"),
  order: parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc"),
  page: parseAsInteger.withDefault(1),
  size: parseAsNumberLiteral(PAGE_SIZES).withDefault(10),
};

export type CaseListParams = inferParserType<typeof caseSearchParams>;

export const loadCaseSearchParams = createLoader(caseSearchParams);

/** Builds "?q=…&status=…" (defaults omitted) for API calls and links. */
export const serializeCaseSearchParams = createSerializer(caseSearchParams);
