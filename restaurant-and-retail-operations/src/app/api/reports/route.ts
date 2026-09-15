import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  orders,
  orderItems,
  menuItems,
  customers,
  wasteLogs,
  ingredients,
  recipeItems,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getSettings, toCsv, csvResponse } from "@/lib/server";
import { REVENUE_STATUSES, todayStr, tierForSpend } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { error } = await requireUser(["OWNER"]);
  if (error) return error;
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "sales";
  const format = url.searchParams.get("format") ?? "json";
  const from = url.searchParams.get("from") || todayStr(-30);
  const to = url.searchParams.get("to") || todayStr();

  const [allOrders, allItems, menu, custs, waste, ings, recipes, s] = await Promise.all([
    db.select().from(orders),
    db.select().from(orderItems),
    db.select().from(menuItems),
    db.select().from(customers),
    db.select().from(wasteLogs),
    db.select().from(ingredients),
    db.select().from(recipeItems),
    getSettings(),
  ]);

  const inRange = (d: Date | string) => {
    const key = typeof d === "string" ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10);
    return key >= from && key <= to;
  };
  const revenueOrders = allOrders.filter(
    (o) => inRange(o.createdAt) && (REVENUE_STATUSES as readonly string[]).includes(o.status)
  );
  const orderMap = new Map(revenueOrders.map((o) => [o.id, o]));

  if (type === "sales") {
    const byDateItem = new Map<string, { date: string; item: string; qty: number; revenue: number }>();
    const byDate = new Map<string, { orders: Set<number>; revenue: number }>();
    for (const it of allItems) {
      const o = orderMap.get(it.orderId);
      if (!o) continue;
      const date = new Date(o.createdAt).toISOString().slice(0, 10);
      const key = `${date}|${it.nameSnapshot}`;
      const rec = byDateItem.get(key) ?? { date, item: it.nameSnapshot, qty: 0, revenue: 0 };
      rec.qty += it.qty;
      rec.revenue += Number(it.lineTotal);
      byDateItem.set(key, rec);
      const d = byDate.get(date) ?? { orders: new Set(), revenue: 0 };
      d.orders.add(o.id);
      d.revenue += Number(it.lineTotal);
      byDate.set(date, d);
    }
    const rows = [...byDateItem.values()].sort((a, b) => a.date.localeCompare(b.date));
    if (format === "csv") {
      return csvResponse(
        `sales-report-${from}-to-${to}.csv`,
        toCsv(
          ["Date", "Item", "Qty Sold", "Revenue (BDT)"],
          rows.map((r) => [r.date, r.item, r.qty, r.revenue.toFixed(2)])
        )
      );
    }
    return Response.json({
      rows,
      daily: [...byDate.entries()]
        .map(([date, d]) => ({ date, orders: d.orders.size, revenue: Math.round(d.revenue) }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      totalRevenue: Math.round(rows.reduce((s2, r) => s2 + r.revenue, 0)),
      totalQty: rows.reduce((s2, r) => s2 + r.qty, 0),
    });
  }

  if (type === "profitability") {
    const ingMap = new Map(ings.map((i) => [i.id, i]));
    const costByItem = new Map<number, number>();
    for (const r of recipes) {
      const ing = ingMap.get(r.ingredientId);
      costByItem.set(
        r.menuItemId,
        (costByItem.get(r.menuItemId) ?? 0) + Number(r.qtyPerServing) * Number(ing?.costPerUnit ?? 0)
      );
    }
    const soldByItem = new Map<number, { qty: number; revenue: number }>();
    for (const it of allItems) {
      if (!orderMap.has(it.orderId) || !it.menuItemId) continue;
      const rec = soldByItem.get(it.menuItemId) ?? { qty: 0, revenue: 0 };
      rec.qty += it.qty;
      rec.revenue += Number(it.lineTotal);
      soldByItem.set(it.menuItemId, rec);
    }
    const rows = menu
      .map((m) => {
        const sold = soldByItem.get(m.id) ?? { qty: 0, revenue: 0 };
        const unitCost = costByItem.get(m.id) ?? 0;
        const totalCost = unitCost * sold.qty;
        const profit = sold.revenue - totalCost;
        const marginPct = sold.revenue > 0 ? (profit / sold.revenue) * 100 : 0;
        return {
          item: m.nameEn,
          category: m.category,
          price: Number(m.price),
          unitCost: Math.round(unitCost),
          qty: sold.qty,
          revenue: Math.round(sold.revenue),
          totalCost: Math.round(totalCost),
          profit: Math.round(profit),
          marginPct: Math.round(marginPct * 10) / 10,
        };
      })
      .sort((a, b) => b.profit - a.profit);
    if (format === "csv") {
      return csvResponse(
        `profitability-report-${from}-to-${to}.csv`,
        toCsv(
          ["Item", "Category", "Price (BDT)", "Unit Cost (BDT)", "Qty Sold", "Revenue (BDT)", "Total Cost (BDT)", "Profit (BDT)", "Margin %"],
          rows.map((r) => [r.item, r.category, r.price, r.unitCost, r.qty, r.revenue, r.totalCost, r.profit, r.marginPct])
        )
      );
    }
    return Response.json({ rows });
  }

  if (type === "customers") {
    const silver = Number(s.tierSilverSpend);
    const gold = Number(s.tierGoldSpend);
    const ordersByCust = new Map<number, number>();
    for (const o of revenueOrders) {
      if (o.customerId) ordersByCust.set(o.customerId, (ordersByCust.get(o.customerId) ?? 0) + 1);
    }
    const repeatBase = custs.filter((c) => c.visitCount > 0).length;
    const repeatCount = custs.filter((c) => c.visitCount > 1).length;
    const rows = custs
      .map((c) => ({
        name: c.name,
        phone: c.phone,
        tag: c.tag,
        tier: tierForSpend(Number(c.lifetimeSpend), silver, gold),
        visits: c.visitCount,
        lifetimeSpend: Math.round(Number(c.lifetimeSpend)),
        loyaltyBalance: c.loyaltyBalance,
        joinedAt: c.joinedAt.toISOString().slice(0, 10),
      }))
      .sort((a, b) => b.lifetimeSpend - a.lifetimeSpend)
      .slice(0, 100);
    if (format === "csv") {
      return csvResponse(
        `customer-report.csv`,
        toCsv(
          ["Name", "Phone", "Tag", "Tier", "Visits", "Lifetime Spend (BDT)", "Loyalty Points", "Joined"],
          rows.map((r) => [r.name, r.phone, r.tag, r.tier, r.visits, r.lifetimeSpend, r.loyaltyBalance, r.joinedAt])
        )
      );
    }
    return Response.json({
      rows,
      repeatPurchaseRate: repeatBase ? Math.round((repeatCount / repeatBase) * 100) : 0,
      totalCustomers: custs.length,
    });
  }

  if (type === "waste") {
    const ingMap = new Map(ings.map((i) => [i.id, i]));
    const rows = waste
      .filter((w) => inRange(w.loggedAt))
      .map((w) => ({
        date: w.loggedAt,
        ingredient: ingMap.get(w.ingredientId)?.name ?? "Unknown",
        qty: Number(w.qty),
        unit: w.unit,
        reason: w.reason,
        cost: Math.round(Number(w.costImpact)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    if (format === "csv") {
      return csvResponse(
        `waste-report-${from}-to-${to}.csv`,
        toCsv(
          ["Date", "Ingredient", "Qty", "Unit", "Reason", "Cost Impact (BDT)"],
          rows.map((r) => [r.date, r.ingredient, r.qty, r.unit, r.reason, r.cost])
        )
      );
    }
    const byReason = new Map<string, number>();
    const byIngredient = new Map<string, number>();
    for (const r of rows) {
      byReason.set(r.reason, (byReason.get(r.reason) ?? 0) + r.cost);
      byIngredient.set(r.ingredient, (byIngredient.get(r.ingredient) ?? 0) + r.cost);
    }
    return Response.json({
      rows,
      totalCost: rows.reduce((s2, r) => s2 + r.cost, 0),
      byIngredient: [...byIngredient.entries()]
        .map(([name, cost]) => ({ name, cost }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 8),
      byReason: [...byReason.entries()].map(([reason, cost]) => ({ reason, cost })),
    });
  }

  return Response.json({ error: "Unknown report type" }, { status: 400 });
}

// silence unused warning for tables referenced for future joins
void recipeItems;
void customers;
void ingredients;
