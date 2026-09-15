"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardHeader, Badge, Button, Modal, Field, Input, Select, SearchInput, Pagination, useClientPager, EmptyState, SkeletonRows, toast } from "@/components/ui";
import { BarChartCard, DonutChartCard, AreaChartCard } from "@/components/charts";
import { fmtBDT, fmtNum } from "@/lib/utils";
import { Plus, Trash2, TrendingUp, ShoppingCart, Info, Truck, TriangleAlert } from "lucide-react";

type ForecastRow = {
  menuItemId: number; name: string; nameBn: string | null; category: string; price: number;
  perDay: { date: string; dow: number; label: string; estQty: number }[];
  total7: number; estRevenue7: number;
};
type PurchaseRow = {
  ingredientId: number; name: string; unit: string; required: number; inStock: number;
  toBuy: number; estCost: number; supplier: string | null; lowStock: boolean;
};
type WasteRow = {
  id: number; ingredientId: number; ingredientName: string; qty: number; unit: string;
  reason: string; costImpact: number; loggedAt: string;
};
type IngredientLite = { id: number; name: string; unit: string };

type ForecastData = {
  days: { date: string; dow: number; label: string }[];
  forecast: ForecastRow[];
  purchaseList: PurchaseRow[];
  wasteSummary: { total: number; byReason: { reason: string; cost: number }[] };
};

type Tab = "forecast" | "purchase" | "waste";

