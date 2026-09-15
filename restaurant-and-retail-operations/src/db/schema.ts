import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  numeric,
  boolean,
  timestamp,
  date,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/* ---------------------------------- enums --------------------------------- */

export const roleEnum = pgEnum("role", ["OWNER", "STAFF", "KITCHEN"]);

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "SERVED",
  "COMPLETED",
  "CANCELLED",
]);

export const orderTypeEnum = pgEnum("order_type", ["DINE_IN", "TAKEAWAY", "DELIVERY"]);

export const paymentMethodEnum = pgEnum("payment_method", ["CASH", "BKASH", "NAGAD", "CARD"]);

export const unitEnum = pgEnum("unit", ["kg", "g", "l", "ml", "pcs"]);

export const wasteReasonEnum = pgEnum("waste_reason", [
  "EXPIRED",
  "OVERPRODUCTION",
  "SPILLAGE",
  "OTHER",
]);

export const loyaltyTypeEnum = pgEnum("loyalty_type", ["EARN", "REDEEM", "ADJUST"]);

/* ---------------------------------- users --------------------------------- */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 180 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("STAFF"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------- settings -------------------------------- */

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  businessName: varchar("business_name", { length: 160 }).notNull().default("Dhaka Flavours"),
  logoUrl: text("logo_url"),
  currency: varchar("currency", { length: 8 }).notNull().default("BDT"),
  pointsPer10Taka: numeric("points_per_10_taka", { precision: 8, scale: 2 }).notNull().default("1"),
  tierSilverSpend: numeric("tier_silver_spend", { precision: 12, scale: 2 }).notNull().default("10000"),
  tierGoldSpend: numeric("tier_gold_spend", { precision: 12, scale: 2 }).notNull().default("30000"),
  defaultLowStockThreshold: numeric("default_low_stock_threshold", { precision: 12, scale: 2 }).notNull().default("5"),
  marginAlertPct: numeric("margin_alert_pct", { precision: 5, scale: 2 }).notNull().default("20"),
  language: varchar("language", { length: 4 }).notNull().default("en"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------- menu items ------------------------------ */

export const menuItems = pgTable(
  "menu_items",
  {
    id: serial("id").primaryKey(),
    nameEn: varchar("name_en", { length: 160 }).notNull(),
    nameBn: varchar("name_bn", { length: 200 }),
    category: varchar("category", { length: 80 }).notNull().default("Main Course"),
    description: text("description"),
    price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
    imageUrl: text("image_url"),
    isAvailable: boolean("is_available").notNull().default(true),
    prepTimeMinutes: integer("prep_time_minutes").notNull().default(15),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("menu_items_category_idx").on(t.category)]
);

/* ------------------------------- ingredients ------------------------------ */

export const ingredients = pgTable(
  "ingredients",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    unit: unitEnum("unit").notNull().default("kg"),
    costPerUnit: numeric("cost_per_unit", { precision: 12, scale: 4 }).notNull().default("0"),
    stockQty: numeric("stock_qty", { precision: 12, scale: 3 }).notNull().default("0"),
    lowStockThreshold: numeric("low_stock_threshold", { precision: 12, scale: 3 }).notNull().default("5"),
    expiryDate: date("expiry_date"),
    supplier: varchar("supplier", { length: 160 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ingredients_name_idx").on(t.name)]
);

/* --------------------------------- recipes -------------------------------- */

export const recipeItems = pgTable(
  "recipe_items",
  {
    id: serial("id").primaryKey(),
    menuItemId: integer("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    ingredientId: integer("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    qtyPerServing: numeric("qty_per_serving", { precision: 12, scale: 4 }).notNull().default("0"),
  },
  (t) => [
    uniqueIndex("recipe_items_unique").on(t.menuItemId, t.ingredientId),
    index("recipe_items_menu_idx").on(t.menuItemId),
  ]
);

/* ---------------------------------- tables -------------------------------- */

export const tables = pgTable("tables", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 60 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("AVAILABLE"), // AVAILABLE | OCCUPIED
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* --------------------------------- customers ------------------------------ */

export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    phone: varchar("phone", { length: 32 }).notNull().unique(),
    email: varchar("email", { length: 180 }),
    tag: varchar("tag", { length: 20 }).notNull().default("New"), // New | Regular | VIP
    notes: text("notes"),
    lifetimeSpend: numeric("lifetime_spend", { precision: 14, scale: 2 }).notNull().default("0"),
    loyaltyBalance: integer("loyalty_balance").notNull().default(0),
    visitCount: integer("visit_count").notNull().default(0),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("customers_phone_idx").on(t.phone)]
);

/* ---------------------------------- orders -------------------------------- */

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderNumber: varchar("order_number", { length: 20 }).notNull().unique(),
    tableId: integer("table_id").references(() => tables.id, { onDelete: "set null" }),
    orderType: orderTypeEnum("order_type").notNull().default("DINE_IN"),
    customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
    customerPhone: varchar("customer_phone", { length: 32 }),
    customerName: varchar("customer_name", { length: 160 }),
    status: orderStatusEnum("status").notNull().default("PENDING"),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("CASH"),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    pointsEarned: integer("points_earned").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
    index("orders_customer_idx").on(t.customerId),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    menuItemId: integer("menu_item_id").references(() => menuItems.id, { onDelete: "set null" }),
    nameSnapshot: varchar("name_snapshot", { length: 200 }).notNull(),
    qty: integer("qty").notNull().default(1),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
    lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
  },
  (t) => [index("order_items_order_idx").on(t.orderId), index("order_items_item_idx").on(t.menuItemId)]
);

export const orderStatusEvents = pgTable(
  "order_status_events",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: orderStatusEnum("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)]
);

/* ------------------------------ loyalty ledger ----------------------------- */

export const loyaltyTransactions = pgTable(
  "loyalty_transactions",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
    type: loyaltyTypeEnum("type").notNull(),
    points: integer("points").notNull(),
    balanceAfter: integer("balance_after").notNull().default(0),
    note: varchar("note", { length: 240 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("loyalty_customer_idx").on(t.customerId)]
);

export const feedback = pgTable(
  "feedback",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
    customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("feedback_order_idx").on(t.orderId)]
);

/* --------------------------------- waste log ------------------------------- */

export const wasteLogs = pgTable(
  "waste_logs",
  {
    id: serial("id").primaryKey(),
    ingredientId: integer("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    qty: numeric("qty", { precision: 12, scale: 3 }).notNull().default("0"),
    unit: unitEnum("unit").notNull().default("kg"),
    reason: wasteReasonEnum("reason").notNull().default("OTHER"),
    costImpact: numeric("cost_impact", { precision: 12, scale: 2 }).notNull().default("0"),
    loggedAt: date("logged_at").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("waste_logged_idx").on(t.loggedAt)]
);
