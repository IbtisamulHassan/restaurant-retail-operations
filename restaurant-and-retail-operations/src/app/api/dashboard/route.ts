import { db } from "@/db";
import {
  orders,
  orderItems,
  menuItems,
  ingredients,
  wasteLogs,
  loyaltyTransactions,
  tables,
} from "@/db/schema";
import { desc, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/server";
import { REVENUE_STATUSES, todayStr } from "@/lib/utils";
import { attachCosting } from "@/app/api/menu-items/route";

export async function GET() {
  const { error } = await requireUser();
  if (error) return error;
  const s = await getSettings();

  const [allOrders, allItems, allIngredients, allWaste, loyaltyRows, tableRows, menu] =
    await Promise.all([
      db.select().from(orders).orderBy(desc(orders.createdAt)),
      db.select().from(orderItems),
      db.select().from(ingredients),
      db.select().from(wasteLogs).orderBy(desc(wasteLogs.loggedAt)),
      db.select().from(loyaltyTransactions).orderBy(desc(loyaltyTransactions.createdAt)),
      db.select().from(tables),
      db.select().from(menuItems),
    ]);

  const today = todayStr();
  const isToday = (d: Date) => new Date(d).toISOString().slice(0, 10) === today;
  const revenueToday = allOrders.filter(
    (o) => isToday(o.createdAt) && (REVENUE_STATUSES as readonly string[]).includes(o.status)
  );
  const todaysSales = revenueToday.reduce((sum, o) => sum + Number(o.total), 0);
  const ordersToday = allOrders.filter((o) => isToday(o.createdAt)).length;

  // Top 5 selling items (all time by qty)
  const orderMap = new Map(
    allOrders
      .filter((o) => (REVENUE_STATUSES as readonly string[]).includes(o.status))
      .map((o) => [o.id, o])
  );
  const qtyByItem = new Map<number, { qty: number; revenue: number }>();
  for (const it of allItems) {
    if (!orderMap.has(it.orderId) || !it.menuItemId) continue;
    const rec = qtyByItem.get(it.menuItemId) ?? { qty: 0, revenue: 0 };
    rec.qty += it.qty;
    rec.revenue += Number(it.lineTotal);
    qtyByItem.set(it.menuItemId, rec);
  }
  const menuMap = new Map(menu.map((m) => [m.id, m]));
  const topItems = [...qtyByItem.entries()]
    .map(([id, r]) => ({ id, name: menuMap.get(id)?.nameEn ?? "Unknown", ...r }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const lowStock = allIngredients
    .filter((i) => Number(i.stockQty) <= Number(i.lowStockThreshold))
    .map((i) => ({
      id: i.id,
      name: i.name,
      stockQty: Number(i.stockQty),
      lowStockThreshold: Number(i.lowStockThreshold),
      unit: i.unit,
    }));

  const withCost = await attachCosting(menu, Number(s.marginAlertPct));
  const lowMarginItems = withCost
    .filter((m) => m.lowMargin)
    .map((m) => ({ id: m.id, name: m.nameEn, marginPct: Math.round(m.marginPct), price: m.price }));

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const weekWaste = allWaste.filter((w) => w.loggedAt >= weekAgo);
  const wasteCostWeek = weekWaste.reduce((sum, w) => sum + Number(w.costImpact), 0);

  const pointsToday = loyaltyRows
    .filter((l) => l.type === "EARN" && isToday(l.createdAt))
    .reduce((sum, l) => sum + l.points, 0);

  // Sales by weekday (for dashboard chart, last 4 weeks)
  const salesByDow = [0, 0, 0, 0, 0, 0, 0];
  for (const o of orderMap.values()) {
    salesByDow[new Date(o.createdAt).getDay()] += Number(o.total);
  }

  // Hourly distribution of orders
  const ordersByHour = new Array(24).fill(0) as number[];
  for (const o of allOrders) ordersByHour[new Date(o.createdAt).getHours()]++;

  const recentOrders = allOrders.slice(0, 8).map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    total: Number(o.total),
    status: o.status,
    createdAt: o.createdAt,
    tableId: o.tableId,
    tableName: o.tableId ? tableRows.find((t) => t.id === o.tableId)?.name ?? null : null,
    orderType: o.orderType,
  }));
  const ingMap = new Map(allIngredients.map((i) => [i.id, i.name]));
  const recentWaste = allWaste.slice(0, 6).map((w) => ({
    id: w.id,
    ingredientName: ingMap.get(w.ingredientId) ?? "Unknown",
    qty: Number(w.qty),
    unit: w.unit,
    reason: w.reason,
    costImpact: Number(w.costImpact),
    loggedAt: w.loggedAt,
  }));

  return Response.json({
    kpis: {
      todaysSales,
      ordersToday,
      topItems,
      lowStock,
      lowStockCount: lowStock.length,
      lowMarginItems,
      wasteCostWeek,
      pointsToday,
      activeOrders: allOrders.filter((o) =>
        ["PENDING", "CONFIRMED", "PREPARING", "READY"].includes(o.status)
      ).length,
      totalCustomers: undefined as undefined,
    },
    salesByDow,
    ordersByHour,
    recentOrders,
    recentWaste,
    businessName: s.businessName,
  });
}
