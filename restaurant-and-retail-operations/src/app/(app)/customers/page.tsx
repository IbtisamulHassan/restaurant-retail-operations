"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, Badge, Button, Modal, Field, Input, Select, Textarea, SearchInput, Pagination, useClientPager, EmptyState, SkeletonRows, toast } from "@/components/ui";
import { fmtBDT, fmtDateTime, fmtDate, STATUS_STYLE } from "@/lib/utils";
import { Plus, Pencil, Trash2, Crown, Award, Medal, Phone, Star, X, Gift, ReceiptText } from "lucide-react";

type CustomerT = {
  id: number; name: string; phone: string; email: string | null; tag: string;
  notes: string | null; lifetimeSpend: number; loyaltyBalance: number; visitCount: number;
  joinedAt: string; tier: string;
};
type Detail = {
  customer: CustomerT;
  orders: { id: number; orderNumber: string; status: string; total: number; createdAt: string; items: { id: number; nameSnapshot: string; qty: number }[] }[];
  ledger: { id: number; type: string; points: number; balanceAfter: number; note: string | null; createdAt: string }[];
  feedback: { id: number; rating: number; comment: string | null; createdAt: string }[];
};

const TIER_ICON: Record<string, React.ReactNode> = {
  Gold: <Crown size={12} />, Silver: <Award size={12} />, Bronze: <Medal size={12} />,
};
const TIER_COLOR: Record<string, string> = { Gold: "gold", Silver: "silver", Bronze: "bronze" };
const TAG_COLOR: Record<string, string> = { VIP: "gold", Regular: "sky", New: "green" };

