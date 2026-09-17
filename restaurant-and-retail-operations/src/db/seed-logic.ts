/*
 * Demo seed for RestOpsBD — restaurant & retail operations platform.
 * Run with:  npx tsx src/db/seed.ts
 * Idempotent—wipes all business tables and reseeds from scratch.
 */
import { db, pool } from "./index";
import {
  users, settings, menuItems, ingredients, recipeItems, tables,
  customers, orders, orderItems, orderStatusEvents,
  loyaltyTransactions, feedback, wasteLogs,
} from "./schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

/* deterministic PRNG so reseeds look the same */
let seed = 42;
function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)];
const between = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));

export async function runSeed() {
  console.log("Seeding…");

  /* wipe */
  await db.delete(feedback);
  await db.delete(loyaltyTransactions);
  await db.delete(orderStatusEvents);
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(recipeItems);
  await db.delete(wasteLogs);
  await db.delete(customers);
  await db.delete(tables);
  await db.delete(menuItems);
  await db.delete(ingredients);
  await db.delete(users);
  await db.delete(settings);

  /* users */
  const hash = (p: string) => bcrypt.hashSync(p, 10);
  await db.insert(users).values([
    { name: "Rahim Uddin", email: "owner@dhakaflavours.com", passwordHash: hash("admin123"), role: "OWNER" },
    { name: "Sumi Akter", email: "staff@dhakaflavours.com", passwordHash: hash("staff123"), role: "STAFF" },
    { name: "Karim Hossain", email: "kitchen@dhakaflavours.com", passwordHash: hash("kitchen123"), role: "KITCHEN" },
  ]);

  await db.insert(settings).values({
    businessName: "Dhaka Flavours",
    pointsPer10Taka: "1",
    tierSilverSpend: "10000",
    tierGoldSpend: "30000",
    defaultLowStockThreshold: "5",
    marginAlertPct: "20",
  });

  /* ------------------------------ ingredients ----------------------------- */
  // [name, unit, costPerUnit, stock, lowThreshold, expiryDays|null, supplier]
  const ingSeed: [string, string, number, number, number, number | null, string][] = [
    ["Kalijira Rice", "kg", 185, 42, 10, null, "Mohammadpur Krishi Market"],
    ["Beef (Boneless)", "kg", 760, 3.5, 6, 2, "Gauranadi Meat Suppliers"],
    ["Broiler Chicken", "kg", 315, 18, 8, 3, "Bengal Poultry"],
    ["Mutton", "kg", 1180, 4, 3, 2, "Gauranadi Meat Suppliers"],
    ["Rui Fish", "kg", 390, 6, 4, 2, "Karwan Bazar Fish Hub"],
    ["Ilish (Hilsa)", "kg", 1550, 2.5, 2, 1, "Chandpur Fish Depot"],
    ["Shrimp (Bagda)", "kg", 920, 3, 2.5, 2, "Khulna Shrimp Co."],
    ["Potato", "kg", 42, 25, 10, 30, "Mohammadpur Krishi Market"],
    ["Onion", "kg", 82, 20, 8, 21, "Faridpur Onion Store"],
    ["Garlic", "kg", 225, 4, 2, 40, "Karwan Bazar Wholesale"],
    ["Ginger", "kg", 185, 3, 1.5, 25, "Karwan Bazar Wholesale"],
    ["Green Chili", "kg", 130, 1.2, 1, 4, "Mohammadpur Krishi Market"],
    ["Turmeric Powder", "kg", 430, 2, 1, 180, "Radhuni Spices"],
    ["Cumin", "kg", 565, 1.5, 0.5, 240, "Radhuni Spices"],
    ["Garam Masala", "kg", 820, 1, 0.5, 240, "Radhuni Spices"],
    ["Chili Powder", "kg", 385, 1.8, 0.8, 180, "Radhuni Spices"],
    ["Soybean Oil", "l", 192, 30, 12, 300, "Teer Oil Distributors"],
    ["Ghee", "kg", 1120, 3, 1, 200, "Aarong Dairy"],
    ["Milk", "l", 92, 8, 6, 3, "Pran Dairy"],
    ["Sour Yogurt", "kg", 168, 5, 3, 5, "Pran Dairy"],
    ["Atta Flour", "kg", 66, 15, 6, 120, "Teer Flour Mills"],
    ["Burger Bun", "pcs", 26, 40, 20, 4, "City Bakery"],
    ["Cheese Slice", "pcs", 42, 35, 15, 20, "Arla Foods BD"],
    ["Lettuce", "kg", 155, 1.5, 1, 3, "Mohammadpur Krishi Market"],
    ["Tomato", "kg", 62, 8, 4, 5, "Mohammadpur Krishi Market"],
    ["Egg", "pcs", 14.5, 60, 24, 12, "Bengal Poultry"],
    ["Masoor Dal", "kg", 132, 10, 4, 240, "Karwan Bazar Wholesale"],
    ["Sugar", "kg", 108, 12, 5, 365, "City Sugar Depot"],
    ["Frozen Fries", "kg", 245, 6, 3, 90, "Kazi Farms Cold Chain"],
    ["Fuchka Shell", "pcs", 4.2, 200, 80, 6, "Old Dhaka Snacks Supplier"],
    ["Tamarind", "kg", 255, 2, 1, 200, "Karwan Bazar Wholesale"],
    ["Chickpea (Chola)", "kg", 142, 6, 3, 240, "Karwan Bazar Wholesale"],
    ["Cucumber", "kg", 58, 3, 2, 5, "Mohammadpur Krishi Market"],
    ["Coriander Leaves", "kg", 105, 0.8, 0.5, 2, "Mohammadpur Krishi Market"],
    ["Mint Leaves", "kg", 120, 0.6, 0.4, 2, "Mohammadpur Krishi Market"],
    ["Cold Drink 250ml", "pcs", 32, 48, 24, 180, "Coca-Cola BD"],
    ["Mineral Water 500ml", "pcs", 18, 60, 36, 365, "Mum Water"],
    ["Condensed Milk", "kg", 420, 2, 1, 200, "Pran Dairy"],
  ];
  const ingRows = await db
    .insert(ingredients)
    .values(
      ingSeed.map(([name, unit, cost, stock, low, expDays, supplier]) => ({
        name,
        unit: unit as "kg" | "g" | "l" | "ml" | "pcs",
        costPerUnit: String(cost),
        stockQty: String(stock),
        lowStockThreshold: String(low),
        expiryDate: expDays ? new Date(Date.now() + expDays * 86400000).toISOString().slice(0, 10) : null,
        supplier,
      }))
    )
    .returning();
  const I = (name: string) => ingRows.find((r) => r.name === name)!.id;

  /* ------------------------------- menu items ------------------------------ */
  // [en, bn, category, desc, price, prepMin]
  const menuSeed: [string, string, string, string, number, number][] = [
    ["Chicken Tehari", "চিকেন তেহারি", "Rice & Biryani", "Aromatic kalijira rice slow-cooked with spiced chicken, potato and green chili — Old Dhaka style.", 220, 25],
    ["Beef Tehari", "বিফ তেহারি", "Rice & Biryani", "Rich mustard-oil beef tehari with fluffy rice and a kick of chili.", 280, 30],
    ["Mutton Kacchi", "মাটন কাচ্চি", "Rice & Biryani", "Layered kacchi biryani with tender mutton, potato, saffron milk and ghee.", 550, 45],
    ["Beef Kacchi", "বিফ কাচ্চি", "Rice & Biryani", "Classic beef kacchi with fragrant rice, aloo bukhara hints and crispy onion.", 450, 40],
    ["Beef Bhuna", "বিফ ভুনা", "Curry & Bhuna", "Slow-braised beef in thick spicy gravy — best with plain rice or khichuri.", 350, 35],
    ["Chicken Curry", "চিকেন কারি", "Curry & Bhuna", "Homestyle chicken curry with potato and Bengali garam masala.", 240, 25],
    ["Rui Fish Curry", "রুই মাছ কারি", "Curry & Bhuna", "Fresh rui fish simmered in light tomato-ginger gravy.", 260, 25],
    ["Ilish Bhuna", "ইলিশ ভুনা", "Curry & Bhuna", "The national fish — hilsa cooked in mustard paste and green chili.", 420, 30],
    ["Chingri Malai Curry", "চিংড়ি মালাই কারি", "Curry & Bhuna", "Bagda shrimp in a silky coconut-milk style malai gravy.", 480, 30],
    ["Vegetable Khichuri", "সবজি খিচুড়ি", "Rice & Biryani", "Comforting rice-lentil khichuri with seasonal vegetables and ghee.", 160, 20],
    ["Dal Tarka", "ডাল তাড়কা", "Sides", "Masoor dal tempered with garlic, dry chili and onion.", 90, 10],
    ["Plain Rice", "সাদা ভাত", "Sides", "Steamed kalijira rice, single serving.", 50, 5],
    ["Beef Haleem", "বিফ হালিম", "Snacks & Street Food", "Thick slow-cooked haleem with wheat, lentils and shredded beef.", 180, 35],
    ["Fuchka (8 pcs)", "ফুচকা (৮ পিস)", "Snacks & Street Food", "Crispy shells with spicy tamarind water, chola, potato and cucumber.", 60, 5],
    ["Chotpoti", "চটপটি", "Snacks & Street Food", "Tangy chola-potato chotpoti topped with egg, onion and fuchka crumbs.", 80, 10],
    ["Chicken Burger", "চিকেন বার্গার", "Fast Food", "Crispy fried chicken patty, cheese, lettuce and house mayo in a toasted bun.", 190, 15],
    ["Beef Burger", "বিফ বার্গার", "Fast Food", "Juicy smashed beef patty with double cheese and grilled onion.", 260, 18],
    ["French Fries", "ফ্রেঞ্চ ফ্রাইস", "Fast Food", "Golden crispy fries with chaat masala dust.", 120, 10],
    ["Borhani", "বোরহানি", "Drinks", "Traditional spiced yogurt drink with mint — the biryani essential.", 60, 5],
    ["Cold Drink", "কোল্ড ড্রিংক", "Drinks", "Chilled 250ml soft drink ( Coke / Sprite / Fanta ).", 35, 1],
    ["Mineral Water", "মিনারেল ওয়াটার", "Drinks", "500ml bottled drinking water.", 20, 1],
  ];
  const itemRows = await db
    .insert(menuItems)
    .values(menuSeed.map(([nameEn, nameBn, category, description, price, prep]) => ({
      nameEn, nameBn, category, description, price: String(price), prepTimeMinutes: prep, isAvailable: true,
    })))
    .returning();
  const M = (name: string) => itemRows.find((r) => r.nameEn === name)!.id;

  /* --------------------------------- recipes ------------------------------- */
  // menuItem -> [ingredient, qty]
  const recipeSeed: Record<string, [string, number][]> = {
    "Chicken Tehari": [["Kalijira Rice", 0.22], ["Broiler Chicken", 0.22], ["Potato", 0.08], ["Onion", 0.05], ["Garlic", 0.01], ["Ginger", 0.01], ["Green Chili", 0.01], ["Soybean Oil", 0.035], ["Turmeric Powder", 0.004], ["Garam Masala", 0.003]],
    "Beef Tehari": [["Kalijira Rice", 0.22], ["Beef (Boneless)", 0.22], ["Potato", 0.06], ["Onion", 0.05], ["Garlic", 0.012], ["Ginger", 0.012], ["Green Chili", 0.012], ["Soybean Oil", 0.04], ["Turmeric Powder", 0.004], ["Garam Masala", 0.004]],
    "Mutton Kacchi": [["Kalijira Rice", 0.28], ["Mutton", 0.22], ["Potato", 0.1], ["Onion", 0.06], ["Sour Yogurt", 0.06], ["Ghee", 0.03], ["Milk", 0.03], ["Garam Masala", 0.005], ["Ginger", 0.012], ["Garlic", 0.012]],
    "Beef Kacchi": [["Kalijira Rice", 0.28], ["Beef (Boneless)", 0.2], ["Potato", 0.1], ["Onion", 0.06], ["Sour Yogurt", 0.05], ["Ghee", 0.025], ["Garam Masala", 0.005], ["Ginger", 0.012], ["Garlic", 0.012]],
    "Beef Bhuna": [["Beef (Boneless)", 0.28], ["Onion", 0.08], ["Garlic", 0.015], ["Ginger", 0.015], ["Soybean Oil", 0.05], ["Turmeric Powder", 0.005], ["Chili Powder", 0.006], ["Garam Masala", 0.004]],
    "Chicken Curry": [["Broiler Chicken", 0.28], ["Potato", 0.1], ["Onion", 0.06], ["Garlic", 0.012], ["Ginger", 0.012], ["Soybean Oil", 0.04], ["Turmeric Powder", 0.004], ["Garam Masala", 0.003]],
    "Rui Fish Curry": [["Rui Fish", 0.25], ["Tomato", 0.08], ["Onion", 0.04], ["Ginger", 0.01], ["Garlic", 0.01], ["Soybean Oil", 0.035], ["Turmeric Powder", 0.004], ["Coriander Leaves", 0.01]],
    "Ilish Bhuna": [["Ilish (Hilsa)", 0.25], ["Onion", 0.05], ["Green Chili", 0.015], ["Turmeric Powder", 0.004], ["Soybean Oil", 0.045], ["Garlic", 0.008]],
    "Chingri Malai Curry": [["Shrimp (Bagda)", 0.22], ["Onion", 0.04], ["Ghee", 0.02], ["Milk", 0.1], ["Garam Masala", 0.004], ["Ginger", 0.008], ["Turmeric Powder", 0.003]],
    "Vegetable Khichuri": [["Kalijira Rice", 0.2], ["Masoor Dal", 0.08], ["Potato", 0.08], ["Tomato", 0.05], ["Onion", 0.04], ["Ghee", 0.015], ["Turmeric Powder", 0.004], ["Green Chili", 0.01]],
    "Dal Tarka": [["Masoor Dal", 0.12], ["Onion", 0.03], ["Garlic", 0.008], ["Soybean Oil", 0.02], ["Turmeric Powder", 0.002], ["Coriander Leaves", 0.008]],
    "Plain Rice": [["Kalijira Rice", 0.18]],
    "Beef Haleem": [["Beef (Boneless)", 0.12], ["Masoor Dal", 0.08], ["Atta Flour", 0.06], ["Onion", 0.05], ["Ginger", 0.015], ["Garlic", 0.015], ["Garam Masala", 0.004], ["Soybean Oil", 0.04]],
    "Fuchka (8 pcs)": [["Fuchka Shell", 8], ["Chickpea (Chola)", 0.05], ["Potato", 0.05], ["Tamarind", 0.03], ["Cucumber", 0.04], ["Onion", 0.03], ["Green Chili", 0.008], ["Coriander Leaves", 0.008]],
    "Chotpoti": [["Chickpea (Chola)", 0.12], ["Potato", 0.1], ["Egg", 1], ["Onion", 0.04], ["Tamarind", 0.03], ["Cucumber", 0.04], ["Fuchka Shell", 4], ["Green Chili", 0.01]],
    "Chicken Burger": [["Burger Bun", 1], ["Broiler Chicken", 0.15], ["Cheese Slice", 1], ["Lettuce", 0.03], ["Tomato", 0.03], ["Atta Flour", 0.03], ["Soybean Oil", 0.05]],
    "Beef Burger": [["Burger Bun", 1], ["Beef (Boneless)", 0.16], ["Cheese Slice", 2], ["Lettuce", 0.03], ["Onion", 0.04], ["Soybean Oil", 0.03]],
    "French Fries": [["Frozen Fries", 0.18], ["Soybean Oil", 0.04], ["Chili Powder", 0.002]],
    "Borhani": [["Sour Yogurt", 0.15], ["Milk", 0.05], ["Mint Leaves", 0.01], ["Sugar", 0.02], ["Green Chili", 0.003], ["Condensed Milk", 0.01]],
    "Cold Drink": [["Cold Drink 250ml", 1]],
    "Mineral Water": [["Mineral Water 500ml", 1]],
  };
  for (const [itemName, lines] of Object.entries(recipeSeed)) {
    for (const [ingName, qty] of lines) {
      await db.insert(recipeItems).values({ menuItemId: M(itemName), ingredientId: I(ingName), qtyPerServing: String(qty) });
    }
  }

  /* ---------------------------------- tables -------------------------------- */
  const tableRows = await db
    .insert(tables)
    .values([
      { name: "Table 1" }, { name: "Table 2" }, { name: "Table 3" },
      { name: "Table 4" }, { name: "Table 5" }, { name: "Rooftop 1" },
    ])
    .returning();

  /* --------------------------------- customers ------------------------------ */
  const custSeed: [string, string, string | null, string, string | null][] = [
    ["Abdul Karim", "01711234501", "karim.abdul@gmail.com", "VIP", "Prefers window seat; loves Beef Bhuna"],
    ["Fatema Begum", "01822345602", null, "Regular", null],
    ["Mohammad Hasan", "01933456703", "mhasan@yahoo.com", "Regular", "Allergic to shrimp"],
    ["Ayesha Siddika", "01744567804", null, "VIP", "Corporate lunch host — send offers"],
    ["Tanvir Ahmed", "01655678905", "tanvir.a@gmail.com", "New", null],
    ["Nasrin Jahan", "01566789006", null, "Regular", null],
    ["Shafiqul Islam", "01777890107", "shafiq.islam@outlook.com", "Regular", "Always orders takeaway on Fridays"],
    ["Ruma Parvin", "01888901208", null, "New", null],
    ["Jahid Hasan", "01999012309", "jahid.h@gmail.com", "VIP", "Gold tier; birthday in March"],
    ["Salma Khatun", "01610123410", null, "Regular", null],
    ["Imran Hossain", "01721234511", "imran.hossain@gmail.com", "New", null],
    ["Sharmin Akter", "01832345612", null, "Regular", "Vegetarian options preferred"],
    ["Nazmul Karim", "01943456713", "nazmul.k@hotmail.com", "Regular", null],
    ["Farhana Yeasmin", "01554567814", null, "New", null],
    ["Rafiqul Alam", "01765678915", "rafiq.alam@gmail.com", "VIP", "Monthly office catering lead"],
    ["Mousumi Das", "01876789016", null, "Regular", null],
  ];
  const custRows = await db
    .insert(customers)
    .values(custSeed.map(([name, phone, email, tag, notes]) => ({ name, phone, email, tag, notes })))
    .returning();

  /* ------------------------------- orders (6 weeks) ------------------------- */
  const popular = [
    ["Chicken Tehari", 16], ["Beef Tehari", 12], ["Mutton Kacchi", 7], ["Beef Kacchi", 9],
    ["Beef Bhuna", 11], ["Chicken Curry", 8], ["Rui Fish Curry", 7], ["Ilish Bhuna", 5],
    ["Chingri Malai Curry", 4], ["Vegetable Khichuri", 6], ["Dal Tarka", 5], ["Plain Rice", 6],
    ["Beef Haleem", 7], ["Fuchka (8 pcs)", 13], ["Chotpoti", 10], ["Chicken Burger", 9],
    ["Beef Burger", 6], ["French Fries", 8], ["Borhani", 8], ["Cold Drink", 14], ["Mineral Water", 8],
  ] as [string, number][];
  const weights = popular.flatMap(([name, w]) => Array<string>(w).fill(name));
  const priceOf = (name: string) => Number(itemRows.find((r) => r.nameEn === name)!.price);
  const paymentMethods = ["CASH", "CASH", "CASH", "BKASH", "BKASH", "NAGAD", "CARD"] as const;
  const notePool = [null, null, null, "Extra spicy", "No chili please", "Less oil", "Add extra onion", "No coriander"];

  type OrderLine = { menuItemId: number; nameSnapshot: string; qty: number; unitPrice: number; lineTotal: number; notes: string | null };

  const now = new Date();
  const recentOrdersQueue: { status: string; minutesAgo: number; paid: (typeof paymentMethods)[number] }[] = [
    { status: "PENDING", minutesAgo: 4, paid: "BKASH" },
    { status: "PENDING", minutesAgo: 9, paid: "CASH" },
    { status: "CONFIRMED", minutesAgo: 16, paid: "CASH" },
    { status: "PREPARING", minutesAgo: 24, paid: "NAGAD" },
    { status: "PREPARING", minutesAgo: 31, paid: "BKASH" },
    { status: "READY", minutesAgo: 38, paid: "CARD" },
  ];

  let orderSeq = 1000;
  const loyaltyByCustomer = new Map<number, { balance: number; spend: number; visits: number }>();
  const earnEntries: { customerId: number; orderIdx: number; points: number; at: Date; orderNumber: string }[] = [];
  const orderIds: number[] = [];
  const orderDates: Date[] = [];
  const completedOrderMeta: { id: number; customerId: number | null; total: number }[] = [];

  async function insertOrder(opts: {
    at: Date; status: string; tableIdx: number | null; orderType: string;
    custIdx: number | null; paid: (typeof paymentMethods)[number];
  }) {
    const { at, status, tableIdx, orderType, custIdx, paid } = opts;
    orderSeq += 1;
    const orderNumber = "RJ-" + orderSeq;
    const lineCount = between(1, 4);
    const chosen = new Set<string>();
    const lines: OrderLine[] = [];
    for (let i = 0; i < lineCount; i++) {
      const name = pick(weights);
      if (chosen.has(name)) continue;
      chosen.add(name);
      const qty = name === "Cold Drink" || name === "Mineral Water" ? between(1, 3) : between(1, 2);
      const unitPrice = priceOf(name);
      lines.push({ menuItemId: M(name), nameSnapshot: name, qty, unitPrice, lineTotal: unitPrice * qty, notes: pick(notePool) });
    }
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const cust = custIdx !== null ? custRows[custIdx] : null;
    const isCompleted = status === "COMPLETED" || status === "SERVED";
    const points = isCompleted && cust ? Math.floor(subtotal / 10) : 0;

    const [ord] = await db
      .insert(orders)
      .values({
        orderNumber,
        tableId: tableIdx !== null ? tableRows[tableIdx].id : null,
        orderType: orderType as "DINE_IN" | "TAKEAWAY" | "DELIVERY",
        customerId: cust?.id ?? null,
        customerPhone: cust?.phone ?? null,
        customerName: cust?.name ?? null,
        status: status as "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "SERVED" | "COMPLETED" | "CANCELLED",
        paymentMethod: paid,
        subtotal: String(subtotal),
        total: String(subtotal),
        pointsEarned: points,
        createdAt: at,
        updatedAt: at,
      })
      .returning();

    for (const l of lines) {
      await db.insert(orderItems).values({
        orderId: ord.id, menuItemId: l.menuItemId, nameSnapshot: l.nameSnapshot,
        qty: l.qty, unitPrice: String(l.unitPrice), lineTotal: String(l.lineTotal), notes: l.notes,
      });
    }

    // status events pipeline
    const pipeline = ["PENDING", "CONFIRMED", "PREPARING", "READY", "SERVED", "COMPLETED"];
    const upto = status === "CANCELLED" ? 0 : pipeline.indexOf(status);
    let t = at.getTime();
    for (let s = 0; s <= upto; s++) {
      await db.insert(orderStatusEvents).values({ orderId: ord.id, status: pipeline[s] as never, createdAt: new Date(t) });
      t += between(4, 14) * 60000;
    }
    if (status === "CANCELLED") {
      await db.insert(orderStatusEvents).values({ orderId: ord.id, status: "CANCELLED" as never, createdAt: new Date(t) });
    }

    if (isCompleted && cust) {
      earnEntries.push({ customerId: cust.id, orderIdx: ord.id, points, at, orderNumber });
      const agg = loyaltyByCustomer.get(cust.id) ?? { balance: 0, spend: 0, visits: 0 };
      agg.spend += subtotal;
      agg.visits += 1;
      loyaltyByCustomer.set(cust.id, agg);
    }
    orderIds.push(ord.id);
    orderDates.push(at);
    if (status === "COMPLETED") completedOrderMeta.push({ id: ord.id, customerId: cust?.id ?? null, total: subtotal });
  }

  // past 42 days
  for (let dayOffset = 42; dayOffset >= 0; dayOffset--) {
    const day = new Date(now);
    day.setDate(day.getDate() - dayOffset);
    const dow = day.getDay(); // 5=Fri, 6=Sat: weekend spike
    const isWeekend = dow === 5 || dow === 6;
    const dayCount = dayOffset === 0 ? between(8, 12) : isWeekend ? between(24, 34) : between(13, 20);
    for (let i = 0; i < dayCount; i++) {
      // lunch peak 12-15 (45%), dinner 19-22 (40%), rest spread
      const bucket = rnd();
      let hour: number;
      if (bucket < 0.45) hour = between(12, 14);
      else if (bucket < 0.85) hour = between(19, 22);
      else hour = between(10, 23);
      const at = new Date(day);
      at.setHours(hour, between(0, 59), between(0, 59), 0);
      if (at > now) at.setTime(now.getTime() - between(30, 300) * 60000);

      const r = rnd();
      const orderType = r < 0.68 ? "DINE_IN" : r < 0.88 ? "TAKEAWAY" : "DELIVERY";
      const status = r2Status(dayOffset);
      const custIdx = rnd() < 0.55 ? between(0, custRows.length - 1) : null;
      await insertOrder({
        at,
        status,
        tableIdx: orderType === "DINE_IN" ? between(0, tableRows.length - 1) : null,
        orderType,
        custIdx,
        paid: pick(paymentMethods),
      });
    }
  }
  function r2Status(dayOffset: number) {
    if (dayOffset > 0) return rnd() < 0.94 ? "COMPLETED" : "CANCELLED";
    return "COMPLETED";
  }

  // live orders in the queue for today
  for (const live of recentOrdersQueue) {
    const at = new Date(now.getTime() - live.minutesAgo * 60000);
    const custIdx = rnd() < 0.5 ? between(0, custRows.length - 1) : null;
    await insertOrder({
      at,
      status: live.status,
      tableIdx: between(0, tableRows.length - 1),
      orderType: "DINE_IN",
      custIdx,
      paid: live.paid,
    });
  }

  /* ---------------------------- loyalty ledger ---------------------------- */
  const loyaltyRows: {
    customerId: number; orderId: number; type: "EARN"; points: number;
    balanceAfter: number; note: string; createdAt: Date;
  }[] = [];
  const redeemRows: {
    customerId: number; type: "REDEEM"; points: number; balanceAfter: number;
    note: string; createdAt: Date;
  }[] = [];

  const byCust = new Map<number, typeof earnEntries>();
  for (const e of earnEntries) {
    if (!byCust.has(e.customerId)) byCust.set(e.customerId, []);
    byCust.get(e.customerId)!.push(e);
  }
  for (const [custId, entries] of byCust) {
    entries.sort((a, b) => a.at.getTime() - b.at.getTime());
    let bal = 0;
    entries.forEach((e, idx) => {
      // some customers redeem midway through their history
      if (idx > 4 && idx % 7 === 3 && bal > 100) {
        const redeem = Math.min(bal, 100);
        bal -= redeem;
        redeemRows.push({
          customerId: custId, type: "REDEEM", points: -redeem, balanceAfter: bal,
          note: "Redeemed at counter", createdAt: new Date(e.at.getTime() + 3600000),
        });
      }
      bal += e.points;
      loyaltyRows.push({
        customerId: custId, orderId: e.orderIdx, type: "EARN", points: e.points,
        balanceAfter: bal, note: `Order ${e.orderNumber}`, createdAt: e.at,
      });
    });
    const agg = loyaltyByCustomer.get(custId)!;
    agg.balance = bal;
  }
  for (const row of loyaltyRows) await db.insert(loyaltyTransactions).values(row);
  for (const row of redeemRows) await db.insert(loyaltyTransactions).values(row);

  /* ------------------ update customer aggregates from orders ---------------- */
  for (const cust of custRows) {
    const agg = loyaltyByCustomer.get(cust.id);
    if (!agg) continue;
    await db
      .update(customers)
      .set({
        lifetimeSpend: String(Math.round(agg.spend)),
        visitCount: agg.visits,
        loyaltyBalance: agg.balance,
      })
      .where(eq(customers.id, cust.id));
  }

  /* --------------------------- waste log + feedback ------------------------- */
  const wasteSeed: [string, number, string, number][] = [
    ["Broiler Chicken", 1.5, "EXPIRED", 14], ["Rui Fish", 0.8, "EXPIRED", 13],
    ["Lettuce", 0.6, "OVERPRODUCTION", 12], ["Tomato", 1.2, "SPILLAGE", 11],
    ["Coriander Leaves", 0.3, "EXPIRED", 10], ["Sour Yogurt", 0.7, "EXPIRED", 9],
    ["Beef (Boneless)", 0.5, "OVERPRODUCTION", 8], ["Burger Bun", 6, "EXPIRED", 7],
    ["Green Chili", 0.4, "EXPIRED", 6], ["Onion", 1.8, "OTHER", 5],
    ["Milk", 1.5, "SPILLAGE", 3], ["Mint Leaves", 0.2, "EXPIRED", 2],
    ["Cucumber", 0.9, "OVERPRODUCTION", 1], ["Ilish (Hilsa)", 0.4, "EXPIRED", 0],
  ];
  for (const [ingName, qty, reason, daysAgo] of wasteSeed) {
    const ing = ingRows.find((r) => r.name === ingName)!;
    await db.insert(wasteLogs).values({
      ingredientId: ing.id,
      qty: String(qty),
      unit: ing.unit,
      reason: reason as "EXPIRED" | "OVERPRODUCTION" | "SPILLAGE" | "OTHER",
      costImpact: (qty * Number(ing.costPerUnit)).toFixed(2),
      loggedAt: new Date(now.getTime() - daysAgo * 86400000).toISOString().slice(0, 10),
    });
  }

  const fbComments = [
    "Kacchi was amazing, will come again!", "Service took a bit long but food was great.",
    "Best fuchka in the area.", "Tehari could use more chili.", "Perfect family dinner spot.",
    "Borhani tasted fresh. Loved it!", "Quick service via QR ordering, very smooth.",
  ];
  const fbOrders = completedOrderMeta.filter((_, i) => i % 6 === 2).slice(0, 30);
  for (const fo of fbOrders) {
    await db.insert(feedback).values({
      orderId: fo.id,
      customerId: fo.customerId,
      rating: rnd() < 0.7 ? 5 : rnd() < 0.6 ? 4 : 3,
      comment: rnd() < 0.8 ? pick(fbComments) : null,
      createdAt: new Date(),
    });
  }

  console.log(`Seeded: ${itemRows.length} menu items, ${ingRows.length} ingredients, ${custRows.length} customers, ${orderIds.length} orders, ${loyaltyRows.length + redeemRows.length} loyalty rows.`);
}


