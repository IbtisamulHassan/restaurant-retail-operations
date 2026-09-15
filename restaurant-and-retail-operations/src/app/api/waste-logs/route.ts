import { NextRequest } from "next/server";
import { db } from "@/db";
import { wasteLogs, ingredients } from "@/db/schema";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { todayStr } from "@/lib/utils";

async function withNames(rows: (typeof wasteLogs.$inferSelect)[]) {
  const ids = [...new Set(rows.map((r) => r.ingredientId))];
  const ings = ids.length ? await db.select().from(ingredients).where(inArray(ingredients.id, ids)) : [];
  const map = new Map(ings.map((i) => [i.id, i]));
  return rows.map((r) => ({
    ...r,
    qty: Number(r.qty),
    costImpact: Number(r.costImpact),
    ingredientName: map.get(r.ingredientId)?.name ?? "Unknown",
  }));
}

export async function GET(req: NextRequest) {
  const { error } = await requireUser();
  if (error) return error;
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  let rows = await db.select().from(wasteLogs).orderBy(desc(wasteLogs.loggedAt)).limit(500);
  if (from) rows = rows.filter((r) => r.loggedAt >= from);
  if (to) rows = rows.filter((r) => r.loggedAt <= to);
  return Response.json({ wasteLogs: await withNames(rows) });
}

export async function POST(req: NextRequest) {
  const { error } = await requireUser(["OWNER", "STAFF"]);
  if (error) return error;
  const body = await req.json();
  const ing = (
    await db.select().from(ingredients).where(eq(ingredients.id, Number(body.ingredientId))).limit(1)
  )[0];
  if (!ing) return Response.json({ error: "Ingredient not found" }, { status: 400 });
  const qty = Number(body.qty);
  if (!(qty > 0)) return Response.json({ error: "Quantity must be positive" }, { status: 400 });
  const reason = ["EXPIRED", "OVERPRODUCTION", "SPILLAGE", "OTHER"].includes(body.reason)
    ? body.reason
    : "OTHER";
  const costImpact = qty * Number(ing.costPerUnit);
  const [row] = await db
    .insert(wasteLogs)
    .values({
      ingredientId: ing.id,
      qty: String(qty),
      unit: ing.unit,
      reason,
      costImpact: String(costImpact.toFixed(2)),
      loggedAt: body.loggedAt || todayStr(),
    })
    .returning();
  // Reduce stock as well
  await db
    .update(ingredients)
    .set({ stockQty: sql`GREATEST(0, ${ingredients.stockQty} - ${qty})` })
    .where(eq(ingredients.id, ing.id));
  const [named] = await withNames([row]);
  return Response.json({ wasteLog: named }, { status: 201 });
}
