import { NextRequest } from "next/server";
import { db } from "@/db";
import { orders, orderItems, orderStatusEvents, tables, menuItems } from "@/db/schema";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { normPhone, onOrderCompleted, getSettings } from "@/lib/server";

async function generateOrderNumber(): Promise<string> {
  const [{ value }] = await db
    .select({ value: sql<string>`count(*)` })
    .from(orders);
  const n = Number(value) + 1;
  return "RJ-" + String(1000 + n);
}

export async function GET(req: NextRequest) {
  const { error } = await requireUser();
  if (error) return error;
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q")?.toLowerCase();

  let rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(500);
  if (status && status !== "ALL") rows = rows.filter((r) => r.status === status);
  if (url.searchParams.get("active") === "1")
    rows = rows.filter((r) => ["PENDING", "CONFIRMED", "PREPARING", "READY"].includes(r.status));
  if (q)
    rows = rows.filter(
      (r) =>
        r.orderNumber.toLowerCase().includes(q) ||
        (r.customerPhone ?? "").includes(q) ||
        (r.customerName ?? "").toLowerCase().includes(q)
    );

  const orderIds = rows.map((r) => r.id);
  const [items, tableRows, events] = orderIds.length
    ? await Promise.all([
        db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)),
        db.select().from(tables).where(
          inArray(tables.id, [...new Set(rows.map((r) => r.tableId).filter((x): x is number => x !== null))])
        ),
        db.select().from(orderStatusEvents).where(inArray(orderStatusEvents.orderId, orderIds)),
      ])
    : [[], [], []];

  const tableMap = new Map(tableRows.map((t) => [t.id, t]));
  return Response.json({
    orders: rows.map((o) => ({
      ...o,
      subtotal: Number(o.subtotal),
      total: Number(o.total),
      tableName: o.tableId ? tableMap.get(o.tableId)?.name ?? null : null,
      items: items
        .filter((i) => i.orderId === o.id)
        .map((i) => ({ ...i, unitPrice: Number(i.unitPrice), lineTotal: Number(i.lineTotal) })),
      events: events
        .filter((e) => e.orderId === o.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    })),
  });
}

export async function POST(req: NextRequest) {
  // Public endpoint (guest checkout via QR) — no auth required for creating orders.
  const body = await req.json();
  try {
    const { tableId, orderType, customerPhone, customerName, paymentMethod, items, notes } = body;
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "Order must contain at least one item" }, { status: 400 });
    }
    const ids = items.map((i: { menuItemId: number }) => Number(i.menuItemId));
    const menuRows = await db.select().from(menuItems).where(inArray(menuItems.id, ids));
    const menuMap = new Map(menuRows.map((m) => [m.id, m]));

    let subtotal = 0;
    const lines = items.map((i: { menuItemId: number; qty: number; notes?: string }) => {
      const m = menuMap.get(Number(i.menuItemId));
      if (!m) throw new Error("Invalid menu item");
      const qty = Math.max(1, Math.min(99, Number(i.qty) || 1));
      const unitPrice = Number(m.price);
      const lineTotal = unitPrice * qty;
      subtotal += lineTotal;
      return { menuItemId: m.id, nameSnapshot: m.nameEn, qty, unitPrice, lineTotal, notes: i.notes || notes || null };
    });

    const s = await getSettings();
    const phone = customerPhone ? normPhone(String(customerPhone)) : null;
    const points = phone ? Math.floor((subtotal / 10) * Number(s.pointsPer10Taka)) : 0;

    const [ord] = await db
      .insert(orders)
      .values({
        orderNumber: await generateOrderNumber(),
        tableId: tableId ? Number(tableId) : null,
        orderType: orderType === "TAKEAWAY" || orderType === "DELIVERY" ? orderType : "DINE_IN",
        customerPhone: phone,
        customerName: customerName?.trim() || null,
        paymentMethod: ["CASH", "BKASH", "NAGAD", "CARD"].includes(paymentMethod) ? paymentMethod : "CASH",
        subtotal: String(subtotal),
        total: String(subtotal),
        pointsEarned: points,
        status: "PENDING",
      })
      .returning();

    for (const l of lines) {
      await db.insert(orderItems).values({
        orderId: ord.id,
        menuItemId: l.menuItemId,
        nameSnapshot: l.nameSnapshot,
        qty: l.qty,
        unitPrice: String(l.unitPrice),
        lineTotal: String(l.lineTotal),
        notes: l.notes,
      });
    }
    await db.insert(orderStatusEvents).values({ orderId: ord.id, status: "PENDING" });
    if (ord.tableId) {
      await db.update(tables).set({ status: "OCCUPIED" }).where(eq(tables.id, ord.tableId));
    }
    return Response.json({ order: ord, pointsExpected: points }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Could not place order" }, { status: 500 });
  }
}
