import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "restoops-dev-secret-change-in-production-0123456789"
);

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: "OWNER" | "STAFF" | "KITCHEN";
};

export const SESSION_COOKIE = "restoops_session";

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    if (!payload.id || !payload.email) return null;
    return {
      id: Number(payload.id),
      name: String(payload.name ?? ""),
      email: String(payload.email),
      role: (payload.role as SessionUser["role"]) ?? "STAFF",
    };
  } catch {
    return null;
  }
}

export async function requireUser(roles?: SessionUser["role"][]) {
  const session = await getSession();
  if (!session) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }
  if (roles && !roles.includes(session.role)) {
    return { error: Response.json({ error: "Forbidden — insufficient role" }, { status: 403 }), session: null };
  }
  return { error: null, session };
}

export async function getUserByEmail(email: string) {
  const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
  return rows[0] ?? null;
}
