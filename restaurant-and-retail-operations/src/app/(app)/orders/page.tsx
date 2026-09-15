"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, Badge, Button, Modal, Field, Select, Input, SearchInput, Pagination, useClientPager, EmptyState, SkeletonRows, toast } from "@/components/ui";
import { fmtBDT, fmtTime, STATUS_STYLE, NEXT_STATUS } from "@/lib/utils";
import { useLang } from "@/components/shell";
import {
  RefreshCw, Clock, Plus, UtensilsCrossed, ShoppingBag, Bike, Ban,
  CheckCircle2, ChefHat, BellRing, HandPlatter, Wallet, LayoutGrid, List,
} from "lucide-react";

type OrderItemT = { id: number; nameSnapshot: string; qty: number; unitPrice: number; lineTotal: number; notes: string | null };
type OrderT = {
  id: number; orderNumber: string; status: string; orderType: string;
  tableName: string | null; customerPhone: string | null; customerName: string | null;
  paymentMethod: string; subtotal: number; total: number; pointsEarned: number;
  createdAt: string; updatedAt: string;
  items: OrderItemT[];
  events: { status: string; createdAt: string }[];
};
type MenuItemLite = { id: number; nameEn: string; price: number; isAvailable: boolean };
type TableLite = { id: number; name: string; status: string };

const STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING: <BellRing size={14} />, CONFIRMED: <CheckCircle2 size={14} />, PREPARING: <ChefHat size={14} />,
  READY: <UtensilsCrossed size={14} />, SERVED: <HandPlatter size={14} />, COMPLETED: <CheckCircle2 size={14} />, CANCELLED: <Ban size={14} />,
};
const NEXT_LABEL: Record<string, string> = {
  PENDING: "Confirm", CONFIRMED: "Start Preparing", PREPARING: "Mark Ready", READY: "Mark Served", SERVED: "Complete",
};
const TYPE_ICON: Record<string, React.ReactNode> = {
  DINE_IN: <UtensilsCrossed size={13} />, TAKEAWAY: <ShoppingBag size={13} />, DELIVERY: <Bike size={13} />,
};

