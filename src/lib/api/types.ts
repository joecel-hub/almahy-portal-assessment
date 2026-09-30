/** JSON shapes shared by the REST API and its client. */

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    /** Per-field validation messages, keyed by field name. */
    fields?: Record<string, string[] | undefined>;
  };
};

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  data: T[];
  meta: PageMeta;
};
