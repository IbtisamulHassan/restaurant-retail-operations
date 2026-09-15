"use client";

import { useEffect, useMemo, useState, useCallback, use } from "react";
import { fmtBDT, STATUS_STYLE } from "@/lib/utils";
import { toast, Toaster } from "sonner";
import {
  ShoppingBag, Plus, Minus, X, Flame, Clock, Phone, User,
  Wallet, ChevronUp, Star, CheckCircle2, ChefHat, BellRing, HandPlatter,
  UtensilsCrossed, Bike, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MenuItem = {
  id: number; nameEn: string; nameBn: string | null; category: string;
  description: string | null; price: number; imageUrl: string | null; prepTimeMinutes: number;
};
type MenuData = {
  table: { id: number; name: string; status: string } | null;
  orderType: string; businessName: string; categories: string[]; items: MenuItem[];
};
type PlacedOrder = {
  id: number; orderNumber: string; status: string; total: number; pointsEarned: number;
  items: { id: number; name: string; qty: number; unitPrice: number; lineTotal: number }[];
  tableName: string | null; orderType: string; paymentMethod: string;
};

const CAT_GRADIENTS: Record<string, string> = {
  "Rice & Biryani": "from-amber-200 via-orange-100 to-yellow-50",
  "Curry & Bhuna": "from-rose-200 via-red-100 to-orange-50",
  "Snacks & Street Food": "from-lime-200 via-emerald-100 to-teal-50",
  "Fast Food": "from-orange-200 via-amber-100 to-yellow-50",
  "Sides": "from-stone-200 via-stone-100 to-amber-50",
  "Drinks": "from-sky-200 via-cyan-100 to-teal-50",
  "Dessert": "from-pink-200 via-rose-100 to-fuchsia-50",
  "Grocery": "from-emerald-200 via-green-100 to-lime-50",
};
const PAY_METHODS = [
  { id: "CASH", label: "Cash", hint: "Pay at counter" },
  { id: "BKASH", label: "bKash", hint: "Send money to merchant" },
  { id: "NAGAD", label: "Nagad", hint: "Send money to merchant" },
  { id: "CARD", label: "Card", hint: "Pay at counter by card" },
];

const TYPE_ICON: Record<string, React.ReactNode> = {
  DINE_IN: <UtensilsCrossed size={13} />, TAKEAWAY: <ShoppingBag size={13} />, DELIVERY: <Bike size={13} />,
};
const TYPE_LABEL: Record<string, string> = { DINE_IN: "Dine-in", TAKEAWAY: "Takeaway", DELIVERY: "Delivery" };

export default function PublicMenuPage({ params }: { params: Promise<{ tableId: string }> }) {
  const { tableId } = use(params);
  const [data, setData] = useState<MenuData | null>(null);
  const [error, setError] = useState("");
  const [cat, setCat] = useState("ALL");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placedId, setPlacedId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/public/menu/${tableId}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) setError(d.error ?? "Menu unavailable");
        else setData(d);
      })
      .catch(() => setError("Could not load the menu. Please try again."));
  }, [tableId]);

  const items = useMemo(() => {
    let list = data?.items ?? [];
    if (cat !== "ALL") list = list.filter((i) => i.category === cat);
    if (q) list = list.filter((i) => (i.nameEn + " " + (i.nameBn ?? "")).toLowerCase().includes(q.toLowerCase()));
    return list;
  }, [data, cat, q]);

  const cartCount = Object.values(cart).reduce((s, n) => s + n, 0);
  const cartTotal = Object.entries(cart).reduce((s, [id, n]) => s + (data?.items.find((i) => i.id === Number(id))?.price ?? 0) * n, 0);

  const addTo = (id: number, delta: number) => {
    setCart((c) => {
      const next = { ...c, [id]: Math.max(0, (c[id] ?? 0) + delta) };
      if (next[id] === 0) delete next[id];
      return next;
    });
  };

  if (placedId) return <OrderTracking orderId={placedId} businessName={data?.businessName ?? ""} />;

  if (error) {
    return (
      <div className="min-h-screen bg-forest text-cream flex flex-col items-center justify-center p-8 text-center">
        <Flame size={40} className="text-saffron mb-4" />
        <h1 className="font-display text-2xl font-semibold">{error}</h1>
        <p className="text-cream/60 text-sm mt-2">Please check the QR code with a staff member.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-cream p-6 space-y-4">
        <div className="skeleton h-24 rounded-3xl" />
        <div className="skeleton h-10 rounded-full" />
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-28">
      <Toaster richColors position="top-center" />
      {/* hero */}
      <header className="bg-forest text-cream relative overflow-hidden">
        <div className="absolute -right-16 -top-16 size-56 rounded-full bg-saffron/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 size-40 rounded-full bg-leaf/40 blur-3xl" />
        <div className="relative px-5 pt-6 pb-5 max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-saffron flex items-center justify-center text-forest-deep">
              <Flame size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold leading-tight">{data.businessName}</h1>
              <p className="text-[11px] text-cream/50 uppercase tracking-[0.2em]">Digital Menu</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-cream/10 border border-cream/15 rounded-full px-3 py-1.5 text-xs font-bold">
              {data.table ? <UtensilsCrossed size={12} /> : TYPE_ICON[data.orderType]}
              {data.table ? data.table.name : TYPE_LABEL[data.orderType]}
            </span>
            <span className="inline-flex items-center gap-1 text-cream/50 text-[11px]">
              <span className="size-1.5 rounded-full bg-emerald-400 pulse-dot" /> Kitchen is live
            </span>
          </div>
        </div>
      </header>

      {/* search + categories */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-md border-b border-stone-200/70">
        <div className="max-w-lg mx-auto px-4 py-2.5 space-y-2">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes… খুঁজুন…"
              className="w-full rounded-full border border-stone-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf/30 focus:border-leaf"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {["ALL", ...data.categories].map((c) => (
              <button key={c} onClick={() => setCat(c)}
                className={cn("shrink-0 text-xs font-bold px-3.5 py-2 rounded-full border transition cursor-pointer",
                  cat === c ? "bg-forest text-white border-forest shadow-sm" : "bg-white border-stone-200 text-stone-500")}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* items */}
      <main className="max-w-lg mx-auto px-4 pt-4 space-y-3">
        {items.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            <UtensilsCrossed size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No dishes found{q ? ` for “${q}”` : ""}.</p>
          </div>
        )}
        {items.map((item, i) => {
          const qty = cart[item.id] ?? 0;
          return (
            <div key={item.id} className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_1px_3px_rgba(28,43,35,0.06)] overflow-hidden rise-in" style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}>
              <div className="flex">
                <div className={cn("w-24 sm:w-28 shrink-0 bg-gradient-to-br flex items-center justify-center relative", CAT_GRADIENTS[item.category] ?? "from-stone-200 to-amber-50")}>
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.nameEn} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <UtensilsCrossed size={26} className="text-forest/30" />
                  )}
                  <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-0.5 bg-white/85 backdrop-blur rounded-full px-1.5 py-0.5 text-[9px] font-bold text-stone-600">
                    <Clock size={8} /> {item.prepTimeMinutes}m
                  </span>
                </div>
                <div className="flex-1 p-3.5 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-display font-semibold text-[15px] leading-tight">{item.nameEn}</h3>
                      {item.nameBn && <p className="text-xs text-stone-500 mt-0.5" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>{item.nameBn}</p>}
                    </div>
                    <p className="font-display font-bold text-leaf whitespace-nowrap">{fmtBDT(item.price)}</p>
                  </div>
                  {item.description && <p className="text-[11px] text-stone-400 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>}
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="text-[10px] uppercase tracking-wider text-stone-300 font-bold">{item.category}</span>
                    {qty === 0 ? (
                      <button onClick={() => { addTo(item.id, 1); }}
                        className="inline-flex items-center gap-1.5 bg-forest text-white text-xs font-bold pl-3 pr-3.5 py-2 rounded-full hover:bg-leaf active:scale-95 transition cursor-pointer">
                        <Plus size={13} /> Add
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-forest rounded-full p-1">
                        <button onClick={() => addTo(item.id, -1)} className="size-7 rounded-full bg-cream/15 text-white flex items-center justify-center active:scale-90 transition cursor-pointer"><Minus size={13} /></button>
                        <span className="text-white text-sm font-bold w-4 text-center">{qty}</span>
                        <button onClick={() => addTo(item.id, 1)} className="size-7 rounded-full bg-saffron text-forest-deep flex items-center justify-center active:scale-90 transition cursor-pointer"><Plus size={13} /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <p className="text-center text-[11px] text-stone-300 pt-2 pb-4">Ordered via QR · no account needed</p>
      </main>

      {/* floating cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 rise-in">
          <div className="max-w-lg mx-auto px-4 pb-4">
            <button onClick={() => setCartOpen(true)}
              className="w-full bg-forest text-white rounded-2xl shadow-2xl shadow-forest/40 px-5 py-4 flex items-center justify-between active:scale-[0.98] transition cursor-pointer">
              <span className="inline-flex items-center gap-3">
                <span className="size-9 rounded-xl bg-saffron text-forest-deep flex items-center justify-center font-display font-bold">{cartCount}</span>
                <span className="text-left">
                  <span className="block text-sm font-bold leading-tight">View order</span>
                  <span className="block text-[11px] text-cream/50">{data.table ? data.table.name : TYPE_LABEL[data.orderType]}</span>
                </span>
              </span>
              <span className="flex items-center gap-2 font-display font-bold text-lg">
                {fmtBDT(cartTotal)} <ChevronUp size={16} />
              </span>
            </button>
          </div>
        </div>
      )}

      {/* cart bottom sheet */}
      {cartOpen && (
        <CheckoutSheet
          data={data}
          cart={cart} notes={notes} setNotes={setNotes}
          addTo={addTo}
          placing={placing}
          onClose={() => setCartOpen(false)}
          onSubmit={async (form) => {
            setPlacing(true);
            const res = await fetch("/api/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tableId: data.table?.id ?? null,
                orderType: data.orderType,
                customerPhone: form.phone || null,
                customerName: form.name || null,
                paymentMethod: form.paymentMethod,
                items: Object.entries(cart).map(([id, qty]) => ({ menuItemId: Number(id), qty, notes: notes[Number(id)] || null })),
                notes: form.kitchenNote || null,
              }),
            });
            setPlacing(false);
            const d = await res.json();
            if (!res.ok) return toast.error(d.error ?? "Could not place order");
            toast.success("Order placed! The kitchen has it now.");
            setPlacedId(d.order.id);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------- checkout sheet ---------------------------- */
function CheckoutSheet({ data, cart, notes, setNotes, addTo, placing, onClose, onSubmit }: {
  data: MenuData;
  cart: Record<number, number>;
  notes: Record<number, string>;
  setNotes: (n: Record<number, string>) => void;
  addTo: (id: number, delta: number) => void;
  placing: boolean;
  onClose: () => void;
  onSubmit: (form: { phone: string; name: string; paymentMethod: string; kitchenNote: string }) => void;
}) {
  const [form, setForm] = useState({ phone: "", name: "", paymentMethod: "CASH", kitchenNote: "" });
  const lines = data.items.filter((i) => cart[i.id] > 0);
  const total = lines.reduce((s, i) => s + i.price * cart[i.id], 0);

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <div className="absolute inset-0 bg-forest-deep/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-cream rounded-t-[2rem] max-h-[92vh] overflow-y-auto rise-in">
        <div className="sticky top-0 bg-cream z-10 pt-3 pb-2 px-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Your Order</h2>
            <button onClick={onClose} className="size-9 rounded-full bg-white border border-stone-200 flex items-center justify-center cursor-pointer"><X size={16} /></button>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {data.table ? `${data.table.name} · Dine-in` : TYPE_LABEL[data.orderType]} at {data.businessName}
          </p>
        </div>

        <div className="px-5 pb-32 space-y-4 pt-1">
          {/* lines */}
          <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-50">
            {lines.map((i) => (
              <div key={i.id} className="p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{i.nameEn}</p>
                    <p className="text-[11px] text-stone-400">{fmtBDT(i.price)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-stone-100 rounded-full p-0.5">
                      <button onClick={() => addTo(i.id, -1)} className="size-6 rounded-full bg-white shadow-sm flex items-center justify-center cursor-pointer"><Minus size={11} /></button>
                      <span className="text-sm font-bold w-4 text-center">{cart[i.id]}</span>
                      <button onClick={() => addTo(i.id, 1)} className="size-6 rounded-full bg-leaf text-white flex items-center justify-center cursor-pointer"><Plus size={11} /></button>
                    </div>
                    <span className="text-sm font-bold w-16 text-right">{fmtBDT(i.price * cart[i.id])}</span>
                  </div>
                </div>
                <input
                  value={notes[i.id] ?? ""}
                  onChange={(e) => setNotes({ ...notes, [i.id]: e.target.value })}
                  placeholder="Special instruction… (e.g. extra spicy)"
                  className="mt-2 w-full text-xs rounded-lg border border-stone-200 bg-cream/60 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-leaf/40"
                />
              </div>
            ))}
          </div>

          {/* guest details */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Your details (optional)</p>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone number — earn loyalty points!" inputMode="tel"
                className="w-full rounded-xl border border-stone-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf/30 focus:border-leaf" />
            </div>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Name"
                className="w-full rounded-xl border border-stone-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf/30 focus:border-leaf" />
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Adding your phone links this order to your loyalty account — you&apos;ll earn points automatically when the order is completed.
            </p>
          </div>

          {/* payment */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2.5 flex items-center gap-1.5"><Wallet size={12} /> Payment method</p>
            <div className="grid grid-cols-2 gap-2">
              {PAY_METHODS.map((pm) => (
                <button key={pm.id} onClick={() => setForm({ ...form, paymentMethod: pm.id })}
                  className={cn("rounded-xl border-2 p-3 text-left transition cursor-pointer",
                    form.paymentMethod === pm.id ? "border-leaf bg-leaf-light/50" : "border-stone-200 bg-white")}>
                  <p className={cn("text-sm font-bold", form.paymentMethod === pm.id ? "text-leaf" : "text-ink")}>{pm.label}</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">{pm.hint}</p>
                </button>
              ))}
            </div>
            <input value={form.kitchenNote} onChange={(e) => setForm({ ...form, kitchenNote: e.target.value })}
              placeholder="Note for the whole order (optional)"
              className="mt-3 w-full text-xs rounded-lg border border-stone-200 px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-leaf/40" />
          </div>
        </div>

        {/* submit bar */}
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-stone-200 p-4">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Total</p>
              <p className="font-display text-2xl font-bold leading-none">{fmtBDT(total)}</p>
              {form.phone && <p className="text-[10px] text-saffron font-bold mt-0.5">+{Math.floor(total / 10)} loyalty points</p>}
            </div>
            <button onClick={() => onSubmit(form)} disabled={placing || lines.length === 0}
              className="flex-1 max-w-56 bg-forest text-white font-bold py-3.5 rounded-2xl hover:bg-leaf active:scale-[0.97] transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
              {placing && <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              Place Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ order tracking ----------------------------- */
const PIPE = [
  { status: "PENDING", label: "Received", icon: BellRing },
  { status: "CONFIRMED", label: "Confirmed", icon: CheckCircle2 },
  { status: "PREPARING", label: "Preparing", icon: ChefHat },
  { status: "READY", label: "Ready", icon: UtensilsCrossed },
  { status: "SERVED", label: "Served", icon: HandPlatter },
];

function OrderTracking({ orderId, businessName }: { orderId: number; businessName: string }) {
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [fbSent, setFbSent] = useState(false);
  const [fbSaving, setFbSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/public/order/${orderId}`);
    if (res.ok) setOrder((await res.json()).order);
  }, [orderId]);
  useEffect(() => {
    load();
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  }, [load]);

  if (!order) {
    return (
      <div className="min-h-screen bg-cream p-6 space-y-4">
        <div className="skeleton h-24 rounded-3xl" /><div className="skeleton h-64 rounded-3xl" />
      </div>
    );
  }

  const activeIdx = order.status === "COMPLETED" ? PIPE.length : order.status === "CANCELLED" ? -1 : PIPE.findIndex((p) => p.status === order.status);

  const sendFeedback = async () => {
    if (!rating) return;
    setFbSaving(true);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, rating, comment: comment || null }),
    });
    setFbSaving(false);
    setFbSent(true);
    toast.success("Thanks for your feedback!");
  };

  return (
    <div className="min-h-screen bg-cream pb-10">
      <Toaster richColors position="top-center" />
      <header className="bg-forest text-cream relative overflow-hidden">
        <div className="absolute -right-16 -top-16 size-56 rounded-full bg-saffron/20 blur-3xl" />
        <div className="relative max-w-lg mx-auto px-5 pt-8 pb-6 text-center">
          <div className="size-14 rounded-2xl bg-emerald-400 text-forest-deep mx-auto flex items-center justify-center mb-3">
            <CheckCircle2 size={28} strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-2xl font-semibold">Order placed!</h1>
          <p className="text-cream/60 text-sm mt-1">
            {businessName} · {order.tableName ?? order.orderType} · <span className="font-bold text-saffron">{order.orderNumber}</span>
          </p>
          {order.pointsEarned > 0 && (
            <span className="inline-flex items-center gap-1.5 mt-3 bg-saffron/20 border border-saffron/30 text-saffron text-xs font-bold px-3 py-1.5 rounded-full">
              <Star size={12} /> +{order.pointsEarned} loyalty points on completion
            </span>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 -mt-4 space-y-4">
        {/* live status */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">Live status</h2>
            <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full", STATUS_STYLE[order.status]?.bg, STATUS_STYLE[order.status]?.text)}>
              <span className={cn("size-1.5 rounded-full pulse-dot", STATUS_STYLE[order.status]?.dot)} />
              {STATUS_STYLE[order.status]?.label}
            </span>
          </div>
          {order.status === "CANCELLED" ? (
            <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2.5">This order was cancelled. Please ask a staff member for help.</p>
          ) : (
            <div className="space-y-0">
              {PIPE.map((p, i) => {
                const done = i < activeIdx || order.status === "COMPLETED";
                const current = i === activeIdx && order.status !== "COMPLETED";
                return (
                  <div key={p.status} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn("size-8 rounded-full flex items-center justify-center border-2 transition-all",
                        done ? "bg-leaf border-leaf text-white" : current ? "border-leaf text-leaf bg-leaf-light" : "border-stone-200 text-stone-300")}>
                        <p.icon size={14} />
                      </div>
                      {i < PIPE.length - 1 && <div className={cn("w-0.5 h-6", done ? "bg-leaf" : "bg-stone-200")} />}
                    </div>
                    <div className="pt-1.5">
                      <p className={cn("text-sm font-bold", done || current ? "text-ink" : "text-stone-300")}>{p.label}</p>
                      {current && <p className="text-[11px] text-leaf">In progress… updates automatically</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* receipt */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <h2 className="font-display font-semibold mb-3">Receipt</h2>
          <div className="divide-y divide-stone-50">
            {order.items.map((i) => (
              <div key={i.id} className="py-2 flex justify-between text-sm">
                <span className="font-medium">{i.qty}× {i.name}</span>
                <span className="text-stone-500">{fmtBDT(i.lineTotal)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-stone-100 mt-2 pt-3 flex justify-between items-center">
            <span className="text-xs text-stone-400 uppercase tracking-wider font-bold">{order.paymentMethod}</span>
            <span className="font-display text-xl font-bold">{fmtBDT(order.total)}</span>
          </div>
        </div>

        {/* feedback */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <h2 className="font-display font-semibold">How was it?</h2>
          {fbSent ? (
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2.5 mt-2">
              Thank you! Your feedback helps {businessName} improve.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setRating(s)} className="cursor-pointer transition active:scale-90">
                    <Star size={30} className={s <= rating ? "text-saffron" : "text-stone-200"} fill={s <= rating ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
                placeholder="Tell us about the food & service… (optional)"
                className="w-full text-sm rounded-xl border border-stone-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-leaf/30 focus:border-leaf" />
              <button onClick={sendFeedback} disabled={!rating || fbSaving}
                className="w-full bg-forest text-white font-bold py-3 rounded-xl hover:bg-leaf active:scale-[0.98] transition disabled:opacity-40 cursor-pointer">
                {fbSaving ? "Sending…" : "Submit feedback"}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-stone-300">Powered by RestOps BD · ordered via QR</p>
      </main>
    </div>
  );
}
