"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, Badge, Button, Modal, Field, Input, Select, SearchInput, Pagination, useClientPager, EmptyState, SkeletonRows, toast } from "@/components/ui";
import { fmtBDT, fmtNum } from "@/lib/utils";
import { Plus, Pencil, Trash2, Package, AlertTriangle, CalendarClock, Boxes } from "lucide-react";

type IngredientT = {
  id: number; name: string; unit: string; costPerUnit: number; stockQty: number;
  lowStockThreshold: number; expiryDate: string | null; supplier: string | null;
  lowStock: boolean; nearExpiry: boolean; expired: boolean; stockValue: number;
};

const UNITS = ["kg", "g", "l", "ml", "pcs"];

export default function IngredientsPage() {
  const [rows, setRows] = useState<IngredientT[] | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"ALL" | "LOW" | "EXPIRING">("ALL");
  const [editor, setEditor] = useState<IngredientT | null | "new">(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/ingredients");
    setRows((await res.json()).ingredients ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (ing: IngredientT) => {
    if (!confirm(`Delete "${ing.name}"? It will be removed from all recipes.`)) return;
    setRows((prev) => prev?.filter((r) => r.id !== ing.id) ?? null);
    const res = await fetch(`/api/ingredients/${ing.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); load(); return; }
    toast.success("Ingredient deleted");
  };

  const filtered = useMemo(() => {
    let list = rows ?? [];
    if (filter === "LOW") list = list.filter((r) => r.lowStock);
    if (filter === "EXPIRING") list = list.filter((r) => r.nearExpiry);
    if (q) list = list.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()) || (r.supplier ?? "").toLowerCase().includes(q.toLowerCase()));
    return list;
  }, [rows, q, filter]);
  const pager = useClientPager(filtered, 12);

  const summary = useMemo(() => {
    const list = rows ?? [];
    return {
      total: list.length,
      low: list.filter((r) => r.lowStock).length,
      expiring: list.filter((r) => r.nearExpiry).length,
      value: list.reduce((s, r) => s + r.stockValue, 0),
    };
  }, [rows]);

  if (!rows) return <SkeletonRows rows={7} height="h-14" />;

  return (
    <div className="space-y-4 rise-in">
      {/* summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Ingredients", value: String(summary.total), icon: Package, tone: "text-leaf bg-leaf-light" },
          { label: "Stock Value", value: fmtBDT(summary.value), icon: Boxes, tone: "text-saffron bg-saffron-light" },
          { label: "Low Stock", value: String(summary.low), icon: AlertTriangle, tone: "text-rose-600 bg-rose-50" },
          { label: "Near Expiry", value: String(summary.expiring), icon: CalendarClock, tone: "text-amber-600 bg-amber-50" },
        ].map((s) => (
          <Card key={s.label} className="p-4 flex items-center gap-3">
            <div className={`size-9 rounded-xl flex items-center justify-center ${s.tone}`}><s.icon size={17} /></div>
            <div>
              <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wide">{s.label}</p>
              <p className="font-display text-lg font-semibold leading-tight">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-56"><SearchInput value={q} onChange={setQ} placeholder="Search ingredients…" /></div>
        <div className="flex rounded-xl bg-white border border-stone-200 p-1">
          {(["ALL", "LOW", "EXPIRING"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs font-bold px-3 py-2 rounded-lg transition cursor-pointer ${filter === f ? "bg-forest text-white" : "text-stone-500 hover:text-ink"}`}>
              {f === "ALL" ? "All" : f === "LOW" ? "Low stock" : "Expiring"}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setEditor("new")}><Plus size={14} /> Add Ingredient</Button>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="No ingredients found" hint="Add an ingredient to start costing recipes." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-100">
                    <th className="px-5 py-3 font-bold">Ingredient</th>
                    <th className="px-3 py-3 font-bold">Unit</th>
                    <th className="px-3 py-3 font-bold text-right">Cost / Unit</th>
                    <th className="px-3 py-3 font-bold text-right">Stock</th>
                    <th className="px-3 py-3 font-bold">Expiry</th>
                    <th className="px-3 py-3 font-bold">Supplier</th>
                    <th className="px-3 py-3 font-bold text-right">Value</th>
                    <th className="px-5 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {pager.paged.map((r) => {
                    const pct = Math.min(100, Math.round((r.stockQty / Math.max(r.lowStockThreshold * 3, 0.001)) * 100));
                    return (
                      <tr key={r.id} className="hover:bg-cream/40 transition">
                        <td className="px-5 py-3">
                          <p className="font-semibold">{r.name}</p>
                          {r.lowStock && <Badge color="red" className="mt-0.5"><AlertTriangle size={9} /> Low stock</Badge>}
                        </td>
                        <td className="px-3 py-3 text-stone-500">{r.unit}</td>
                        <td className="px-3 py-3 text-right font-medium">{fmtBDT(r.costPerUnit, true)}</td>
                        <td className="px-3 py-3 text-right w-40">
                          <p className="font-bold">{fmtNum(r.stockQty)} <span className="text-[10px] text-stone-400 font-normal">/ min {fmtNum(r.lowStockThreshold)}</span></p>
                          <div className="h-1.5 bg-stone-100 rounded-full mt-1 overflow-hidden">
                            <div className={`h-full rounded-full ${r.lowStock ? "bg-rose-500" : pct < 60 ? "bg-amber-500" : "bg-leaf"}`} style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {r.expiryDate ? (
                            <Badge color={r.expired ? "red" : r.nearExpiry ? "amber" : "stone"}>
                              <CalendarClock size={10} /> {r.expiryDate}
                            </Badge>
                          ) : <span className="text-xs text-stone-300">—</span>}
                        </td>
                        <td className="px-3 py-3 text-xs text-stone-500 max-w-[160px] truncate">{r.supplier ?? "—"}</td>
                        <td className="px-3 py-3 text-right font-bold">{fmtBDT(r.stockValue)}</td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <button onClick={() => setEditor(r)} className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-ink cursor-pointer"><Pencil size={14} /></button>
                          <button onClick={() => remove(r)} className="p-1.5 rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-stone-100">
              <Pagination {...pager} onPage={pager.setPage} />
            </div>
          </>
        )}
      </Card>

      {editor && (
        <IngredientEditor ing={editor === "new" ? null : editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); load(); }} />
      )}
    </div>
  );
}

