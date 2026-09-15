"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, Badge, Button, Modal, Field, Input, Select, Textarea, Toggle, SearchInput, Pagination, useClientPager, EmptyState, SkeletonRows, toast } from "@/components/ui";
import { fmtBDT, fmtNum } from "@/lib/utils";
import { Plus, Pencil, Trash2, UtensilsCrossed, Clock, ChefHat, AlertTriangle } from "lucide-react";

type RecipeLine = { id?: number; ingredientId: number; ingredientName: string; unit: string; qtyPerServing: number; lineCost: number };
type MenuItemT = {
  id: number; nameEn: string; nameBn: string | null; category: string; description: string | null;
  price: number; imageUrl: string | null; isAvailable: boolean; prepTimeMinutes: number;
  recipe: RecipeLine[]; costPerItem: number; grossMargin: number; marginPct: number; lowMargin: boolean;
};
type IngredientLite = { id: number; name: string; unit: string; costPerUnit: number };

const CATEGORIES = ["Rice & Biryani", "Curry & Bhuna", "Snacks & Street Food", "Fast Food", "Sides", "Drinks", "Grocery", "Dessert"];

export default function MenuPage() {
  const [items, setItems] = useState<MenuItemT[] | null>(null);
  const [ingredients, setIngredients] = useState<IngredientLite[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("ALL");
  const [editor, setEditor] = useState<MenuItemT | null | "new">(null);

  const load = useCallback(async () => {
    const [m, i] = await Promise.all([fetch("/api/menu-items"), fetch("/api/ingredients")]);
    setItems((await m.json()).items ?? []);
    setIngredients((await i.json()).ingredients ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleAvailability = async (item: MenuItemT) => {
    // optimistic
    setItems((prev) => prev?.map((m) => (m.id === item.id ? { ...m, isAvailable: !m.isAvailable } : m)) ?? null);
    const res = await fetch(`/api/menu-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    });
    if (!res.ok) { toast.error("Failed to update"); load(); return; }
    toast.success(`${item.nameEn} ${!item.isAvailable ? "available" : "hidden"}`);
  };

  const remove = async (item: MenuItemT) => {
    if (!confirm(`Delete "${item.nameEn}"? This also removes its recipe.`)) return;
    setItems((prev) => prev?.filter((m) => m.id !== item.id) ?? null);
    const res = await fetch(`/api/menu-items/${item.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); load(); return; }
    toast.success("Menu item deleted");
  };

  const filtered = useMemo(() => {
    let rows = items ?? [];
    if (cat !== "ALL") rows = rows.filter((m) => m.category === cat);
    if (q) rows = rows.filter((m) => (m.nameEn + " " + (m.nameBn ?? "")).toLowerCase().includes(q.toLowerCase()));
    return rows;
  }, [items, q, cat]);
  const pager = useClientPager(filtered, 12);
  const categories = useMemo(() => ["ALL", ...new Set((items ?? []).map((m) => m.category))], [items]);

  if (!items) return <SkeletonRows rows={6} height="h-20" />;

  return (
    <div className="space-y-4 rise-in">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-56"><SearchInput value={q} onChange={setQ} placeholder="Search items…" /></div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`shrink-0 text-xs font-bold px-3 py-2 rounded-full border transition cursor-pointer ${cat === c ? "bg-forest text-white border-forest" : "bg-white border-stone-300 text-stone-500 hover:border-leaf"}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setEditor("new")}><Plus size={14} /> Add Item</Button>
      </div>

      {filtered.length === 0 ? (
        <Card><EmptyState title="No menu items" hint="Add your first dish with name, price and a recipe." action={<Button size="sm" onClick={() => setEditor("new")}><Plus size={14} /> Add Item</Button>} /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {pager.paged.map((m) => (
            <Card key={m.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-11 rounded-xl bg-gradient-to-br from-leaf-light to-saffron-light flex items-center justify-center text-leaf shrink-0">
                    <UtensilsCrossed size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-semibold leading-tight truncate">{m.nameEn}</p>
                    {m.nameBn && <p className="text-xs text-stone-500 truncate" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>{m.nameBn}</p>}
                  </div>
                </div>
                <Badge color="stone">{m.category}</Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center rounded-xl bg-cream/70 py-2.5">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-stone-400 font-bold">Price</p>
                  <p className="text-sm font-bold">{fmtBDT(m.price)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-stone-400 font-bold">Cost</p>
                  <p className="text-sm font-bold">{fmtBDT(m.costPerItem)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-stone-400 font-bold">Margin</p>
                  <p className={`text-sm font-bold ${m.lowMargin ? "text-rose-600" : "text-emerald-700"}`}>
                    {m.recipe.length ? `${fmtBDT(m.grossMargin)} · ${Math.round(m.marginPct)}%` : "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] text-stone-400"><Clock size={11} /> {m.prepTimeMinutes} min</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-stone-400"><ChefHat size={11} /> {m.recipe.length} ingredients</span>
                {m.lowMargin && <Badge color="red"><AlertTriangle size={10} /> Low margin</Badge>}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100 mt-auto">
                <Toggle checked={m.isAvailable} onChange={() => toggleAvailability(m)} label={m.isAvailable ? "Available" : "Hidden"} />
                <div className="flex gap-1">
                  <button onClick={() => setEditor(m)} className="p-2 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-ink cursor-pointer"><Pencil size={15} /></button>
                  <button onClick={() => remove(m)} className="p-2 rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"><Trash2 size={15} /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Pagination {...pager} onPage={pager.setPage} />

      {editor && (
        <MenuEditor
          item={editor === "new" ? null : editor}
          ingredients={ingredients}
          onClose={() => setEditor(null)}
          onSaved={() => { setEditor(null); load(); }}
        />
      )}
    </div>
  );
}

/* ------------------------------- editor modal ------------------------------ */
type LineDraft = { ingredientId: number; qty: string };

function MenuEditor({ item, ingredients, onClose, onSaved }: {
  item: MenuItemT | null; ingredients: IngredientLite[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    nameEn: item?.nameEn ?? "", nameBn: item?.nameBn ?? "", category: item?.category ?? CATEGORIES[0],
    description: item?.description ?? "", price: item ? String(item.price) : "",
    prepTimeMinutes: item ? String(item.prepTimeMinutes) : "15", isAvailable: item?.isAvailable ?? true,
  });
  const [lines, setLines] = useState<LineDraft[]>(
    item?.recipe.map((r) => ({ ingredientId: r.ingredientId, qty: String(r.qtyPerServing) })) ?? []
  );
  const [saving, setSaving] = useState(false);

  const ingMap = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const cost = lines.reduce((s, l) => s + (ingMap.get(l.ingredientId)?.costPerUnit ?? 0) * (Number(l.qty) || 0), 0);
  const price = Number(form.price) || 0;
  const margin = price - cost;
  const marginPct = price > 0 ? (margin / price) * 100 : 0;

  const save = async () => {
    if (!form.nameEn.trim()) return toast.error("English name required");
    setSaving(true);
    const payload = {
      ...form,
      price: Number(form.price) || 0,
      prepTimeMinutes: Number(form.prepTimeMinutes) || 15,
      recipe: lines.filter((l) => l.ingredientId && Number(l.qty) > 0).map((l) => ({ ingredientId: l.ingredientId, qtyPerServing: Number(l.qty) })),
    };
    const res = await fetch(item ? `/api/menu-items/${item.id}` : "/api/menu-items", {
      method: item ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Failed");
    toast.success(item ? "Menu item updated" : "Menu item created");
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={item ? `Edit — ${item.nameEn}` : "New Menu Item"} wide>
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Name (English) *">
              <Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} placeholder="Chicken Tehari" />
            </Field>
            <Field label="Name (বাংলা)">
              <Input value={form.nameBn} onChange={(e) => setForm({ ...form, nameBn: e.target.value })} placeholder="চিকেন তেহারি" style={{ fontFamily: "'Hind Siliguri', sans-serif" }} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Category">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {[...new Set([...CATEGORIES, form.category])].map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Prep time (minutes)">
              <Input type="number" min={0} value={form.prepTimeMinutes} onChange={(e) => setForm({ ...form, prepTimeMinutes: e.target.value })} />
            </Field>
          </div>
          <Field label="Selling price (BDT) *">
            <Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="220" />
          </Field>
          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short, appetising description…" />
          </Field>
          <Toggle checked={form.isAvailable} onChange={(v) => setForm({ ...form, isAvailable: v })} label="Visible on the digital menu" />

          {/* live costing panel */}
          <div className="rounded-2xl bg-forest text-cream p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.15em] text-cream/50 font-bold">Live Cost Engineering</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-cream/50">Cost / item</p>
                <p className="font-display text-lg font-semibold">{fmtBDT(cost)}</p>
              </div>
              <div>
                <p className="text-[10px] text-cream/50">Gross margin</p>
                <p className="font-display text-lg font-semibold">{fmtBDT(margin)}</p>
              </div>
              <div>
                <p className="text-[10px] text-cream/50">Margin %</p>
                <p className={`font-display text-lg font-semibold ${marginPct < 20 ? "text-rose-300" : "text-emerald-300"}`}>{price ? `${marginPct.toFixed(1)}%` : "—"}</p>
              </div>
            </div>
            {price > 0 && marginPct < 20 && (
              <p className="text-[11px] text-amber-300 flex items-center gap-1"><AlertTriangle size={11} /> Below the default 20% margin-alert threshold</p>
            )}
          </div>
        </div>

        {/* recipe lines */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-stone-600">Recipe — ingredients per serving</p>
            <Button variant="secondary" size="sm" onClick={() => setLines((l) => [...l, { ingredientId: ingredients[0]?.id ?? 0, qty: "" }])}>
              <Plus size={13} /> Line
            </Button>
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {lines.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-stone-200 p-6 text-center text-xs text-stone-400">
                No recipe lines — the item will show no cost data until you add ingredients.
              </div>
            )}
            {lines.map((l, idx) => {
              const ing = ingMap.get(l.ingredientId);
              return (
                <div key={idx} className="flex items-center gap-2 rounded-xl bg-cream/70 p-2">
                  <select
                    value={l.ingredientId}
                    onChange={(e) => setLines((arr) => arr.map((x, i) => (i === idx ? { ...x, ingredientId: Number(e.target.value) } : x)))}
                    className="flex-1 min-w-0 rounded-lg border border-stone-300 bg-white px-2 py-2 text-xs cursor-pointer"
                  >
                    {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                  </select>
                  <input
                    type="number" min={0} step="any" value={l.qty} placeholder="Qty"
                    onChange={(e) => setLines((arr) => arr.map((x, i) => (i === idx ? { ...x, qty: e.target.value } : x)))}
                    className="w-20 rounded-lg border border-stone-300 px-2 py-2 text-xs"
                  />
                  <span className="text-[11px] text-stone-400 w-16 text-right shrink-0">
                    {ing ? fmtBDT(ing.costPerUnit * (Number(l.qty) || 0)) : "—"}
                  </span>
                  <button onClick={() => setLines((arr) => arr.filter((_, i) => i !== idx))} className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50 cursor-pointer">
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-stone-400 mt-2">
            Quantities are in each ingredient&apos;s base unit (kg / l / pcs). e.g. 0.22 kg chicken per plate.
          </p>
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-stone-100">
            <p className="text-sm font-semibold">Total cost: <span className="font-display">{fmtBDT(cost)}</span></p>
            <Button onClick={save} loading={saving}>{item ? "Save changes" : "Create item"}</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

void fmtNum;
