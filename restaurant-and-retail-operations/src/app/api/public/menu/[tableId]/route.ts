import { db } from "@/db";
import { tables, menuItems, settings } from "@/db/schema";
import { eq } from "drizzle-orm";

type Ctx = { params: Promise<{ tableId: string }> };

/** Public (no auth): table info + available menu grouped by category. */
export async function GET(_req: Request, ctx: Ctx) {
  const { tableId } = await ctx.params;

  if (tableId === "takeaway" || tableId === "delivery") {
    return menuResponse(null, tableId.toUpperCase());
  }

  const id = Number(tableId);
  if (!Number.isFinite(id)) return Response.json({ error: "Invalid table" }, { status: 400 });
  const table = (await db.select().from(tables).where(eq(tables.id, id)).limit(1))[0];
  if (!table) return Response.json({ error: "Table not found" }, { status: 404 });
  return menuResponse(table, "DINE_IN");
}

async function menuResponse(table: { id: number; name: string; status: string } | null, orderType: string) {
  const [s, items] = await Promise.all([db.select().from(settings).limit(1), db.select().from(menuItems)]);
  const available = items.filter((i) => i.isAvailable);
  const categories = [...new Set(available.map((i) => i.category))].sort();
  return Response.json({
    table,
    orderType,
    businessName: s[0]?.businessName ?? "Restaurant",
    categories,
    items: available.map((i) => ({
      id: i.id,
      nameEn: i.nameEn,
      nameBn: i.nameBn,
      category: i.category,
      description: i.description,
      price: Number(i.price),
      imageUrl: i.imageUrl,
      prepTimeMinutes: i.prepTimeMinutes,
    })),
  });
}
