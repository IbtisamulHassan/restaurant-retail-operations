import { NextRequest } from "next/server";
import { db } from "@/db";
import { orders, orderStatusEvents, tables } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { onOrderCompleted } from "@/lib/server";

import type { orderStatusEnum, paymentMethodEnum } from "@/db/schema";

type OrderStatusT = (typeof orderStatusEnum.enumValues)[number];
type PaymentT = (typeof paymentMethodEnum.enumValues)[number];

const ALLOWED: Record<string, OrderStatusT[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED", "CANCELLED"],
  SERVED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { error } = await requireUser();
  if (error) return error;
  const { id } = await ctx.params;
  const orderId = Number(id);
  const body = await req.json();

  const current = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
  if (!current) return Response.json({ error: "Order not found" }, { status: 404 });

  if (body.status !== undefined) {
    const next = String(body.status) as OrderStatusT;
    if (!ALLOWED[current.status]?.includes(next)) {
      return Response.json(
        { error: `Cannot move from ${current.status} to ${next}` },
        { status: 400 }
      );
    }
    const [ord] = await db
      .update(orders)
      .set({ status: next, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    await db.insert(orderStatusEvents).values({ orderId, status: next });

    if (next === "COMPLETED") {
      await onOrderCompleted(orderId);
      if (current.tableId) {
        await db.update(tables).set({ status: "AVAILABLE" }).where(eq(tables.id, current.tableId));
      }
    }
    if (next === "CANCELLED" && current.tableId) {
      await db.update(tables).set({ status: "AVAILABLE" }).where(eq(tables.id, current.tableId));
    }
    return Response.json({ order: ord });
  }

  if (body.paymentMethod !== undefined) {
    const pm = String(body.paymentMethod) as PaymentT;
    if (!["CASH", "BKASH", "NAGAD", "CARD"].includes(pm)) {
      return Response.json({ error: "Invalid payment method" }, { status: 400 });
    }
    const [ord] = await db
      .update(orders)
      .set({ paymentMethod: pm, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return Response.json({ order: ord });
  }

  return Response.json({ error: "Nothing to update" }, { status: 400 });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { error } = await requireUser(["OWNER"]);
  if (error) return error;
  const { id } = await ctx.params;
  await db.delete(orders).where(eq(orders.id, Number(id)));
  return Response.json({ ok: true });
}
