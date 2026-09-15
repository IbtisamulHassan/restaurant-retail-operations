import { NextRequest } from "next/server";
import QRCode from "qrcode";
import { db } from "@/db";
import { tables } from "@/db/schema";
import { requireUser } from "@/lib/auth";

async function withQr(rows: (typeof tables.$inferSelect)[], origin: string) {
  return Promise.all(
    rows.map(async (t) => ({
      ...t,
      url: `${origin}/m/${t.id}`,
      qr: await QRCode.toDataURL(`${origin}/m/${t.id}`, { width: 320, margin: 1 }),
    }))
  );
}

export async function GET(req: NextRequest) {
  const { error } = await requireUser();
  if (error) return error;
  const rows = await db.select().from(tables);
  rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const origin = new URL(req.url).origin;
  return Response.json({ tables: await withQr(rows, origin) });
}

export async function POST(req: NextRequest) {
  const { error } = await requireUser(["OWNER", "STAFF"]);
  if (error) return error;
  const body = await req.json();
  if (!body.name?.trim()) return Response.json({ error: "Table name is required" }, { status: 400 });
  const [row] = await db.insert(tables).values({ name: body.name.trim() }).returning();
  const origin = new URL(req.url).origin;
  const [withCode] = await withQr([row], origin);
  return Response.json({ table: withCode }, { status: 201 });
}
