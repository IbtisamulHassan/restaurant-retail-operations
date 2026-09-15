"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, Badge, SkeletonCards, EmptyState } from "@/components/ui";
import { BarChartCard, AreaChartCard } from "@/components/charts";
import { fmtBDT, fmtTime, STATUS_STYLE } from "@/lib/utils";
import { useLang } from "@/components/shell";
import { t } from "@/lib/i18n";
import {
  Banknote, ShoppingBag, AlertTriangle, TrendingDown, Trash2, Star,
  ArrowRight, ReceiptText, Flame,
} from "lucide-react";

type DashboardData = {
  kpis: {
    todaysSales: number;
    ordersToday: number;
    activeOrders: number;
    topItems: { id: number; name: string; qty: number; revenue: number }[];
    lowStock: { id: number; name: string; stockQty: number; lowStockThreshold: number; unit: string }[];
    lowMarginItems: { id: number; name: string; marginPct: number; price: number }[];
    wasteCostWeek: number;
    pointsToday: number;
  };
  salesByDow: number[];
  ordersByHour: number[];
  recentOrders: {
    id: number; orderNumber: string; total: number; status: string;
    createdAt: string; tableName: string | null; orderType: string;
  }[];
  recentWaste: {
    id: number; ingredientName: string; qty: number; unit: string;
    reason: string; costImpact: number; loggedAt: string;
  }[];
  businessName: string;
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DashboardPage() {
  const { lang } = useLang();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) {
    return (
      <div className="space-y-6">
        <SkeletonCards cards={4} />
        <SkeletonCards cards={3} />
      </div>
    );
  }

  const { kpis } = data;
  const dowData = DOW.map((d, i) => ({ day: d, Sales: Math.round(data.salesByDow[i]) }));
  const hourData = data.ordersByHour
    .map((v, h) => ({ hour: `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`, Orders: v }))
    .filter((_, h) => h >= 8 && h <= 23);

  return (
    <div className="space-y-6 rise-in">
      {/* headline KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-5 bg-gradient-to-br from-forest to-leaf text-white border-0">
          <div className="flex items-center justify-between">
            <p className="text-cream/70 text-xs font-semibold uppercase tracking-wider">{t("todaysSales", lang)}</p>
            <Banknote size={18} className="text-saffron" />
          </div>
          <p className="font-display text-3xl font-semibold mt-2">{fmtBDT(kpis.todaysSales)}</p>
          <p className="text-cream/60 text-xs mt-1">{kpis.activeOrders} active now</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-stone-500 text-xs font-semibold uppercase tracking-wider">{t("ordersToday", lang)}</p>
            <ShoppingBag size={18} className="text-sky-600" />
          </div>
          <p className="font-display text-3xl font-semibold mt-2">{kpis.ordersToday}</p>
          <Link href="/orders" className="text-xs text-leaf font-semibold mt-1 inline-flex items-center gap-1 hover:underline">
            View queue <ArrowRight size={12} />
          </Link>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-stone-500 text-xs font-semibold uppercase tracking-wider">{t("wasteWeek", lang)}</p>
            <Trash2 size={18} className="text-rose-500" />
          </div>
          <p className="font-display text-3xl font-semibold mt-2">{fmtBDT(kpis.wasteCostWeek)}</p>
          <Link href="/forecasting" className="text-xs text-leaf font-semibold mt-1 inline-flex items-center gap-1 hover:underline">
            Waste report <ArrowRight size={12} />
          </Link>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-stone-500 text-xs font-semibold uppercase tracking-wider">{t("pointsToday", lang)}</p>
            <Star size={18} className="text-amber-500" />
          </div>
          <p className="font-display text-3xl font-semibold mt-2">{kpis.pointsToday}</p>
          <Link href="/customers" className="text-xs text-leaf font-semibold mt-1 inline-flex items-center gap-1 hover:underline">
            Loyalty ledger <ArrowRight size={12} />
          </Link>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* top items */}
        <Card>
          <CardHeader title={t("topItems", lang)} sub="By quantity sold (all time)" action={<Flame size={16} className="text-saffron" />} />
          <div className="px-5 pb-4 space-y-2.5">
            {kpis.topItems.length === 0 && <EmptyState title="No sales yet" />}
            {kpis.topItems.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className={`size-6 rounded-lg text-[11px] font-bold flex items-center justify-center ${i === 0 ? "bg-saffron text-white" : "bg-cream-dark text-stone-500"}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{item.name}</p>
                  <div className="h-1.5 bg-stone-100 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-leaf rounded-full" style={{ width: `${Math.min(100, (item.qty / kpis.topItems[0].qty) * 100)}%` }} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{item.qty}×</p>
                  <p className="text-[10px] text-stone-400">{fmtBDT(item.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* low stock */}
        <Card>
          <CardHeader
            title={<span className="flex items-center gap-2">{t("lowStock", lang)}{kpis.lowStock.length > 0 && <Badge color="red">{kpis.lowStock.length}</Badge>}</span>}
            sub="At or below threshold"
            action={<AlertTriangle size={16} className="text-amber-500" />}
          />
          <div className="px-5 pb-4 space-y-2">
            {kpis.lowStock.length === 0 && <EmptyState title="All stocked up" hint="No ingredient is below its low-stock threshold." />}
            {kpis.lowStock.slice(0, 6).map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-2 py-1 border-b border-stone-50 last:border-0">
                <p className="text-sm font-medium truncate">{i.name}</p>
                <Badge color={i.stockQty === 0 ? "red" : "amber"}>
                  {i.stockQty} / {i.lowStockThreshold} {i.unit}
                </Badge>
              </div>
            ))}
            {kpis.lowStock.length > 6 && (
              <Link href="/ingredients" className="text-xs text-leaf font-semibold inline-flex items-center gap-1 hover:underline">
                +{kpis.lowStock.length - 6} more <ArrowRight size={12} />
              </Link>
            )}
          </div>
        </Card>

        {/* low margin */}
        <Card>
          <CardHeader title={t("lowMargin", lang)} sub="Below margin alert threshold" action={<TrendingDown size={16} className="text-rose-500" />} />
          <div className="px-5 pb-4 space-y-2">
            {kpis.lowMarginItems.length === 0 && <EmptyState title="Margins look healthy" hint="No menu item is under the margin alert threshold." />}
            {kpis.lowMarginItems.slice(0, 6).map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 py-1 border-b border-stone-50 last:border-0">
                <p className="text-sm font-medium truncate">{m.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">{fmtBDT(m.price)}</span>
                  <Badge color="red">{m.marginPct}%</Badge>
                </div>
              </div>
            ))}
            {kpis.lowMarginItems.length > 6 && (
              <Link href="/menu" className="text-xs text-leaf font-semibold inline-flex items-center gap-1 hover:underline">
                Open menu costing <ArrowRight size={12} />
              </Link>
            )}
          </div>
        </Card>
      </div>

      {/* charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Sales by Day of Week" sub="Total revenue (৳) across all history" />
          <div className="px-3 pb-4">
            <BarChartCard data={dowData} xKey="day" yKey="Sales" yFmt={(v) => `${Math.round(v / 1000)}k`} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Orders by Hour" sub="Lunch & dinner peaks across all history" />
          <div className="px-3 pb-4">
            <AreaChartCard data={hourData} xKey="hour" yKey="Orders" color="#d97706" />
          </div>
        </Card>
      </div>

      {/* activity feed */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Recent Orders" sub="Latest activity" action={<ReceiptText size={16} className="text-stone-400" />} />
          <div className="px-5 pb-4 divide-y divide-stone-50">
            {data.recentOrders.map((o) => (
              <div key={o.id} className="py-2.5 flex items-center gap-3">
                <span className={`size-2 rounded-full shrink-0 ${STATUS_STYLE[o.status]?.dot} ${["PENDING", "CONFIRMED", "PREPARING"].includes(o.status) ? "pulse-dot" : ""}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">
                    {o.orderNumber}
                    <span className="text-stone-400 font-normal"> · {o.tableName ?? o.orderType}</span>
                  </p>
                  <p className="text-[11px] text-stone-400">{fmtTime(o.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{fmtBDT(o.total)}</p>
                  <Badge color="stone">{STATUS_STYLE[o.status]?.label}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Recent Waste Entries" sub="Latest logged waste" action={<Trash2 size={16} className="text-stone-400" />} />
          <div className="px-5 pb-4 divide-y divide-stone-50">
            {data.recentWaste.length === 0 && <EmptyState title="No waste logged" />}
            {data.recentWaste.map((w) => (
              <div key={w.id} className="py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{w.ingredientName}</p>
                  <p className="text-[11px] text-stone-400">
                    {w.qty} {w.unit} · {w.loggedAt}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-rose-600">-{fmtBDT(w.costImpact)}</p>
                  <Badge color="stone">{w.reason}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
