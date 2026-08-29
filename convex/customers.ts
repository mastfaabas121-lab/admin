import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const customers = (await ctx.db.query("customers").collect()).filter((customer) => customer.active);
    return Promise.all(customers.map(async (customer) => {
      const debts = await ctx.db.query("debts").withIndex("by_customer", (q) => q.eq("customerId", customer._id)).collect();
      const activeDebts = debts.filter((debt) => debt.remainingAmount > 0);
      const nextDueDate = activeDebts.length ? Math.min(...activeDebts.map((debt) => debt.nextDueDate)) : undefined;
      return {
        ...customer,
        totalDebt: activeDebts.reduce((sum, debt) => sum + debt.remainingAmount, 0),
        nextDueDate,
        isOverdue: nextDueDate !== undefined && nextDueDate < Date.now(),
      };
    }));
  },
});

export const account = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer) return null;
    const debts = await ctx.db.query("debts").withIndex("by_customer", (q) => q.eq("customerId", args.customerId)).collect();
    const payments = await ctx.db.query("payments").withIndex("by_customer", (q) => q.eq("customerId", args.customerId)).collect();
    const sales = await ctx.db.query("sales").withIndex("by_customer", (q) => q.eq("customerId", args.customerId)).collect();
    const totalDebt = debts.reduce((sum, debt) => sum + debt.remainingAmount, 0);
    const transactions = [
      ...debts.filter((debt) => !debt.saleId).map((debt) => ({
        id: debt._id,
        kind: "debt" as const,
        title: "بيع بالدين",
        amount: debt.originalAmount,
        date: debt.createdAt,
        dueDate: debt.nextDueDate,
        paidAmount: 0,
        remainingAmount: debt.remainingAmount,
      })),
      ...sales.map((sale) => ({
        id: sale._id,
        kind: "sale" as const,
        title: "بيع",
        amount: sale.total,
        date: sale.createdAt,
        dueDate: undefined,
        paidAmount: sale.paidAmount ?? (sale.kind === "cash" ? sale.total : 0),
        remainingAmount: sale.remainingAmount ?? (sale.kind === "credit" ? sale.total : 0),
      })),
      ...payments.map((payment) => ({
        id: payment._id,
        kind: "payment" as const,
        title: "تسديد",
        amount: payment.amount,
        date: payment.paidAt,
        dueDate: undefined,
        paidAmount: payment.amount,
        remainingAmount: 0,
      })),
    ].sort((a, b) => b.date - a.date);
    return { customer, totalDebt, transactions };
  },
});

export const create = mutation({
  args: { name: v.string(), phone: v.string(), reminderDays: v.number(), address: v.string(), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("customers").withIndex("by_phone", (q) => q.eq("phone", args.phone)).unique();
    if (existing) throw new Error("رقم الواتساب مسجل مسبقاً");
    if (!Number.isInteger(args.reminderDays) || args.reminderDays < 1 || args.reminderDays > 365) {
      throw new Error("عدد أيام التذكير غير صحيح");
    }
    if (!args.address.trim()) throw new Error("عنوان الزبون مطلوب");
    return ctx.db.insert("customers", { ...args, name: args.name.trim(), phone: args.phone.trim(), address: args.address.trim(), active: true, createdAt: Date.now() });
  },
});

export const update = mutation({
  args: { customerId: v.id("customers"), name: v.string(), phone: v.string(), address: v.string(), reminderDays: v.number() },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer || !customer.active) throw new Error("الزبون غير موجود");
    const duplicatePhone = await ctx.db.query("customers").withIndex("by_phone", (q) => q.eq("phone", args.phone)).unique();
    if (duplicatePhone && duplicatePhone._id !== args.customerId) throw new Error("رقم الواتساب مسجل مسبقاً");
    if (!args.name.trim()) throw new Error("اسم الزبون مطلوب");
    if (!args.address.trim()) throw new Error("عنوان الزبون مطلوب");
    if (!Number.isInteger(args.reminderDays) || args.reminderDays < 1 || args.reminderDays > 365) throw new Error("عدد أيام التذكير غير صحيح");
    await ctx.db.patch(args.customerId, { name: args.name.trim(), phone: args.phone.trim(), address: args.address.trim(), reminderDays: args.reminderDays });
  },
});

export const remove = mutation({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new Error("الزبون غير موجود");
    const debts = await ctx.db.query("debts").withIndex("by_customer", (q) => q.eq("customerId", args.customerId)).collect();
    if (debts.some((debt) => debt.remainingAmount > 0)) throw new Error("لا يمكن حذف زبون عليه دين قائم");
    await ctx.db.patch(args.customerId, { active: false });
  },
});