export default function CustomersPage() {
  const [rows, setRows] = useState<CustomerT[] | null>(null);
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState("ALL");
  const [editor, setEditor] = useState<CustomerT | null | "new">(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [redeemFor, setRedeemFor] = useState<CustomerT | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/customers");
    setRows((await res.json()).customers ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openDetail = async (c: CustomerT) => {
    setDetailLoading(true);
    const res = await fetch("/api/customers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id }),
    });
    const data = await res.json();
    setDetail(data);
    setDetailLoading(false);
  };

  const remove = async (c: CustomerT) => {
    if (!confirm(`Delete customer "${c.name}"?`)) return;
    setRows((prev) => prev?.filter((r) => r.id !== c.id) ?? null);
    const res = await fetch(`/api/customers/${c.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); load(); return; }
    toast.success("Customer deleted");
  };

  const filtered = useMemo(() => {
    let list = rows ?? [];
    if (tagFilter !== "ALL") list = list.filter((r) => r.tag === tagFilter || r.tier === tagFilter);
    if (q) list = list.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()) || r.phone.includes(q));
    return list;
  }, [rows, q, tagFilter]);
  const pager = useClientPager(filtered, 12);

  if (!rows) return <SkeletonRows rows={7} height="h-14" />;

  return (
    <div className="space-y-4 rise-in">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-56"><SearchInput value={q} onChange={setQ} placeholder="Name or phone…" /></div>
        <div className="flex rounded-xl bg-white border border-stone-200 p-1">
          {["ALL", "VIP", "Regular", "New", "Gold", "Silver", "Bronze"].map((tag) => (
            <button key={tag} onClick={() => setTagFilter(tag)}
              className={`text-xs font-bold px-2.5 py-2 rounded-lg transition cursor-pointer ${tagFilter === tag ? "bg-forest text-white" : "text-stone-500 hover:text-ink"}`}>
              {tag}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setEditor("new")}><Plus size={14} /> Add Customer</Button>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="No customers" hint="Customers are added automatically when guests order with a phone number, or add one manually." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-100">
                    <th className="px-5 py-3 font-bold">Customer</th>
                    <th className="px-3 py-3 font-bold">Tag</th>
                    <th className="px-3 py-3 font-bold">Loyalty Tier</th>
                    <th className="px-3 py-3 font-bold text-right">Visits</th>
                    <th className="px-3 py-3 font-bold text-right">Lifetime Spend</th>
                    <th className="px-3 py-3 font-bold text-right">Points</th>
                    <th className="px-5 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {pager.paged.map((c) => (
                    <tr key={c.id} className="hover:bg-cream/40 transition cursor-pointer" onClick={() => openDetail(c)}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="size-8 rounded-full bg-forest text-cream text-[11px] font-bold flex items-center justify-center shrink-0">
                            {c.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                          </span>
                          <div>
                            <p className="font-semibold">{c.name}</p>
                            <p className="text-[11px] text-stone-400 flex items-center gap-1"><Phone size={9} /> {c.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3"><Badge color={TAG_COLOR[c.tag]}>{c.tag}</Badge></td>
                      <td className="px-3 py-3"><Badge color={TIER_COLOR[c.tier]}>{TIER_ICON[c.tier]} {c.tier}</Badge></td>
                      <td className="px-3 py-3 text-right font-medium">{c.visitCount}</td>
                      <td className="px-3 py-3 text-right font-bold">{fmtBDT(c.lifetimeSpend)}</td>
                      <td className="px-3 py-3 text-right font-bold text-saffron">{c.loyaltyBalance}</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setRedeemFor(c)} title="Redeem points" className="p-1.5 rounded-lg text-stone-400 hover:bg-saffron-light hover:text-saffron cursor-pointer"><Gift size={14} /></button>
                        <button onClick={() => setEditor(c)} className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-ink cursor-pointer"><Pencil size={14} /></button>
                        <button onClick={() => remove(c)} className="p-1.5 rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-stone-100"><Pagination {...pager} onPage={pager.setPage} /></div>
          </>
        )}
      </Card>

      {/* editor */}
      {editor && (
        <CustomerEditor cust={editor === "new" ? null : editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); load(); }} />
      )}
      {/* redeem */}
      {redeemFor && (
        <RedeemModal cust={redeemFor} onClose={() => setRedeemFor(null)} onDone={() => { setRedeemFor(null); load(); }} />
      )}
      {/* detail drawer */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-forest-deep/50 backdrop-blur-[2px]" onClick={() => { setDetail(null); }} />
          <div className="absolute right-0 top-0 bottom-0 w-full sm:max-w-xl bg-white shadow-2xl overflow-y-auto rise-in">
            {detailLoading || !detail ? (
              <div className="p-6"><SkeletonRows rows={6} /></div>
            ) : (
              <DetailView detail={detail} onClose={() => setDetail(null)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailView({ detail, onClose }: { detail: Detail; onClose: () => void }) {
  const c = detail.customer;
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="size-12 rounded-2xl bg-forest text-cream font-bold flex items-center justify-center">
            {c.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </span>
          <div>
            <h3 className="font-display text-xl font-semibold">{c.name}</h3>
            <p className="text-sm text-stone-500">{c.phone} · joined {fmtDate(c.joinedAt)}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-stone-100 cursor-pointer"><X size={18} /></button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-cream/70 p-3">
          <p className="text-[10px] uppercase tracking-wide font-bold text-stone-400">Lifetime</p>
          <p className="font-display text-lg font-semibold">{fmtBDT(c.lifetimeSpend)}</p>
        </div>
        <div className="rounded-xl bg-cream/70 p-3">
          <p className="text-[10px] uppercase tracking-wide font-bold text-stone-400">Visits</p>
          <p className="font-display text-lg font-semibold">{c.visitCount}</p>
        </div>
        <div className="rounded-xl bg-saffron-light p-3">
          <p className="text-[10px] uppercase tracking-wide font-bold text-saffron">Points</p>
          <p className="font-display text-lg font-semibold text-saffron">{c.loyaltyBalance}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge color={TAG_COLOR[c.tag]}>{c.tag}</Badge>
        <Badge color={TIER_COLOR[c.tier]}>{TIER_ICON[c.tier]} {c.tier} tier</Badge>
        {c.notes && <span className="text-xs text-stone-400 italic">“{c.notes}”</span>}
      </div>

      <section>
        <h4 className="font-display font-semibold mb-2 flex items-center gap-2"><ReceiptText size={15} /> Order History</h4>
        <div className="rounded-xl border border-stone-200 divide-y divide-stone-50 max-h-56 overflow-y-auto">
          {detail.orders.length === 0 && <p className="text-xs text-stone-400 p-4">No orders yet.</p>}
          {detail.orders.map((o) => (
            <div key={o.id} className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <p className="font-semibold">{o.orderNumber} <span className="font-normal text-stone-400">· {fmtDateTime(o.createdAt)}</span></p>
                <p className="text-[11px] text-stone-400 truncate">{o.items.map((i) => `${i.qty}× ${i.nameSnapshot}`).join(", ")}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold">{fmtBDT(o.total)}</p>
                <Badge className={`${STATUS_STYLE[o.status]?.bg} ${STATUS_STYLE[o.status]?.text}`}>{STATUS_STYLE[o.status]?.label}</Badge>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h4 className="font-display font-semibold mb-2 flex items-center gap-2"><Gift size={15} /> Loyalty Ledger</h4>
        <div className="rounded-xl border border-stone-200 divide-y divide-stone-50 max-h-56 overflow-y-auto">
          {detail.ledger.length === 0 && <p className="text-xs text-stone-400 p-4">No points activity yet.</p>}
          {detail.ledger.map((l) => (
            <div key={l.id} className="px-3.5 py-2.5 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{l.note ?? l.type}</p>
                <p className="text-[11px] text-stone-400">{fmtDateTime(l.createdAt)} · balance {l.balanceAfter}</p>
              </div>
              <span className={`font-bold ${l.points >= 0 ? "text-emerald-600" : "text-rose-500"}`}>{l.points >= 0 ? "+" : ""}{l.points}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h4 className="font-display font-semibold mb-2 flex items-center gap-2"><Star size={15} /> Feedback</h4>
        <div className="space-y-2">
          {detail.feedback.length === 0 && <p className="text-xs text-stone-400">No feedback yet.</p>}
          {detail.feedback.map((f) => (
            <div key={f.id} className="rounded-xl bg-cream/70 p-3 text-sm">
              <div className="flex gap-0.5 text-saffron">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={13} fill={i < f.rating ? "currentColor" : "none"} className={i < f.rating ? "" : "text-stone-300"} />
                ))}
              </div>
              {f.comment && <p className="mt-1 text-stone-600 text-xs">{f.comment}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CustomerEditor({ cust, onClose, onSaved }: { cust: CustomerT | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: cust?.name ?? "", phone: cust?.phone ?? "", email: cust?.email ?? "",
    tag: cust?.tag ?? "New", notes: cust?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim()) return toast.error("Name & phone required");
    setSaving(true);
    const res = await fetch(cust ? `/api/customers/${cust.id}` : "/api/customers", {
      method: cust ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Failed");
    toast.success(cust ? "Customer updated" : "Customer added");
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={cust ? `Edit — ${cust.name}` : "New Customer"}>
      <div className="space-y-3.5">
        <Field label="Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Phone *"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01XXXXXXXXX" /></Field>
          <Field label="Email (optional)"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        </div>
        <Field label="Tag">
          <Select value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })}>
            {["New", "Regular", "VIP"].map((x) => <option key={x}>{x}</option>)}
          </Select>
        </Field>
        <Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Allergies, preferences, catering lead…" /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>{cust ? "Save" : "Create"}</Button>
        </div>
      </div>
    </Modal>
  );
}

function RedeemModal({ cust, onClose, onDone }: { cust: CustomerT; onClose: () => void; onDone: () => void }) {
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const redeem = async () => {
    const p = Number(points);
    if (!p || p <= 0) return toast.error("Enter points to redeem");
    setSaving(true);
    const res = await fetch(`/api/customers/${cust.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "redeem", points: p, note: note || undefined }),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Failed");
    toast.success(`${p} points redeemed — new balance ${data.loyaltyBalance}`);
    onDone();
  };

  return (
    <Modal open onClose={onClose} title={<span className="flex items-center gap-2"><Gift size={17} className="text-saffron" /> Redeem points — {cust.name}</span>}>
      <div className="space-y-3.5">
        <div className="rounded-xl bg-saffron-light p-3.5 text-sm">
          Current balance: <span className="font-bold text-saffron">{cust.loyaltyBalance} points</span>
        </div>
        <Field label="Points to redeem" hint="1 point = ৳1 discount suggestion (label only)">
          <Input type="number" min={1} max={cust.loyaltyBalance} value={points} onChange={(e) => setPoints(e.target.value)} />
        </Field>
        <Field label="Note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Free drink, discount…" /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={redeem} loading={saving}>Redeem</Button>
        </div>
      </div>
    </Modal>
  );
}
