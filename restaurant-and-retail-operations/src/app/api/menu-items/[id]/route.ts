import { NextRequest } from "next/server";
import { db } from "@/db";
import { menuItems, recipeItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { error } = await requireUser(["OWNER", "STAFF"]);
  if (error) return error;
  const { id } = await ctx.params;
  const itemId = Number(id);
  const body = await req.json();
  const { nameEn, nameBn, category, description, price, imageUrl, isAvailable, prepTimeMinutes, recipe } = body;

  const patch: Record<string, unknown> = {};
  if (nameEn !== undefined) patch.nameEn = String(nameEn).trim();
  if (nameBn !== undefined) patch.nameBn = nameBn ? String(nameBn).trim() : null;
  if (category !== undefined) patch.category = String(category).trim() || "Main Course";
  if (description !== undefined) patch.description = description ? String(description).trim() : null;
  if (price !== undefined) patch.price = String(Number(price) || 0);
  if (imageUrl !== undefined) patch.imageUrl = imageUrl || null;
  if (isAvailable !== undefined) patch.isAvailable = Boolean(isAvailable);
  if (prepTimeMinutes !== undefined) patch.prepTimeMinutes = Number(prepTimeMinutes) || 15;

  const [item] = await db.update(menuItems).set(patch).where(eq(menuItems.id, itemId)).returning();
  if (!item) return Response.json({ error: "Menu item not found" }, { status: 404 });

  if (Array.isArray(recipe)) {
    await db.delete(recipeItems).where(eq(recipeItems.menuItemId, itemId));
    for (const r of recipe) {
      if (!r.ingredientId || !(Number(r.qtyPerServing) > 0)) continue;
      await db.insert(recipeItems).values({
        menuItemId: itemId,
        ingredientId: Number(r.ingredientId),
        qtyPerServing: String(Number(r.qtyPerServing)),
      });
    }
  }
  return Response.json({ item });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { error } = await requireUser(["OWNER"]);
  if (error) return error;
  const { id } = await ctx.params;
  await db.delete(menuItems).where(eq(menuItems.id, Number(id)));
  return Response.json({ ok: true });
}
