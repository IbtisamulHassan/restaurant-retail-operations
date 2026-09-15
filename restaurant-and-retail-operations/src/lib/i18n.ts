export type Lang = "en" | "bn";

const dict: Record<string, { en: string; bn: string }> = {
  dashboard: { en: "Dashboard", bn: "ড্যাশবোর্ড" },
  orders: { en: "Orders", bn: "অর্ডার" },
  menuRecipes: { en: "Menu & Recipes", bn: "মেনু ও রেসিপি" },
  ingredients: { en: "Ingredients & Inventory", bn: "উপকরণ ও ইনভেন্টরি" },
  customers: { en: "Customers & Loyalty", bn: "গ্রাহক ও লয়্যালটি" },
  forecasting: { en: "Forecasting & Waste", bn: "পূর্বাভাস ও বর্জ্য" },
  reports: { en: "Reports", bn: "রিপোর্ট" },
  settings: { en: "Settings", bn: "সেটিংস" },
  logout: { en: "Log out", bn: "লগ আউট" },
  search: { en: "Search…", bn: "খুঁজুন…" },
  save: { en: "Save", bn: "সংরক্ষণ" },
  cancel: { en: "Cancel", bn: "বাতিল" },
  add: { en: "Add", bn: "যোগ করুন" },
  edit: { en: "Edit", bn: "সম্পাদনা" },
  delete: { en: "Delete", bn: "মুছুন" },
  todaysSales: { en: "Today's Sales", bn: "আজকের বিক্রয়" },
  ordersToday: { en: "Orders Today", bn: "আজকের অর্ডার" },
  topItems: { en: "Top 5 Selling Items", bn: "শীর্ষ ৫ পণ্য" },
  lowStock: { en: "Low Stock Alerts", bn: "কম স্টক সতর্কতা" },
  lowMargin: { en: "Low-Margin Menu Items", bn: "কম মুনাফার আইটেম" },
  wasteWeek: { en: "This Week's Waste Cost", bn: "এ সপ্তাহের বর্জ্য ব্যয়" },
  pointsToday: { en: "Loyalty Points Issued Today", bn: "আজকের লয়্যালটি পয়েন্ট" },
};

export function t(key: string, lang: Lang): string {
  const row = dict[key];
  if (!row) return key;
  return row[lang] ?? row.en;
}

export const bnDigits = (s: string) =>
  s.replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
