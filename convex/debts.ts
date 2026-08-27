import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const overdue = query({
  args: {},
  handler: async (ctx) => ctx.db.query("debts").withIndex("by_status", (q) => q.eq("status", "overdue")).collect(),
});

export const recordPayment = mutation({
  args: { debtId: v.id("debts"), amount: v.number(), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const debt = await ctx.db.get(args.debtId);
    if (!debt) throw new Error("الدين غير موجود");
    if (args.amount <= 0 || args.amount > debt.remainingAmount) throw new Error("مبلغ الدفعة غير صحيح");
    const remainingAmount = debt.remainingAmount - args.amount;
    await ctx.db.insert("payments", { debtId: debt._id, customerId: debt.customerId, amount: args.amount, paidAt: Date.now(), note: args.note });
    await ctx.db.patch(debt._id, { remainingAmount, status: remainingAmount === 0 ? "paid" : "active" });
  },
});
