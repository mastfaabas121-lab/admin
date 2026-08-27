import { mutation } from "./_generated/server";

const demoProducts = [
  { name: "شاشة سمارت 43 بوصة", category: "أجهزة منزلية", sku: "TV-043", stock: 8, salePrice: 385000, purchasePrice: 320000, lowStockAt: 5 },
  { name: "مبرد هواء صحراوي", category: "تبريد", sku: "CL-120", stock: 3, salePrice: 175000, purchasePrice: 142000, lowStockAt: 5 },
  { name: "غسالة أوتوماتيك 8 كغم", category: "أجهزة منزلية", sku: "WM-080", stock: 11, salePrice: 540000, purchasePrice: 468000, lowStockAt: 4 },
  { name: "هاتف ذكي 128GB", category: "هواتف", sku: "PH-128", stock: 2, salePrice: 295000, purchasePrice: 258000, lowStockAt: 4 },
  { name: "مروحة عمودية", category: "تبريد", sku: "FN-018", stock: 24, salePrice: 48000, purchasePrice: 36500, lowStockAt: 6 },
  { name: "سماعة لاسلكية", category: "إكسسوارات", sku: "AU-051", stock: 19, salePrice: 35000, purchasePrice: 22000, lowStockAt: 5 },
];

const demoCustomers = [
  { name: "أحمد كريم", phone: "0770 123 4567" },
  { name: "زينب علي", phone: "0781 442 9012" },
  { name: "محمد جاسم", phone: "0750 221 8834" },
  { name: "سارة حسين", phone: "0773 654 1208" },
  { name: "مصطفى ناصر", phone: "0780 771 4300" },
];

export const demo = mutation({
  args: {},
  handler: async (ctx) => {
    const existingProduct = await ctx.db.query("products").first();
    if (existingProduct) return { inserted: false, reason: "already_seeded" };

    for (const product of demoProducts) {
      await ctx.db.insert("products", { ...product, active: true });
    }
    for (const customer of demoCustomers) {
      await ctx.db.insert("customers", { ...customer, active: true });
    }
    return { inserted: true, products: demoProducts.length, customers: demoCustomers.length };
  },
});
