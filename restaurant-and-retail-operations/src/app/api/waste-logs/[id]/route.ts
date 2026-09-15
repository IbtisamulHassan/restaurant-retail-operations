import { NextRequest } from "next/server";
import { db } from "@/db";
import { wasteLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { error } = await requireUser(["OWNER", "STAFF"]);
  if (error) return error;
  const { id } = await ctx.params;
  await db.delete(wasteLogs).where(eq(wasteLogs.id, Number(id)));
  return Response.json({ ok: true });
}
