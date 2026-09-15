import { NextRequest } from "next/server";
import { db } from "@/db";
import { customers, loyaltyTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { normPhone } from "@/lib/server";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { error } = await requireUser(["OWNER", "STAFF"]);
  if (error) return error;
  const { id } = await ctx.params;
  const custId = Number(id);
  const body = await req.json();

  // Loyalty redeem / adjust action
  if (body.action === "redeem" || body.action === "adjust") {
    const points = Math.max(0, Math.floor(Number(body.points) || 0));
    if (!points) return Response.json({ error: "Points must be positive" }, { status: 400 });
    const cust = (await db.select().from(customers).where(eq(customers.id, custId)).limit(1))[0];
    if (!cust) return Response.json({ error: "Not found" }, { status: 404 });
    const delta = body.action === "redeem" ? -points : points;
    if (cust.loyaltyBalance + delta < 0)
      return Response.json({ error: "Insufficient loyalty balance" }, { status: 400 });
    const newBalance = cust.loyaltyBalance + delta;
    await db.update(customers).set({ loyaltyBalance: newBalance }).where(eq(customers.id, custId));
    await db.insert(loyaltyTransactions).values({
      customerId: custId,
      type: body.action === "redeem" ? "REDEEM" : "ADJUST",
      points: delta,
      balanceAfter: newBalance,
      note: body.note || (body.action === "redeem" ? "Points redeemed at counter" : "Manual adjustment"),
    });
    return Response.json({ ok: true, loyaltyBalance: newBalance });
  }

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = String(body.name).trim();
  if (body.phone !== undefined) patch.phone = normPhone(String(body.phone));
  if (body.email !== undefined) patch.email = body.email ? String(body.email).trim() : null;
  if (body.tag !== undefined && ["New", "Regular", "VIP"].includes(body.tag)) patch.tag = body.tag;
  if (body.notes !== undefined) patch.notes = body.notes ? String(body.notes).trim() : null;

  const [row] = await db.update(customers).set(patch).where(eq(customers.id, custId)).returning();
  if (!row) return Response.json({ error: "Customer not found" }, { status: 404 });
  return Response.json({ customer: row });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { error } = await requireUser(["OWNER"]);
  if (error) return error;
  const { id } = await ctx.params;
  await db.delete(customers).where(eq(customers.id, Number(id)));
  return Response.json({ ok: true });
}