function IngredientEditor({ ing, onClose, onSaved }: { ing: IngredientT | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: ing?.name ?? "", unit: ing?.unit ?? "kg",
    costPerUnit: ing ? String(ing.costPerUnit) : "", stockQty: ing ? String(ing.stockQty) : "",
    lowStockThreshold: ing ? String(ing.lowStockThreshold) : "", expiryDate: ing?.expiryDate ?? "",
    supplier: ing?.supplier ?? "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    setSaving(true);
    const payload = {
      ...form,
      costPerUnit: Number(form.costPerUnit) || 0,
      stockQty: Number(form.stockQty) || 0,
      lowStockThreshold: form.lowStockThreshold === "" ? undefined : Number(form.lowStockThreshold),
      expiryDate: form.expiryDate || null,
    };
    const res = await fetch(ing ? `/api/ingredients/${ing.id}` : "/api/ingredients", {
      method: ing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Failed");
    toast.success(ing ? "Ingredient updated" : "Ingredient added");
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={ing ? `Edit — ${ing.name}` : "New Ingredient"}>
      <div className="space-y-3.5">
        <Field label="Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Rui Fish" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Unit">
            <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </Select>
          </Field>
          <Field label="Cost per unit (BDT)">
            <Input type="number" min={0} step="any" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Current stock">
            <Input type="number" min={0} step="any" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} />
          </Field>
          <Field label="Low-stock threshold" hint="Leave empty to use the default from Settings">
            <Input type="number" min={0} step="any" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Expiry date (perishables)">
            <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
          </Field>
          <Field label="Supplier">
            <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Karwan Bazar…" />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>{ing ? "Save" : "Create"}</Button>
        </div>
      </div>
    </Modal>
  );
}
