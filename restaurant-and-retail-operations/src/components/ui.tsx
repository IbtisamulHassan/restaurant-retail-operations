"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Search, X, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { toast as sonnerToast } from "sonner";

export const toast = sonnerToast;

/* --------------------------------- Button --------------------------------- */
export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success" | "dark";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] cursor-pointer",
        size === "sm" && "text-xs px-2.5 py-1.5",
        size === "md" && "text-sm px-4 py-2.5",
        size === "lg" && "text-base px-5 py-3",
        variant === "primary" && "bg-leaf text-white hover:bg-forest shadow-sm shadow-leaf/30",
        variant === "secondary" && "bg-white text-ink border border-stone-300 hover:border-leaf hover:text-leaf",
        variant === "ghost" && "text-stone-500 hover:bg-stone-100 hover:text-ink",
        variant === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
        variant === "success" && "bg-emerald-600 text-white hover:bg-emerald-700",
        variant === "dark" && "bg-forest text-cream hover:bg-forest-deep",
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <span className="size-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}

/* ---------------------------------- Card ---------------------------------- */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("bg-white rounded-2xl border border-stone-200/80 shadow-[0_1px_3px_rgba(28,43,35,0.06)]", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, sub, action }: { title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div>
        <h3 className="font-display font-semibold text-lg text-ink">{title}</h3>
        {sub && <p className="text-xs text-stone-500 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------------------------------- Badge --------------------------------- */
export function Badge({ children, color = "stone", className }: { children: ReactNode; color?: string; className?: string }) {
  const colors: Record<string, string> = {
    stone: "bg-stone-100 text-stone-600",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-rose-50 text-rose-700",
    sky: "bg-sky-50 text-sky-700",
    violet: "bg-violet-50 text-violet-700",
    teal: "bg-teal-50 text-teal-700",
    gold: "bg-yellow-100 text-yellow-800",
    silver: "bg-slate-200 text-slate-700",
    bronze: "bg-orange-100 text-orange-800",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold", colors[color] ?? colors.stone, className)}>
      {children}
    </span>
  );
}

/* ---------------------------------- Modal --------------------------------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-forest-deep/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={cn(
          "relative bg-white w-full rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col rise-in",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-ink cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ---------------------------------- Field --------------------------------- */
export function Field({ label, children, hint }: { label: ReactNode; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-stone-600 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-stone-400 mt-1">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-leaf/30 focus:border-leaf transition";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(inputClass, "cursor-pointer", props.className)}>
      {children}
    </select>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClass, "min-h-[72px]", props.className)} />;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 cursor-pointer"
    >
      <span className={cn("w-10 h-6 rounded-full transition-colors relative", checked ? "bg-leaf" : "bg-stone-300")}>
        <span className={cn("absolute top-1 size-4 bg-white rounded-full shadow transition-all", checked ? "left-5" : "left-1")} />
      </span>
      {label && <span className="text-sm text-stone-600">{label}</span>}
    </button>
  );
}

/* ------------------------------- Empty state ------------------------------- */
export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-6">
      <div className="size-12 rounded-2xl bg-cream-dark flex items-center justify-center text-stone-400 mb-3">
        <Inbox size={22} />
      </div>
      <p className="font-semibold text-stone-600">{title}</p>
      {hint && <p className="text-xs text-stone-400 mt-1 max-w-xs">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* -------------------------------- Skeletons -------------------------------- */
export function SkeletonRows({ rows = 5, height = "h-14" }: { rows?: number; height?: string }) {
  return (
    <div className="space-y-2.5 p-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={cn("skeleton w-full", height)} />
      ))}
    </div>
  );
}

export function SkeletonCards({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="skeleton h-28" />
      ))}
    </div>
  );
}

/* ---------------------------- Search + pagination --------------------------- */
export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search…"}
        className={cn(inputClass, "pl-9")}
      />
    </div>
  );
}

export function Pagination({
  page,
  pages,
  onPage,
  total,
}: {
  page: number;
  pages: number;
  onPage: (p: number) => void;
  total: number;
}) {
  if (pages <= 1) return <p className="text-xs text-stone-400 px-1">{total} records</p>;
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs text-stone-400">
        Page {page} of {pages} · {total} records
      </p>
      <div className="flex gap-1">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft size={14} />
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}

export function useClientPager<T>(rows: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [pages, page]);
  const paged = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page, pageSize]);
  return { page, setPage, pages, paged, total: rows.length };
}

/* --------------------------------- Spinner --------------------------------- */
export function Spinner({ className }: { className?: string }) {
  return <span className={cn("inline-block size-5 border-2 border-leaf/30 border-t-leaf rounded-full animate-spin", className)} />;
}
