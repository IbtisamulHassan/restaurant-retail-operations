import { NextRequest } from "next/server";
import { db } from "@/db";
import { menuItems, recipeItems, ingredients } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/server";

export async function attachCosting(
  items: (typeof menuItems.$inferSelect)[],
  marginAlertPct: number
) {
  if (items.length === 0) return [];
  const ids = items.map((i) => i.id);
  const recipes = await db.select().from(recipeItems).where(inArray(recipeItems.menuItemId, ids));
  const ingIds = [...new Set(recipes.map((r) => r.ingredientId))];
  const ings = ingIds.length
    ? await db.select().from(ingredients).where(inArray(ingredients.id, ingIds))
    : [];
  const ingMap = new Map(ings.map((i) => [i.id, i]));

  return items.map((item) => {
    const recipe = recipes
      .filter((r) => r.menuItemId === item.id)
      .map((r) => {
        const ing = ingMap.get(r.ingredientId);
        const lineCost = Number(r.qtyPerServing) * Number(ing?.costPerUnit ?? 0);
        return {
          id: r.id,
          ingredientId: r.ingredientId,
          ingredientName: ing?.name ?? "Unknown",
          unit: ing?.unit ?? "pcs",
          qtyPerServing: Number(r.qtyPerServing),
          lineCost,
        };
      });
    const costPerItem = recipe.reduce((s, r) => s + r.lineCost, 0);
    const price = Number(item.price);
    const grossMargin = price - costPerItem;
    const marginPct = price > 0 ? (grossMargin / price) * 100 : 0;
    return {
      ...item,
      price,
      recipe,
      costPerItem,
      grossMargin,
      marginPct,
      lowMargin: price > 0 && recipe.length > 0 && marginPct < marginAlertPct,
    };
  });
}

export async function GET() {
  const { error } = await requireUser();
  if (error) return error;
  const s = await getSettings();
  const items = await db.select().from(menuItems);
  items.sort((a, b) => a.category.localeCompare(b.category) || a.nameEn.localeCompare(b.nameEn));
  const withCost = await attachCosting(items, Number(s.marginAlertPct));
  return Response.json({ items: withCost });
}

export async function POST(req: NextRequest) {
  const { error } = await requireUser(["OWNER", "STAFF"]);
  if (error) return error;
  const body = await req.json();
  const { nameEn, nameBn, category, description, price, imageUrl, isAvailable, prepTimeMinutes, recipe } = body;
  if (!nameEn?.trim()) return Response.json({ error: "English name is required" }, { status: 400 });
  const [item] = await db
    .insert(menuItems)
    .values({
      nameEn: nameEn.trim(),
      nameBn: nameBn?.trim() || null,
      category: category?.trim() || "Main Course",
      description: description?.trim() || null,
      price: String(Number(price) || 0),
      imageUrl: imageUrl || null,
      isAvailable: isAvailable !== false,
      prepTimeMinutes: Number(prepTimeMinutes) || 15,
    })
    .returning();
  if (Array.isArray(recipe)) {
    for (const r of recipe) {
      if (!r.ingredientId || !(Number(r.qtyPerServing) > 0)) continue;
      await db.insert(recipeItems).values({
        menuItemId: item.id,
        ingredientId: Number(r.ingredientId),
        qtyPerServing: String(Number(r.qtyPerServing)),
      });
    }
  }
  return Response.json({ item }, { status: 201 });
}
