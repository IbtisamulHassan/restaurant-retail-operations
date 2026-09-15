import { db } from "@/db";
import { orders, orderItems, recipeItems, ingredients, menuItems, wasteLogs } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { REVENUE_STATUSES } from "@/lib/utils";

/**
 * AI-assisted demand forecasting (demo heuristic):
 *  - aggregates completed/served order items by menu item + day-of-week
 *  - projects the next 7 days using a day-of-week moving average
 *  - rolls item demand through recipes into ingredient purchase needs
 *
 * NOTE: A production version would call a dedicated ML forecasting service
 * (e.g. a hosted time-series model) instead of this in-house heuristic.
 */
export async function GET() {
  const { error } = await requireUser();
  if (error) return error;

  const allOrders = await db.select().from(orders);
  const revenueOrders = allOrders.filter((o) => (REVENUE_STATUSES as readonly string[]).includes(o.status));
  const orderMap = new Map(revenueOrders.map((o) => [o.id, o]));
  const items = await db.select().from(orderItems);
  const menu = await db.select().from(menuItems);
  const menuMap = new Map(menu.map((m) => [m.id, m]));

  // Aggregate qty per menu item per weekday (0=Sun..6=Sat)
  const agg = new Map<number, Map<number, { qty: number; days: Set<string> }>>();
  for (const it of items) {
    const ord = orderMap.get(it.orderId);
    if (!ord || !it.menuItemId) continue;
    const d = new Date(ord.createdAt);
    const dow = d.getDay();
    const dayKey = d.toISOString().slice(0, 10);
    if (!agg.has(it.menuItemId)) agg.set(it.menuItemId, new Map());
    const m = agg.get(it.menuItemId)!;
    if (!m.has(dow)) m.set(dow, { qty: 0, days: new Set() });
    const rec = m.get(dow)!;
    rec.qty += it.qty;
    rec.days.add(dayKey);
  }

  // Next 7 days projection
  const days: { date: string; dow: number; label: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      date: d.toISOString().slice(0, 10),
      dow: d.getDay(),
      label: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
    });
  }

  const forecast = menu
    .map((m) => {
      const perDay = days.map((day) => {
        const rec = agg.get(m.id)?.get(day.dow);
        const avg = rec && rec.days.size > 0 ? rec.qty / rec.days.size : 0;
        return { ...day, estQty: Math.round(avg * 10) / 10 };
      });
      const total7 = perDay.reduce((s, d) => s + d.estQty, 0);
      return {
        menuItemId: m.id,
        name: m.nameEn,
        nameBn: m.nameBn,
        category: m.category,
        price: Number(m.price),
        perDay,
        total7: Math.round(total7 * 10) / 10,
        estRevenue7: Math.round(total7 * Number(m.price)),
      };
    })
    .filter((f) => f.total7 > 0)
    .sort((a, b) => b.total7 - a.total7);

  // Roll up through recipes into ingredient requirements
  const need = new Map<number, number>();
  for (const f of forecast) {
    const recipes = await db.select().from(recipeItems).where(inArray(recipeItems.menuItemId, [f.menuItemId]));
    for (const r of recipes) {
      need.set(r.ingredientId, (need.get(r.ingredientId) ?? 0) + Number(r.qtyPerServing) * f.total7);
    }
  }
  const ings = need.size
    ? await db.select().from(ingredients).where(inArray(ingredients.id, [...need.keys()]))
    : [];
  const purchaseList = ings
    .map((ing) => {
      const required = need.get(ing.id) ?? 0;
      const stock = Number(ing.stockQty);
      const toBuy = Math.max(0, required - stock);
      return {
        ingredientId: ing.id,
        name: ing.name,
        unit: ing.unit,
        required: Math.round(required * 100) / 100,
        inStock: Math.round(stock * 100) / 100,
        toBuy: Math.round(toBuy * 100) / 100,
        estCost: Math.round(toBuy * Number(ing.costPerUnit)),
        supplier: ing.supplier,
        lowStock: stock <= Number(ing.lowStockThreshold),
      };
    })
    .sort((a, b) => b.estCost - a.estCost);

  // Waste summary for the same screen
  const waste = await db.select().from(wasteLogs);
  const wasteByReason = new Map<string, number>();
  let wasteTotal = 0;
  for (const w of waste) {
    wasteTotal += Number(w.costImpact);
    wasteByReason.set(w.reason, (wasteByReason.get(w.reason) ?? 0) + Number(w.costImpact));
  }

  return Response.json({
    days,
    forecast,
    purchaseList,
    wasteSummary: {
      total: Math.round(wasteTotal),
      byReason: [...wasteByReason.entries()].map(([reason, cost]) => ({ reason, cost: Math.round(cost) })),
    },
  });
}