export default function ForecastingPage() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [waste, setWaste] = useState<WasteRow[] | null>(null);
  const [ingredients, setIngredients] = useState<IngredientLite[]>([]);
  const [tab, setTab] = useState<Tab>("forecast");
  const [wasteOpen, setWasteOpen] = useState(false);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    const [f, w, i] = await Promise.all([
      fetch("/api/forecast"),
      fetch(`/api/waste-logs?from=${from}&to=${to}`),
      fetch("/api/ingredients"),
    ]);
    setData(await f.json());
    setWaste((await w.json()).wasteLogs ?? []);
    setIngredients(((await i.json()).ingredients ?? []).map((x: { id: number; name: string; unit: string }) => ({ id: x.id, name: x.name, unit: x.unit })));
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  const removeWaste = async (row: WasteRow) => {
    if (!confirm(`Delete waste entry for ${row.ingredientName}?`)) return;
    setWaste((prev) => prev?.filter((w) => w.id !== row.id) ?? null);
    const res = await fetch(`/api/waste-logs/${row.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); load(); return; }
    toast.success("Waste entry deleted");
  };

  const filteredPurchase = useMemo(() => {
    let list = data?.purchaseList ?? [];
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || (p.supplier ?? "").toLowerCase().includes(q.toLowerCase()));
    return list;
  }, [data, q]);
  const purchPager = useClientPager(filteredPurchase, 10);
  const wastePager = useClientPager(waste ?? [], 10);

  // waste trend by day
  const wasteTrend = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of waste ?? []) map.set(w.loggedAt, (map.get(w.loggedAt) ?? 0) + w.costImpact);
    return [...map.entries()].map(([date, cost]) => ({ date: date.slice(5), cost: Math.round(cost) })).sort((a, b) => a.date.localeCompare(b.date));
  }, [waste]);
  const topWasted = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of waste ?? []) map.set(w.ingredientName, (map.get(w.ingredientName) ?? 0) + w.costImpact);
    return [...map.entries()].map(([name, cost]) => ({ name, cost: Math.round(cost) })).sort((a, b) => b.cost - a.cost).slice(0, 6);
  }, [waste]);
  const wasteTotal = (waste ?? []).reduce((s, w) => s + w.costImpact, 0);

  if (!data || !waste) return <SkeletonRows rows={6} height="h-20" />;

  return (
    <div className="space-y-4 rise-in">
      {/* disclaimer */}
      <div className="rounded-2xl bg-sky-50 border border-sky-200 px-4 py-3 flex items-start gap-2.5 text-xs text-sky-800">
        <Info size={15} className="shrink-0 mt-0.5" />
        <p>
          <b>Forecast values are estimates.</b> Projections use a day-of-week moving average of your recent sales
          history. In a production deployment, this module would call a dedicated ML/AI forecasting service
          (e.g. a hosted time-series model) for richer, weather- and season-aware predictions.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl bg-white border border-stone-200 p-1">
          {([["forecast", "Demand Forecast"], ["purchase", "Purchase List"], ["waste", "Waste Tracking"]] as [Tab, string][]).map(([v, label]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`text-xs font-bold px-3 py-2 rounded-lg transition cursor-pointer ${tab === v ? "bg-forest text-white" : "text-stone-500 hover:text-ink"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {tab === "purchase" && <div className="w-52"><SearchInput value={q} onChange={setQ} placeholder="Search ingredients…" /></div>}
        {tab === "waste" && (
          <>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="!w-38" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="!w-38" />
            <Button size="sm" onClick={() => setWasteOpen(true)}><Plus size={14} /> Log Waste</Button>
          </>
        )}
      </div>

      {/* ------------------------------- FORECAST ------------------------------ */}
      {tab === "forecast" && (
        <Card>
          <CardHeader
            title={<span className="flex items-center gap-2"><TrendingUp size={17} className="text-leaf" /> Next 7 Days — Estimated Demand</span>}
            sub="Day-of-week moving average per item · figures are estimates"
          />
          <div className="overflow-x-auto px-2 pb-4">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-100">
                  <th className="px-3 py-2.5 font-bold">Menu Item</th>
                  {data.days.map((d) => <th key={d.date} className="px-2 py-2.5 font-bold text-center">{d.label}</th>)}
                  <th className="px-3 py-2.5 font-bold text-right">7-day total</th>
                  <th className="px-3 py-2.5 font-bold text-right">Est. revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {data.forecast.slice(0, 15).map((f) => (
                  <tr key={f.menuItemId} className="hover:bg-cream/40 transition">
                    <td className="px-3 py-2.5">
                      <p className="font-semibold">{f.name}</p>
                      <p className="text-[10px] text-stone-400">{f.category}</p>
                    </td>
                    {f.perDay.map((d) => (
                      <td key={d.date} className="px-2 py-2.5 text-center">
                        <span className={`inline-block min-w-8 rounded-lg px-1.5 py-1 text-xs font-bold ${d.estQty >= 5 ? "bg-leaf-light text-leaf" : d.estQty > 0 ? "bg-cream-dark text-stone-600" : "text-stone-300"}`}>
                          {fmtNum(d.estQty, 1)}
                        </span>
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right font-bold">{fmtNum(f.total7, 1)}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-emerald-700">{fmtBDT(f.estRevenue7)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.forecast.length === 0 && <EmptyState title="Not enough sales history" hint="Completed orders feed this forecast automatically." />}
          </div>
        </Card>
      )}

      {/* ------------------------------ PURCHASE LIST --------------------------- */}
      {tab === "purchase" && (
        <Card>
          <CardHeader
            title={<span className="flex items-center gap-2"><ShoppingCart size={17} className="text-leaf" /> Suggested Purchase List</span>}
            sub="Forecast demand rolled up through recipes, compared against current stock"
            action={
              <Badge color="green">
                Total est. spend: {fmtBDT(filteredPurchase.reduce((s, p) => s + p.estCost, 0))}
              </Badge>
            }
          />
          {filteredPurchase.length === 0 ? (
            <EmptyState title="Nothing to buy" hint="Forecast demand is covered by your current stock." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-100">
                      <th className="px-5 py-3 font-bold">Ingredient</th>
                      <th className="px-3 py-3 font-bold text-right">Needed (7d)</th>
                      <th className="px-3 py-3 font-bold text-right">In Stock</th>
                      <th className="px-3 py-3 font-bold text-right">To Buy</th>
                      <th className="px-3 py-3 font-bold text-right">Est. Cost</th>
                      <th className="px-5 py-3 font-bold">Supplier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {purchPager.paged.map((p) => (
                      <tr key={p.ingredientId} className="hover:bg-cream/40 transition">
                        <td className="px-5 py-3">
                          <span className="font-semibold flex items-center gap-2">
                            {p.name}
                            {p.lowStock && <Badge color="red"><TriangleAlert size={9} /> low</Badge>}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">{fmtNum(p.required)} {p.unit}</td>
                        <td className="px-3 py-3 text-right text-stone-500">{fmtNum(p.inStock)} {p.unit}</td>
                        <td className="px-3 py-3 text-right">
                          <span className={`font-bold ${p.toBuy > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                            {p.toBuy > 0 ? `+${fmtNum(p.toBuy)} ${p.unit}` : "covered"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-bold">{p.estCost > 0 ? fmtBDT(p.estCost) : "—"}</td>
                        <td className="px-5 py-3 text-xs text-stone-500">
                          <span className="inline-flex items-center gap-1"><Truck size={12} /> {p.supplier ?? "—"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-stone-100"><Pagination {...purchPager} onPage={purchPager.setPage} /></div>
            </>
          )}
        </Card>
      )}

      {/* --------------------------------- WASTE -------------------------------- */}
      {tab === "waste" && (
        <div className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="p-5 bg-gradient-to-br from-rose-600 to-rose-500 text-white border-0">
              <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Waste Cost ({from} → {to})</p>
              <p className="font-display text-3xl font-semibold mt-2">{fmtBDT(wasteTotal)}</p>
              <p className="text-white/70 text-xs mt-1">{(waste ?? []).length} entries in range</p>
            </Card>
            <Card>
              <CardHeader title="By Reason" />
              <div className="px-3 pb-4">
                <DonutChartCard data={(data.wasteSummary.byReason ?? []).map((r) => ({ name: r.reason, value: r.cost }))} height={180} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Top Wasted Ingredients" sub="In selected range" />
              <div className="px-3 pb-4 min-h-[180px]">
                {topWasted.length ? <BarChartCard data={topWasted} xKey="name" yKey="cost" color="#e11d48" height={180} /> : <EmptyState title="No waste in range" />}
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Waste Log" sub={`${waste?.length ?? 0} entries`} action={
              <div className="w-56"><SearchInput value={q} onChange={setQ} placeholder="Filter…" /></div>
            } />
            {(() => {
              const filtered = (waste ?? []).filter((w) => !q || w.ingredientName.toLowerCase().includes(q.toLowerCase()));
              const pager = wastePager;
              const list = q ? filtered.slice((pager.page - 1) * 10, pager.page * 10) : pager.paged;
              return filtered.length === 0 ? (
                <EmptyState title="No waste logged" hint="Log expired, over-produced or spilled ingredients to track cost impact." action={<Button size="sm" onClick={() => setWasteOpen(true)}><Plus size={14} /> Log Waste</Button>} />
              ) : (
                <>
                  {wasteTrend.length > 1 && (
                    <div className="px-3 pb-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-3 mb-1">Daily waste cost trend (৳)</p>
                      <AreaChartCard data={wasteTrend} xKey="date" yKey="cost" color="#e11d48" height={140} />
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-100">
                          <th className="px-5 py-3 font-bold">Date</th>
                          <th className="px-3 py-3 font-bold">Ingredient</th>
                          <th className="px-3 py-3 font-bold text-right">Qty</th>
                          <th className="px-3 py-3 font-bold">Reason</th>
                          <th className="px-3 py-3 font-bold text-right">Cost Impact</th>
                          <th className="px-5 py-3 font-bold text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-50">
                        {list.map((w) => (
                          <tr key={w.id} className="hover:bg-cream/40 transition">
                            <td className="px-5 py-3 text-stone-500">{w.loggedAt}</td>
                            <td className="px-3 py-3 font-semibold">{w.ingredientName}</td>
                            <td className="px-3 py-3 text-right">{fmtNum(w.qty)} {w.unit}</td>
                            <td className="px-3 py-3">
                              <Badge color={w.reason === "EXPIRED" ? "red" : w.reason === "OVERPRODUCTION" ? "amber" : "stone"}>{w.reason}</Badge>
                            </td>
                            <td className="px-3 py-3 text-right font-bold text-rose-600">-{fmtBDT(w.costImpact)}</td>
                            <td className="px-5 py-3 text-right">
                              <button onClick={() => removeWaste(w)} className="p-1.5 rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-5 py-3 border-t border-stone-100">
                    <Pagination page={pager.page} pages={Math.max(1, Math.ceil(filtered.length / 10))} total={filtered.length} onPage={pager.setPage} />
                  </div>
                </>
              );
            })()}
          </Card>
        </div>
      )}

      {wasteOpen && (
        <WasteModal ingredients={ingredients} onClose={() => setWasteOpen(false)} onSaved={() => { setWasteOpen(false); load(); toast.success("Waste logged — stock adjusted"); }} />
      )}
    </div>
  );
}

function WasteModal({ ingredients, onClose, onSaved }: { ingredients: IngredientLite[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    ingredientId: ingredients[0]?.id ?? 0, qty: "", reason: "EXPIRED",
    loggedAt: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!(Number(form.qty) > 0)) return toast.error("Enter a quantity");
    setSaving(true);
    const res = await fetch("/api/waste-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Failed");
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Log Waste">
      <div className="space-y-3.5">
        <Field label="Ingredient">
          <Select value={form.ingredientId} onChange={(e) => setForm({ ...form, ingredientId: Number(e.target.value) })}>
            {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Quantity wasted">
            <Input type="number" min={0} step="any" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} placeholder="0.5" />
          </Field>
          <Field label="Date">
            <Input type="date" value={form.loggedAt} onChange={(e) => setForm({ ...form, loggedAt: e.target.value })} />
          </Field>
        </div>
        <Field label="Reason">
          <Select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
            <option value="EXPIRED">Expired</option>
            <option value="OVERPRODUCTION">Overproduction</option>
            <option value="SPILLAGE">Spillage</option>
            <option value="OTHER">Other</option>
          </Select>
        </Field>
        <p className="text-[11px] text-stone-400">Cost impact is auto-calculated from the ingredient&apos;s unit cost and stock is reduced accordingly.</p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>Log Waste</Button>
        </div>
      </div>
    </Modal>
  );
}
