import { db } from "@/db";
import { orders, orderItems, orderStatusEvents, tables } from "@/db/schema";
import { eq } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

/** Public (no auth): order status tracking for guests. */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const orderId = Number(id);
  if (!Number.isFinite(orderId)) return Response.json({ error: "Invalid order" }, { status: 400 });
  const ord = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
  if (!ord) return Response.json({ error: "Order not found" }, { status: 404 });
  const [items, events, table] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, orderId)),
    db.select().from(orderStatusEvents).where(eq(orderStatusEvents.orderId, orderId)),
    ord.tableId ? db.select().from(tables).where(eq(tables.id, ord.tableId)).limit(1) : Promise.resolve([]),
  ]);
  return Response.json({
    order: {
      id: ord.id,
      orderNumber: ord.orderNumber,
      status: ord.status,
      orderType: ord.orderType,
      paymentMethod: ord.paymentMethod,
      total: Number(ord.total),
      pointsEarned: ord.pointsEarned,
      createdAt: ord.createdAt,
      tableName: table[0]?.name ?? null,
      items: items.map((i) => ({
        id: i.id,
        name: i.nameSnapshot,
        qty: i.qty,
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal),
      })),
      events: events
        .map((e) => ({ status: e.status, at: e.createdAt }))
        .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()),
    },
    hasFeedback: null,
  });
}
