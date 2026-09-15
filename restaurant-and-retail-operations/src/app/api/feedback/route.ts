import { NextRequest } from "next/server";
import { db } from "@/db";
import { feedback, orders } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const { error } = await requireUser(["OWNER", "STAFF"]);
  if (error) return error;
  const rows = await db.select().from(feedback).orderBy(desc(feedback.createdAt)).limit(100);
  const orderIds = rows.map((r) => r.orderId).filter((x): x is number => x !== null);
  const orderRows = orderIds.length
    ? await db.select({ id: orders.id, orderNumber: orders.orderNumber }).from(orders)
    : [];
  const map = new Map(orderRows.map((o) => [o.id, o.orderNumber]));
  return Response.json({
    feedback: rows.map((f) => ({ ...f, orderNumber: f.orderId ? map.get(f.orderId) ?? null : null })),
  });
}

export async function POST(req: NextRequest) {
  // Public — posted from the QR ordering thank-you screen.
  try {
    const body = await req.json();
    const orderId = Number(body.orderId);
    const rating = Math.min(5, Math.max(1, Number(body.rating) || 0));
    if (!orderId || !rating) return Response.json({ error: "Order and rating required" }, { status: 400 });
    const ord = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
    if (!ord) return Response.json({ error: "Order not found" }, { status: 404 });
    const [row] = await db
      .insert(feedback)
      .values({
        orderId,
        customerId: ord.customerId,
        rating,
        comment: body.comment ? String(body.comment).slice(0, 1000) : null,
      })
      .returning();
    return Response.json({ feedback: row }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Could not save feedback" }, { status: 500 });
  }
}
