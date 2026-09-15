"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardHeader, Badge, Button, Input, Pagination, useClientPager, EmptyState, SkeletonRows, toast } from "@/components/ui";
import { AreaChartCard, BarChartCard, DonutChartCard } from "@/components/charts";
import { fmtBDT, fmtNum } from "@/lib/utils";
import { Download, FileBarChart, Repeat, Star, Trash2, TrendingUp } from "lucide-react";

type ReportType = "sales" | "profitability" | "customers" | "waste";

type AnyRow = Record<string, string | number>;

type ReportData = {
  rows?: AnyRow[];
  daily?: { date: string; orders: number; revenue: number }[];
  totalRevenue?: number;
  totalQty?: number;
  repeatPurchaseRate?: number;
  totalCustomers?: number;
  totalCost?: number;
  byIngredient?: { name: string; cost: number }[];
  byReason?: { reason: string; cost: number }[];
};

const TABS: { id: ReportType; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: "sales", label: "Sales by Item", desc: "Items sold per day with revenue", icon: <FileBarChart size={15} /> },
  { id: "profitability", label: "Item Profitability", desc: "Margin analysis using recipe costs", icon: <TrendingUp size={15} /> },
  { id: "customers", label: "Customer Report", desc: "Top spenders & repeat-purchase rate", icon: <Repeat size={15} /> },
  { id: "waste", label: "Waste Cost Report", desc: "Waste entries with cost impacts", icon: <Trash2 size={15} /> },
];

