import { NextRequest } from "next/server";
import { db } from "@/db";
import { tables } from "@/db/schema";
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
  if (body.status !== undefined && ["AVAILABLE", "OCCUPIED"].includes(body.status)) patch.status = body.status;
  const [row] = await db.update(tables).set(patch).where(eq(tables.id, Number(id))).returning();
  if (!row) return Response.json({ error: "Table not found" }, { status: 404 });
  return Response.json({ table: row });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { error } = await requireUser(["OWNER"]);
  if (error) return error;
  const { id } = await ctx.params;
  await db.delete(tables).where(eq(tables.id, Number(id)));
  return Response.json({ ok: true });
}
