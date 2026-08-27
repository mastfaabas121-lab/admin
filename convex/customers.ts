import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => ctx.db.query("customers").collect(),
});

export const create = mutation({
  args: { name: v.string(), phone: v.string(), address: v.optional(v.string()), notes: v.optional(v.string()) },
  handler: async (ctx, args) => ctx.db.insert("customers", { ...args, active: true }),
});
