import { NextRequest } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/server";

export async function GET() {
  const { error } = await requireUser();
  if (error) return error;
  const s = await getSettings();
  return Response.json({ settings: s });
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireUser(["OWNER"]);
  if (error) return error;
  const body = await req.json();
  const s = await getSettings();

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (body.businessName !== undefined) patch.businessName = String(body.businessName).trim() || s.businessName;
  if (body.logoUrl !== undefined) patch.logoUrl = body.logoUrl ? String(body.logoUrl) : null;
  if (body.pointsPer10Taka !== undefined) patch.pointsPer10Taka = String(Number(body.pointsPer10Taka) || 1);
  if (body.tierSilverSpend !== undefined) patch.tierSilverSpend = String(Number(body.tierSilverSpend) || 0);
  if (body.tierGoldSpend !== undefined) patch.tierGoldSpend = String(Number(body.tierGoldSpend) || 0);
  if (body.defaultLowStockThreshold !== undefined)
    patch.defaultLowStockThreshold = String(Number(body.defaultLowStockThreshold) || 0);
  if (body.marginAlertPct !== undefined) patch.marginAlertPct = String(Number(body.marginAlertPct) || 20);
  if (body.language !== undefined && ["en", "bn"].includes(body.language)) patch.language = body.language;

  const [row] = await db.update(settings).set(patch).where(eq(settings.id, s.id)).returning();
  return Response.json({ settings: row });
}
