export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const bdtFmt = new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 });
const bdtFmt2 = new Intl.NumberFormat("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function fmtBDT(n: number | string | null | undefined, decimals = false) {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return "৳0";
  return "৳" + (decimals ? bdtFmt2.format(v) : bdtFmt.format(Math.round(v)));
}

export function fmtNum(n: number | string | null | undefined, max = 2) {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("en-BD", { maximumFractionDigits: max }).format(v);
}

export function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return `${fmtDate(d)}, ${fmtTime(d)}`;
}

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "SERVED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const NEXT_STATUS: Record<string, string | null> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "READY",
  READY: "SERVED",
  SERVED: "COMPLETED",
  COMPLETED: null,
  CANCELLED: null,
};

export const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  PENDING: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Pending" },
  CONFIRMED: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500", label: "Confirmed" },
  PREPARING: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500", label: "Preparing" },
  READY: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Ready" },
  SERVED: { bg: "bg-teal-50", text: "text-teal-700", dot: "bg-teal-500", label: "Served" },
  COMPLETED: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", label: "Completed" },
  CANCELLED: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", label: "Cancelled" },
};

export const REVENUE_STATUSES = ["SERVED", "COMPLETED"] as const;

export function todayStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function tierForSpend(spend: number, silver: number, gold: number) {
  if (spend >= gold) return "Gold";
  if (spend >= silver) return "Silver";
  return "Bronze";
}

export function paginate<T>(rows: T[], page: number, pageSize: number) {
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(Math.max(1, page), pages);
  return { rows: rows.slice((p - 1) * pageSize, p * pageSize), total, pages, page: p };
}
