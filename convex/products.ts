import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => (await ctx.db.query("products").collect()).filter((product) => product.active),
});

export const create = mutation({
  args: {
    name: v.string(), category: v.string(), sku: v.string(), stock: v.number(),
    salePrice: v.number(), purchasePrice: v.number(), lowStockAt: v.number(),
  },
  handler: async (ctx, args) => ctx.db.insert("products", { ...args, active: true }),
});

export const update = mutation({
  args: {
    productId: v.id("products"), name: v.string(), stock: v.number(),
    salePrice: v.number(), purchasePrice: v.number(),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || !product.active) throw new Error("المنتج غير موجود");
    if (!args.name.trim()) throw new Error("اسم المادة مطلوب");
    if (!Number.isInteger(args.stock) || args.stock < 0) throw new Error("الكمية غير صحيحة");
    if (args.salePrice < 0 || args.purchasePrice < 0) throw new Error("السعر غير صحيح");
    await ctx.db.patch(args.productId, { name: args.name.trim(), stock: args.stock, salePrice: args.salePrice, purchasePrice: args.purchasePrice });
  },
});

export const remove = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("المنتج غير موجود");
    await ctx.db.patch(args.productId, { active: false });
  },
});
