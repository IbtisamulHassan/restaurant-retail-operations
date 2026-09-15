import { NextRequest } from "next/server";
import { db } from "@/db";
import { customers, orders, loyaltyTransactions, feedback } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getSettings, normPhone } from "@/lib/server";
import { tierForSpend } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { error } = await requireUser(["OWNER", "STAFF"]);
  if (error) return error;
  const s = await getSettings();
  const silver = Number(s.tierSilverSpend);
  const gold = Number(s.tierGoldSpend);
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.toLowerCase();

  let rows = await db.select().from(customers).orderBy(desc(customers.lifetimeSpend)).limit(500);
  if (q)
    rows = rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.phone.includes(q) || (r.email ?? "").toLowerCase().includes(q)
    );
  return Response.json({
    customers: rows.map((c) => ({
      ...c,
      lifetimeSpend: Number(c.lifetimeSpend),
      tier: tierForSpend(Number(c.lifetimeSpend), silver, gold),
    })),
  });
}

export async function POST(req: NextRequest) {
  const { error } = await requireUser(["OWNER", "STAFF"]);
  if (error) return error;
  const body = await req.json();
  const phone = normPhone(String(body.phone ?? ""));
  if (!body.name?.trim() || !phone) {
    return Response.json({ error: "Name and phone are required" }, { status: 400 });
  }
  const existing = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
  if (existing[0]) return Response.json({ error: "A customer with this phone already exists" }, { status: 409 });
  const [row] = await db
    .insert(customers)
    .values({
      name: body.name.trim(),
      phone,
      email: body.email?.trim() || null,
      tag: ["New", "Regular", "VIP"].includes(body.tag) ? body.tag : "New",
      notes: body.notes?.trim() || null,
    })
    .returning();
  return Response.json({ customer: row }, { status: 201 });
}

/** GET detail for one customer (orders, loyalty ledger, feedback). */
export async function PUT(req: NextRequest) {
  const { error } = await requireUser(["OWNER", "STAFF"]);
  if (error) return error;
  const body = await req.json();
  const id = Number(body.id);
  const cust = (await db.select().from(customers).where(eq(customers.id, id)).limit(1))[0];
  if (!cust) return Response.json({ error: "Not found" }, { status: 404 });
  const s = await getSettings();
  const [ordersRows, ledger, fb] = await Promise.all([
    db.select().from(orders).where(eq(orders.customerId, id)).orderBy(desc(orders.createdAt)).limit(50),
    db.select().from(loyaltyTransactions).where(eq(loyaltyTransactions.customerId, id)).orderBy(desc(loyaltyTransactions.createdAt)).limit(50),
    db.select().from(feedback).where(eq(feedback.customerId, id)).orderBy(desc(feedback.createdAt)).limit(20),
  ]);
  const orderIds = ordersRows.map((o) => o.id);
  const items = orderIds.length
    ? await db.select().from(orderItemsSafe()).where(inArray(orderItemsSafe().orderId, orderIds))
    : [];
  return Response.json({
    customer: {
      ...cust,
      lifetimeSpend: Number(cust.lifetimeSpend),
      tier: tierForSpend(Number(cust.lifetimeSpend), Number(s.tierSilverSpend), Number(s.tierGoldSpend)),
    },
    orders: ordersRows.map((o) => ({
      ...o,
      subtotal: Number(o.subtotal),
      total: Number(o.total),
      items: items.filter((i) => i.orderId === o.id),
    })),
    ledger,
    feedback: fb,
  });
}

import { orderItems } from "@/db/schema";
function orderItemsSafe() {
  return orderItems;
}
