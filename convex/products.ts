import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => ctx.db.query("products").collect(),
});

export const create = mutation({
  args: {
    name: v.string(), category: v.string(), sku: v.string(), stock: v.number(),
    salePrice: v.number(), purchasePrice: v.number(), lowStockAt: v.number(),
  },
  handler: async (ctx, args) => ctx.db.insert("products", { ...args, active: true }),
});
