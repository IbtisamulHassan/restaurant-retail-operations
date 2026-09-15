import { NextRequest } from "next/server";
import { db } from "@/db";
import { ingredients } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/server";

export async function GET() {
  const { error } = await requireUser();
  if (error) return error;
  const rows = await db.select().from(ingredients);
  rows.sort((a, b) => a.name.localeCompare(b.name));
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  return Response.json({
    ingredients: rows.map((r) => ({
      ...r,
      costPerUnit: Number(r.costPerUnit),
      stockQty: Number(r.stockQty),
      lowStockThreshold: Number(r.lowStockThreshold),
      lowStock: Number(r.stockQty) <= Number(r.lowStockThreshold),
      nearExpiry: !!r.expiryDate && r.expiryDate <= soon,
      expired: !!r.expiryDate && r.expiryDate < today,
      stockValue: Number(r.stockQty) * Number(r.costPerUnit),
    })),
  });
}

export async function POST(req: NextRequest) {
  const { error } = await requireUser(["OWNER", "STAFF"]);
  if (error) return error;
  const s = await getSettings();
  const body = await req.json();
  const { name, unit, costPerUnit, stockQty, lowStockThreshold, expiryDate, supplier } = body;
  if (!name?.trim()) return Response.json({ error: "Ingredient name is required" }, { status: 400 });
  const [row] = await db
    .insert(ingredients)
    .values({
      name: name.trim(),
      unit: unit ?? "kg",
      costPerUnit: String(Number(costPerUnit) || 0),
      stockQty: String(Number(stockQty) || 0),
      lowStockThreshold: String(
        lowStockThreshold !== undefined && lowStockThreshold !== ""
          ? Number(lowStockThreshold)
          : Number(s.defaultLowStockThreshold)
      ),
      expiryDate: expiryDate || null,
      supplier: supplier?.trim() || null,
    })
    .returning();
  return Response.json({ ingredient: row }, { status: 201 });
}