function today(offset = 0) {
  return new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [type, setType] = useState<ReportType>("sales");
  const [from, setFrom] = useState(today(-30));
  const [to, setTo] = useState(today());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?type=${type}&from=${from}&to=${to}`);
      setData(await res.json());
    } catch {
      toast.error("Could not load report");
    }
    setLoading(false);
  }, [type, from, to]);
  useEffect(() => { load(); }, [load]);

  const download = () => {
    window.open(`/api/reports?type=${type}&from=${from}&to=${to}&format=csv`, "_blank");
    toast.success("CSV export started");
  };

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const pager = useClientPager(rows, 15);

  return (
    <div className="space-y-4 rise-in">
      {/* controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl bg-white border border-stone-200 p-1 overflow-x-auto">
          {TABS.map((tb) => (
            <button key={tb.id} onClick={() => setType(tb.id)}
              className={`flex items-center gap-1.5 shrink-0 text-xs font-bold px-3 py-2 rounded-lg transition cursor-pointer ${type === tb.id ? "bg-forest text-white" : "text-stone-500 hover:text-ink"}`}>
              {tb.icon} {tb.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="!w-38" />
          <span className="text-stone-400 text-xs">to</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="!w-38" />
        </div>
        <Button variant="secondary" size="sm" onClick={download}><Download size={14} /> CSV</Button>
      </div>

      {loading || !data ? (
        <SkeletonRows rows={8} height="h-16" />
      ) : (
        <>
          <p className="text-xs text-stone-400 -mt-1">{TABS.find((x) => x.id === type)?.desc} · {from} → {to}</p>

          {/* SALES */}
          {type === "sales" && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Stat label="Total Revenue" value={fmtBDT(data.totalRevenue ?? 0)} />
                <Stat label="Items Sold" value={fmtNum(data.totalQty ?? 0, 0)} />
                <Stat label="Days With Sales" value={String(data.daily?.length ?? 0)} />
              </div>
              <Card>
                <CardHeader title="Daily Revenue Trend" sub="Served + completed orders" />
                <div className="px-3 pb-4">
                  <AreaChartCard data={(data.daily ?? []).map((d) => ({ ...d, date: d.date.slice(5) }))} xKey="date" yKey="revenue" yFmt={(v) => `${Math.round(v / 1000)}k`} />
                </div>
              </Card>
              <ReportTable
                headers={["Date", "Item", "Qty Sold", "Revenue"]}
                rows={pager.paged.map((r) => [String(r.date), String(r.item), fmtNum(r.qty, 0), fmtBDT(Number(r.revenue))])}
                rightCols={[2, 3]}
                pager={pager}
              />
            </>
          )}

          {/* PROFITABILITY */}
          {type === "profitability" && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Stat label="Total Revenue" value={fmtBDT(rows.reduce((s, r) => s + Number(r.revenue), 0))} />
                <Stat label="Total Profit" value={fmtBDT(rows.reduce((s, r) => s + Number(r.profit), 0))} />
                <Stat label="Avg Margin" value={`${rows.length ? Math.round(rows.reduce((s, r) => s + Number(r.marginPct), 0) / rows.length) : 0}%`} />
              </div>
              <Card>
                <CardHeader title="Profit by Item" sub="Top items by gross profit (৳)" />
                <div className="px-3 pb-4">
                  <BarChartCard data={rows.slice(0, 10).map((r) => ({ name: String(r.item).length > 14 ? String(r.item).slice(0, 13) + "…" : r.item, profit: r.profit }))} xKey="name" yKey="profit" yFmt={(v) => `${Math.round(v / 1000)}k`} />
                </div>
              </Card>
              <ReportTable
                headers={["Item", "Category", "Price", "Unit Cost", "Qty", "Revenue", "Profit", "Margin %"]}
                rows={pager.paged.map((r) => [
                  String(r.item), String(r.category), fmtBDT(Number(r.price)), fmtBDT(Number(r.unitCost)),
                  fmtNum(r.qty, 0), fmtBDT(Number(r.revenue)), fmtBDT(Number(r.profit)),
                  `${r.marginPct}%`,
                ])}
                rightCols={[2, 3, 4, 5, 6, 7]}
                rowClass={(i) => (Number(pager.paged[i].marginPct) < 20 ? "bg-rose-50/60" : "")}
                pager={pager}
              />
            </>
          )}

          {/* CUSTOMERS */}
          {type === "customers" && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Stat label="Total Customers" value={fmtNum(data.totalCustomers ?? 0, 0)} />
                <Stat label="Repeat-Purchase Rate" value={`${data.repeatPurchaseRate ?? 0}%`} />
                <Stat label="Top Spender" value={rows[0] ? fmtBDT(Number(rows[0].lifetimeSpend)) : "—"} />
              </div>
              <Card>
                <CardHeader title="Top Spenders" sub="Lifetime spend (৳)" />
                <div className="px-3 pb-4">
                  <BarChartCard data={rows.slice(0, 10).map((r) => ({ name: String(r.name).split(" ")[0], spend: r.lifetimeSpend }))} xKey="name" yKey="spend" color="#d97706" yFmt={(v) => `${Math.round(v / 1000)}k`} />
                </div>
              </Card>
              <ReportTable
                headers={["Name", "Phone", "Tag", "Tier", "Visits", "Lifetime Spend", "Points", "Joined"]}
                rows={pager.paged.map((r) => [
                  String(r.name), String(r.phone), String(r.tag), String(r.tier),
                  fmtNum(r.visits, 0), fmtBDT(Number(r.lifetimeSpend)), fmtNum(r.loyaltyBalance, 0), String(r.joinedAt),
                ])}
                rightCols={[4, 5, 6]}
                pager={pager}
              />
            </>
          )}

          {/* WASTE */}
          {type === "waste" && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Stat label="Total Waste Cost" value={fmtBDT(data.totalCost ?? 0)} />
                <Stat label="Entries" value={String(rows.length)} />
                <Stat label="Top Wasted" value={data.byIngredient?.[0]?.name ?? "—"} />
              </div>
              <div className="grid lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader title="Waste by Reason" />
                  <div className="px-3 pb-4">
                    <DonutChartCard data={(data.byReason ?? []).map((r) => ({ name: r.reason, value: r.cost }))} height={200} />
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Top Wasted Ingredients" sub="Cost impact (৳)" />
                  <div className="px-3 pb-4 min-h-[200px]">
                    {(data.byIngredient ?? []).length ? (
                      <BarChartCard data={data.byIngredient!} xKey="name" yKey="cost" color="#e11d48" height={200} />
                    ) : <EmptyState title="No waste in range" />}
                  </div>
                </Card>
              </div>
              <ReportTable
                headers={["Date", "Ingredient", "Qty", "Reason", "Cost Impact"]}
                rows={pager.paged.map((r) => [String(r.date), String(r.ingredient), `${fmtNum(r.qty)} ${r.unit}`, String(r.reason), fmtBDT(Number(r.cost))])}
                rightCols={[2, 4]}
                pager={pager}
              />
            </>
          )}
        </>
      )}
      <p className="text-[11px] text-stone-400 flex items-center gap-1"><Star size={11} /> Export any report as CSV using the button above — opens in Excel/Sheets.</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wide">{label}</p>
      <p className="font-display text-xl font-semibold mt-1 truncate">{value}</p>
    </Card>
  );
}

function ReportTable({ headers, rows, rightCols = [], pager, rowClass }: {
  headers: string[];
  rows: React.ReactNode[][];
  rightCols?: number[];
  pager: ReturnType<typeof useClientPager>;
  rowClass?: (rowIdx: number) => string;
}) {
  return (
    <Card>
      {rows.length === 0 ? (
        <EmptyState title="No data for this range" hint="Try widening the date range." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-100">
                  {headers.map((h, i) => (
                    <th key={h} className={`px-5 py-3 font-bold ${rightCols.includes(i) ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {rows.map((r, ri) => (
                  <tr key={ri} className={`hover:bg-cream/40 transition ${rowClass?.(ri) ?? ""}`}>
                    {r.map((cell, ci) => (
                      <td key={ci} className={`px-5 py-2.5 ${rightCols.includes(ci) ? "text-right font-semibold" : ci === 0 || ci === 1 ? "font-medium" : "text-stone-500"}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-stone-100"><Pagination {...pager} onPage={pager.setPage} /></div>
        </>
      )}
    </Card>
  );
}

void Badge;
