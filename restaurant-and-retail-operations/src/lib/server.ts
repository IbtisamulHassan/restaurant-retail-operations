import { db } from "@/db";
import {
  settings,
  customers,
  loyaltyTransactions,
  orders,
  orderItems,
  recipeItems,
  ingredients,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export type AppSettings = typeof settings.$inferSelect;

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.select().from(settings).limit(1);
  if (rows[0]) return rows[0];
  const inserted = await db.insert(settings).values({}).returning();
  return inserted[0];
}

/** Normalise a BD phone number to digits (keep leading 0). */
export function normPhone(raw: string) {
  let p = raw.replace(/[^\d+]/g, "");
  if (p.startsWith("+880")) p = "0" + p.slice(4);
  if (p.startsWith("880")) p = "0" + p.slice(3);
  return p;
}

/**
 * Side effects when an order reaches COMPLETED:
 *  - link/create customer by phone
 *  - loyalty earn + lifetime spend + visit count
 *  - deduct ingredient stock via recipe
 */
export async function onOrderCompleted(orderId: number) {
  const ord = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
  if (!ord) return;
  const s = await getSettings();

  // Deduct stock from recipes
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const it of items) {
    if (!it.menuItemId) continue;
    const recipe = await db.select().from(recipeItems).where(eq(recipeItems.menuItemId, it.menuItemId));
    for (const r of recipe) {
      const delta = Number(r.qtyPerServing) * it.qty;
      await db
        .update(ingredients)
        .set({ stockQty: sql`GREATEST(0, ${ingredients.stockQty} - ${delta})` })
        .where(eq(ingredients.id, r.ingredientId));
    }
  }

  // Loyalty + CRM link
  const phone = ord.customerPhone ? normPhone(ord.customerPhone) : null;
  let customerId = ord.customerId;
  if (phone) {
    let cust = (await db.select().from(customers).where(eq(customers.phone, phone)).limit(1))[0];
    if (!cust) {
      const created = await db
        .insert(customers)
        .values({ name: ord.customerName || "Guest " + phone.slice(-4), phone })
        .returning();
      cust = created[0];
    }
    customerId = cust.id;

    const points = Math.floor((Number(ord.total) / 10) * Number(s.pointsPer10Taka));
    const newBalance = cust.loyaltyBalance + points;
    await db
      .update(customers)
      .set({
        lifetimeSpend: sql`${customers.lifetimeSpend} + ${Number(ord.total)}`,
        visitCount: sql`${customers.visitCount} + 1`,
        loyaltyBalance: newBalance,
      })
      .where(eq(customers.id, cust.id));
    await db.insert(loyaltyTransactions).values({
      customerId: cust.id,
      orderId,
      type: "EARN",
      points,
      balanceAfter: newBalance,
      note: `Order ${ord.orderNumber}`,
    });
    await db
      .update(orders)
      .set({ customerId: cust.id, pointsEarned: points })
      .where(eq(orders.id, orderId));
  } else if (customerId) {
    await db
      .update(customers)
      .set({
        lifetimeSpend: sql`${customers.lifetimeSpend} + ${Number(ord.total)}`,
        visitCount: sql`${customers.visitCount} + 1`,
      })
      .where(eq(customers.id, customerId));
  }
}

export function csvEscape(v: unknown) {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
}

export function csvResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
