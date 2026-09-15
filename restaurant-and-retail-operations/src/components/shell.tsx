"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ClipboardList, UtensilsCrossed, Package, Users,
  TrendingUp, FileBarChart, Settings, LogOut, Flame, Languages, Menu as MenuIcon, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t, Lang } from "@/lib/i18n";
import { Toaster } from "sonner";

export type User = { id: number; name: string; email: string; role: "OWNER" | "STAFF" | "KITCHEN" };

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "en", setLang: () => {} });
export const useLang = () => useContext(LangCtx);

const NAV = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard, roles: ["OWNER", "STAFF", "KITCHEN"] },
  { href: "/orders", key: "orders", icon: ClipboardList, roles: ["OWNER", "STAFF", "KITCHEN"] },
  { href: "/menu", key: "menuRecipes", icon: UtensilsCrossed, roles: ["OWNER", "STAFF"] },
  { href: "/ingredients", key: "ingredients", icon: Package, roles: ["OWNER", "STAFF"] },
  { href: "/customers", key: "customers", icon: Users, roles: ["OWNER", "STAFF"] },
  { href: "/forecasting", key: "forecasting", icon: TrendingUp, roles: ["OWNER", "STAFF"] },
  { href: "/reports", key: "reports", icon: FileBarChart, roles: ["OWNER"] },
  { href: "/settings", key: "settings", icon: Settings, roles: ["OWNER"] },
] as const;

const ROLE_STYLE: Record<string, string> = {
  OWNER: "bg-saffron/20 text-saffron border-saffron/30",
  STAFF: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  KITCHEN: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

export default function Shell({ user, businessName, children }: { user: User; businessName: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>("en");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem("restoops-lang") as Lang) || "en";
    setLangState(saved);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("restoops-lang", l);
  };

  useEffect(() => setMobileOpen(false), [pathname]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const visibleNav = NAV.filter((n) => (n.roles as readonly string[]).includes(user.role));
  const pageTitle = NAV.find((n) => pathname.startsWith(n.href));

  const sidebar = (
    <div className="flex flex-col h-full bg-forest text-cream">
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <div className="size-10 rounded-xl bg-saffron flex items-center justify-center text-forest-deep font-display text-xl font-bold">
          <Flame size={20} strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p className="font-display font-semibold text-base leading-tight truncate">{businessName}</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-cream/50">RestOps · Bangladesh</p>
        </div>
      </div>
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {visibleNav.map((n) => {
          const active = pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active ? "bg-cream/15 text-white shadow-inner" : "text-cream/60 hover:text-cream hover:bg-cream/5"
              )}
            >
              <n.icon size={17} strokeWidth={active ? 2.4 : 2} />
              <span className="truncate">{t(n.key, lang)}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-3 pb-5 space-y-2">
        <div className="rounded-xl bg-cream/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-[11px] text-cream/50 truncate">{user.email}</p>
            </div>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide", ROLE_STYLE[user.role])}>
              {user.role}
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-cream/60 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
        >
          <LogOut size={16} /> {t("logout", lang)}
        </button>
      </div>
    </div>
  );

  return (
    <LangCtx.Provider value={{ lang, setLang }}>
      <Toaster richColors position="top-right" toastOptions={{ style: { borderRadius: 12 } }} />
      <div className="min-h-screen lg:flex">
        {/* desktop sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 no-print">{sidebar}</aside>

        {/* mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-forest-deep/60" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 top-0 bottom-0 w-72 rise-in">{sidebar}</div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* topbar */}
          <header className="sticky top-0 z-30 bg-cream/85 backdrop-blur-md border-b border-stone-200/70 no-print">
            <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
              <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-stone-200/60 cursor-pointer">
                <MenuIcon size={20} />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-xl sm:text-2xl font-semibold text-ink truncate">
                  {pageTitle ? t(pageTitle.key, lang) : "Dashboard"}
                </h1>
              </div>
              <button
                onClick={() => setLang(lang === "en" ? "bn" : "en")}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full bg-white border border-stone-300 hover:border-leaf hover:text-leaf transition cursor-pointer"
                title="Bangla / English"
              >
                <Languages size={14} />
                {lang === "en" ? "বাং" : "EN"}
              </button>
              <div className="hidden sm:flex items-center gap-2 text-xs font-semibold bg-white border border-stone-300 rounded-full pl-1 pr-3 py-1">
                <span className="size-6 rounded-full bg-leaf text-white flex items-center justify-center text-[10px]">
                  {user.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                {user.name.split(" ")[0]}
              </div>
            </div>
          </header>
          <main className="px-4 sm:px-6 py-6 max-w-[1400px] mx-auto">{children}</main>
        </div>
      </div>
    </LangCtx.Provider>
  );
}

export function MobileNavClose() {
  return <X size={18} />;
}
