import { NextRequest } from "next/server";
import { db } from "@/db";
import { ingredients, recipeItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { error } = await requireUser(["OWNER", "STAFF"]);
  if (error) return error;
  const { id } = await ctx.params;
  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = String(body.name).trim();
  if (body.unit !== undefined) patch.unit = body.unit;
  if (body.costPerUnit !== undefined) patch.costPerUnit = String(Number(body.costPerUnit) || 0);
  if (body.stockQty !== undefined) patch.stockQty = String(Number(body.stockQty) || 0);
  if (body.lowStockThreshold !== undefined)
    patch.lowStockThreshold = String(Number(body.lowStockThreshold) || 0);
  if (body.expiryDate !== undefined) patch.expiryDate = body.expiryDate || null;
  if (body.supplier !== undefined) patch.supplier = body.supplier ? String(body.supplier).trim() : null;

  const [row] = await db.update(ingredients).set(patch).where(eq(ingredients.id, Number(id))).returning();
  if (!row) return Response.json({ error: "Ingredient not found" }, { status: 404 });
  return Response.json({ ingredient: row });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { error } = await requireUser(["OWNER"]);
  if (error) return error;
  const { id } = await ctx.params;
  const ingId = Number(id);
  await db.delete(recipeItems).where(eq(recipeItems.ingredientId, ingId));
  await db.delete(ingredients).where(eq(ingredients.id, ingId));
  return Response.json({ ok: true });
}
