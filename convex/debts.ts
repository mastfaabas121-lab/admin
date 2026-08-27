import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const overdue = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const debts = (await ctx.db.query("debts").collect()).filter(
      (debt) => debt.remainingAmount > 0 && debt.nextDueDate < now,
    );
    const accounts = await Promise.all(
      debts.map(async (debt) => {
        const customer = await ctx.db.get(debt.customerId);
        return {
          ...debt,
          customerName: customer?.name ?? "زبون غير معروف",
          customerPhone: customer?.phone ?? "",
          overdueDays: Math.max(1, Math.floor((now - debt.nextDueDate) / 86_400_000)),
        };
      }),
    );
    return accounts.sort((a, b) => b.overdueDays - a.overdueDays || a.nextDueDate - b.nextDueDate);
  },
});

export const create = mutation({
  args: {
    customerId: v.id("customers"),
    amount: v.number(),
    installmentAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new Error("الزبون غير موجود");
    if (args.amount <= 0) throw new Error("مبلغ الدين غير صحيح");
    if (args.installmentAmount <= 0) throw new Error("مبلغ القسط غير صحيح");

    const nextDueDate = Date.now() + (customer.reminderDays ?? 30) * 86_400_000;
    return ctx.db.insert("debts", {
      customerId: args.customerId,
      originalAmount: args.amount,
      remainingAmount: args.amount,
      installmentAmount: args.installmentAmount,
      nextDueDate,
      status: "active",
      createdAt: Date.now(),
    });
  },
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

export const recordCustomerPayment = mutation({
  args: { customerId: v.id("customers"), amount: v.number(), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.amount <= 0) throw new Error("مبلغ التسديد غير صحيح");
    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new Error("الزبون غير موجود");
    const debts = (await ctx.db.query("debts").withIndex("by_customer", (q) => q.eq("customerId", args.customerId)).collect())
      .filter((debt) => debt.remainingAmount > 0)
      .sort((a, b) => a.nextDueDate - b.nextDueDate);
    const totalDebt = debts.reduce((sum, debt) => sum + debt.remainingAmount, 0);
    if (args.amount > totalDebt) throw new Error("مبلغ التسديد أكبر من الدين الكلي");

    let amountLeft = args.amount;
    const paidAt = Date.now();
    for (const debt of debts) {
      if (amountLeft <= 0) break;
      const paidAmount = Math.min(amountLeft, debt.remainingAmount);
      const remainingAmount = debt.remainingAmount - paidAmount;
      await ctx.db.insert("payments", { debtId: debt._id, customerId: args.customerId, amount: paidAmount, paidAt, note: args.note });
      await ctx.db.patch(debt._id, { remainingAmount, status: remainingAmount === 0 ? "paid" : "active" });
      amountLeft -= paidAmount;
    }
    return { remainingDebt: totalDebt - args.amount };
  },
});
