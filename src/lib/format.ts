/**
 * Formatting helpers. Timestamps are always rendered in the firm's time zone
 * (not the viewer's or the server's), so server-rendered HTML and the client
 * render produce identical text: no hydration mismatches around midnight.
 */
const FIRM_TIME_ZONE = "Asia/Riyadh";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: FIRM_TIME_ZONE,
});
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: FIRM_TIME_ZONE,
});
// Date-only values ("2026-10-14") have no time zone; format them as-is.
const plainDateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "SAR",
  maximumFractionDigits: 0,
});
const compactCurrencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "SAR",
  notation: "compact",
  maximumFractionDigits: 1,
});
const numberFmt = new Intl.NumberFormat("en-US");

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
export const formatPlainDate = (ymd: string) => plainDateFmt.format(new Date(`${ymd}T00:00:00Z`));
export const formatCurrency = (amount: number) => currencyFmt.format(amount);
export const formatCompactCurrency = (amount: number) => compactCurrencyFmt.format(amount);
export const formatNumber = (n: number) => numberFmt.format(n);

export function formatFileSize(kb: number) {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}
