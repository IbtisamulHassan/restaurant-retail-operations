import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { count } from "drizzle-orm";
import { getUserByEmail, createSessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role } = (await req.json()) as {
      name?: string;
      email?: string;
      password?: string;
      role?: "OWNER" | "STAFF" | "KITCHEN";
    };
    if (!name?.trim() || !email || !password || password.length < 6) {
      return Response.json(
        { error: "Name, valid email and a password of 6+ characters are required" },
        { status: 400 }
      );
    }
    const existing = await getUserByEmail(email);
    if (existing) return Response.json({ error: "An account with this email already exists" }, { status: 409 });

    // First ever user is always OWNER; afterwards honour the requested role (demo mode).
    const [{ value: total }] = await db.select({ value: count() }).from(users);
    const assignedRole = total === 0 ? "OWNER" : role ?? "STAFF";

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(users)
      .values({ name: name.trim(), email: email.toLowerCase().trim(), passwordHash, role: assignedRole })
      .returning();

    const token = await createSessionToken({ id: user.id, name: user.name, email: user.email, role: user.role });
    const store = await cookies();
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return Response.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Signup failed" }, { status: 500 });
  }
}
