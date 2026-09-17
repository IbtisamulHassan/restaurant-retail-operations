import { NextResponse } from "next/server";
import { runSeed } from "@/db/seed-logic";

export async function GET() {
  try {
    await runSeed();
    return NextResponse.json({ ok: true, message: "Seed complete!" });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