function age(createdAt: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function OrdersPage() {
  useLang();
  const [orders, setOrders] = useState<OrderT[] | null>(null);
  const [userRole, setUserRole] = useState<string>("STAFF");
  const [view, setView] = useState<"board" | "list">("board");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [q, setQ] = useState("");
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [newOpen, setNewOpen] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  const load = useCallback(async (silent = false) => {
    try {
      const [res, me] = await Promise.all([fetch("/api/orders"), fetch("/api/auth/me")]);
      const data = await res.json();
      const meData = await me.json();
      setOrders(data.orders ?? []);
      setUserRole(meData.user?.role ?? "STAFF");
      setLastSync(new Date());
      if (!silent) toast.success("Orders synced");
    } catch {
      if (!silent) toast.error("Could not load orders");
    }
  }, []);

  useEffect(() => {
    load(true);
    const iv = setInterval(() => load(true), 10000);
    return () => clearInterval(iv);
  }, [load]);

  const updateStatus = async (order: OrderT, next: string) => {
    // optimistic update
    setOrders((prev) => prev?.map((o) => (o.id === order.id ? { ...o, status: next } : o)) ?? null);
    setPendingIds((s) => new Set(s).add(order.id));
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`${order.orderNumber} → ${STATUS_STYLE[next]?.label}`, {
        description: next === "COMPLETED" ? "Loyalty points & stock updated" : undefined,
      });
      load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
      load(true);
    } finally {
      setPendingIds((s) => {
        const n = new Set(s);
        n.delete(order.id);
        return n;
      });
    }
  };

  const active = useMemo(() => (orders ?? []).filter((o) => ["PENDING", "CONFIRMED", "PREPARING", "READY"].includes(o.status)), [orders]);
  const filtered = useMemo(() => {
    let rows = orders ?? [];
    if (statusFilter !== "ALL") rows = rows.filter((o) => o.status === statusFilter);
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter(
        (o) => o.orderNumber.toLowerCase().includes(needle) || (o.customerPhone ?? "").includes(needle) || (o.customerName ?? "").toLowerCase().includes(needle)
      );
    }
    return rows;
  }, [orders, statusFilter, q]);
  const pager = useClientPager(filtered, 12);

  if (orders === null) return <SkeletonRows rows={6} height="h-24" />;

  const boardCols = ["PENDING", "CONFIRMED", "PREPARING", "READY"] as const;

  return (
    <div className="space-y-4 rise-in">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl bg-white border border-stone-200 p-1">
          {(["board", "list"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition cursor-pointer ${view === v ? "bg-forest text-white" : "text-stone-500 hover:text-ink"}`}
            >
              {v === "board" ? <LayoutGrid size={14} /> : <List size={14} />}
              {v === "board" ? "Kitchen Queue" : "All Orders"}
            </button>
          ))}
        </div>
        {view === "list" && (
          <>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="!w-40">
              <option value="ALL">All statuses</option>
              {Object.keys(STATUS_STYLE).map((s) => <option key={s} value={s}>{STATUS_STYLE[s].label}</option>)}
            </Select>
            <div className="w-48">
              <SearchInput value={q} onChange={setQ} placeholder="Order # / phone…" />
            </div>
          </>
        )}
        <div className="flex-1" />
        <span className="text-[11px] text-stone-400 hidden sm:inline">Synced {fmtTime(lastSync)}</span>
        <Button variant="secondary" size="sm" onClick={() => load()}>
          <RefreshCw size={14} /> Refresh
        </Button>
        {userRole !== "KITCHEN" && (
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus size={14} /> New Order
          </Button>
        )}
      </div>

      {view === "board" ? (
        /* ------------------------------ KITCHEN BOARD ----------------------------- */
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 items-start">
          {boardCols.map((col) => {
            const colOrders = active.filter((o) => o.status === col);
            return (
              <div key={col} className="rounded-2xl bg-white/60 border border-stone-200/70 min-h-[200px]">
                <div className={`flex items-center justify-between px-3.5 py-3 border-b border-stone-100`}>
                  <span className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${STATUS_STYLE[col].text}`}>
                    <span className={`size-2 rounded-full ${STATUS_STYLE[col].dot} ${col === "PENDING" ? "pulse-dot" : ""}`} />
                    {STATUS_STYLE[col].label}
                  </span>
                  <Badge>{colOrders.length}</Badge>
                </div>
                <div className="p-2.5 space-y-2.5">
                  {colOrders.length === 0 && (
                    <p className="text-center text-xs text-stone-300 py-8">No orders</p>
                  )}
                  {colOrders.map((o) => (
                    <OrderCard key={o.id} order={o} pending={pendingIds.has(o.id)} onAdvance={() => updateStatus(o, NEXT_STATUS[o.status]!)} onCancel={() => updateStatus(o, "CANCELLED")} showCancel={userRole !== "KITCHEN"} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ------------------------------- LIST VIEW -------------------------------- */
        <Card>
          {filtered.length === 0 ? (
            <EmptyState title="No orders found" hint="Try a different filter or search." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-100">
                      <th className="px-5 py-3 font-bold">Order</th>
                      <th className="px-3 py-3 font-bold">Type</th>
                      <th className="px-3 py-3 font-bold">Items</th>
                      <th className="px-3 py-3 font-bold">Payment</th>
                      <th className="px-3 py-3 font-bold">Status</th>
                      <th className="px-3 py-3 font-bold text-right">Total</th>
                      <th className="px-5 py-3 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {pager.paged.map((o) => (
                      <tr key={o.id} className="hover:bg-cream/40 transition">
                        <td className="px-5 py-3">
                          <p className="font-bold">{o.orderNumber}</p>
                          <p className="text-[11px] text-stone-400">{fmtTime(o.createdAt)}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600">
                            {TYPE_ICON[o.orderType]} {o.tableName ?? o.orderType}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-stone-500 max-w-[220px]">
                          <span className="line-clamp-2">{o.items.map((i) => `${i.qty}× ${i.nameSnapshot}`).join(", ")}</span>
                        </td>
                        <td className="px-3 py-3"><Badge color="stone"><Wallet size={10} />{o.paymentMethod}</Badge></td>
                        <td className="px-3 py-3">
                          <Badge className={`${STATUS_STYLE[o.status].bg} ${STATUS_STYLE[o.status].text}`}>
                            {STATUS_ICON[o.status]} {STATUS_STYLE[o.status].label}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-right font-bold">{fmtBDT(o.total)}</td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          {NEXT_STATUS[o.status] && (
                            <Button size="sm" variant={o.status === "PENDING" ? "primary" : "secondary"} loading={pendingIds.has(o.id)} onClick={() => updateStatus(o, NEXT_STATUS[o.status]!)}>
                              {NEXT_LABEL[o.status]}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-stone-100">
                <Pagination {...pager} onPage={pager.setPage} />
              </div>
            </>
          )}
        </Card>
      )}

      <NewOrderModal open={newOpen} onClose={() => setNewOpen(false)} onCreated={() => { setNewOpen(false); load(true); }} />
    </div>
  );
}

function OrderCard({ order, pending, onAdvance, onCancel, showCancel }: {
  order: OrderT; pending: boolean; onAdvance: () => void; onCancel: () => void; showCancel: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left px-3.5 pt-3 pb-2 cursor-pointer">
        <div className="flex items-center justify-between">
          <p className="font-display font-bold text-ink">{order.orderNumber}</p>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">
            <Clock size={11} /> {age(order.createdAt)}
          </span>
        </div>
        <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1 font-semibold">
          {TYPE_ICON[order.orderType]} {order.tableName ?? order.orderType}
          <span className="text-stone-300">·</span>
          <span className="text-stone-400">{order.paymentMethod}</span>
        </p>
      </button>
      <div className={`px-3.5 text-xs text-stone-600 space-y-1 ${expanded ? "" : "max-h-[52px] overflow-hidden relative"}`}>
        {order.items.map((i) => (
          <div key={i.id} className="flex justify-between gap-2">
            <span className="font-medium">{i.qty}× {i.nameSnapshot}</span>
            <span className="text-stone-400 shrink-0">{fmtBDT(i.lineTotal)}</span>
          </div>
        ))}
        {order.items.some((i) => i.notes) && (
          <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1 mt-1">
            {order.items.filter((i) => i.notes).map((i) => i.notes).join("; ")}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between px-3.5 py-2.5 mt-1 border-t border-stone-100">
        <p className="font-bold text-sm">{fmtBDT(order.total)}</p>
        <div className="flex gap-1.5">
          {showCancel && (
            <button onClick={onCancel} disabled={pending} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-40 cursor-pointer" title="Cancel order">
              <Ban size={15} />
            </button>
          )}
          <Button size="sm" loading={pending} onClick={onAdvance}>
            {NEXT_LABEL[order.status]}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- new order modal ---------------------------- */
function NewOrderModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [menu, setMenu] = useState<MenuItemLite[]>([]);
  const [tables, setTables] = useState<TableLite[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [form, setForm] = useState({ tableId: "", orderType: "DINE_IN", customerPhone: "", customerName: "", paymentMethod: "CASH", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/menu-items").then((r) => r.json()).then((d) => setMenu(d.items ?? []));
    fetch("/api/tables").then((r) => r.json()).then((d) => setTables(d.tables ?? []));
  }, [open]);

  const total = Object.entries(cart).reduce((s, [id, qty]) => s + (menu.find((m) => m.id === Number(id))?.price ?? 0) * qty, 0);

  const submit = async () => {
    const items = Object.entries(cart).filter(([, qty]) => qty > 0).map(([id, qty]) => ({ menuItemId: Number(id), qty }));
    if (items.length === 0) return toast.error("Add at least one item");
    setSaving(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableId: form.tableId ? Number(form.tableId) : null,
        orderType: form.orderType,
        customerPhone: form.customerPhone || null,
        customerName: form.customerName || null,
        paymentMethod: form.paymentMethod,
        items,
        notes: form.notes || null,
      }),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Failed");
    toast.success(`Order ${data.order.orderNumber} placed`);
    setCart({});
    setForm({ tableId: "", orderType: "DINE_IN", customerPhone: "", customerName: "", paymentMethod: "CASH", notes: "" });
    onCreated();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Order (counter)" wide>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Order type">
              <Select value={form.orderType} onChange={(e) => setForm({ ...form, orderType: e.target.value })}>
                <option value="DINE_IN">Dine-in</option>
                <option value="TAKEAWAY">Takeaway</option>
                <option value="DELIVERY">Delivery</option>
              </Select>
            </Field>
            {form.orderType === "DINE_IN" && (
              <Field label="Table">
                <Select value={form.tableId} onChange={(e) => setForm({ ...form, tableId: e.target.value })}>
                  <option value="">— select —</option>
                  {tables.map((tbl) => <option key={tbl.id} value={tbl.id}>{tbl.name}</option>)}
                </Select>
              </Field>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Customer phone (optional)">
              <Input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="01XXXXXXXXX" />
            </Field>
            <Field label="Name (optional)">
              <Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            </Field>
          </div>
          <Field label="Payment method">
            <div className="grid grid-cols-4 gap-1.5">
              {["CASH", "BKASH", "NAGAD", "CARD"].map((pm) => (
                <button key={pm} type="button" onClick={() => setForm({ ...form, paymentMethod: pm })}
                  className={`text-xs font-bold py-2 rounded-lg border transition cursor-pointer ${form.paymentMethod === pm ? "bg-forest text-white border-forest" : "border-stone-300 text-stone-500 hover:border-leaf"}`}>
                  {pm}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Kitchen note">
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. all items extra spicy" />
          </Field>
        </div>
        <div>
          <p className="text-xs font-semibold text-stone-600 mb-1">Items</p>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-stone-200 divide-y divide-stone-50">
            {menu.filter((m) => m.isAvailable).map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.nameEn}</p>
                  <p className="text-[11px] text-stone-400">{fmtBDT(m.price)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button" className="size-6 rounded-md bg-stone-100 hover:bg-stone-200 font-bold cursor-pointer" onClick={() => setCart((c) => ({ ...c, [m.id]: Math.max(0, (c[m.id] ?? 0) - 1) }))}>-</button>
                  <span className="w-5 text-center text-sm font-bold">{cart[m.id] ?? 0}</span>
                  <button type="button" className="size-6 rounded-md bg-leaf text-white font-bold cursor-pointer" onClick={() => setCart((c) => ({ ...c, [m.id]: (c[m.id] ?? 0) + 1 }))}>+</button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="font-display text-lg font-semibold">Total: {fmtBDT(total)}</p>
            <Button onClick={submit} loading={saving}>Place Order</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
