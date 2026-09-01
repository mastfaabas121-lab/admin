import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createCashSale = mutation({
  args: {
    discount: v.number(),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    customerAddress: v.optional(v.string()),
    items: v.array(v.object({ productId: v.id("products"), quantity: v.number() })),
  },
  handler: async (ctx, args) => {
    if (!args.items.length) throw new Error("الفاتورة فارغة");
    const customerName = args.customerName?.trim() || undefined;
    const customerPhone = args.customerPhone?.trim() || undefined;
    const customerAddress = args.customerAddress?.trim() || undefined;
    if (customerPhone && customerPhone.replace(/\D/g, "").length < 10) throw new Error("رقم الواتساب غير صحيح");
    let subtotal = 0;
    const resolved = [];
    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (!product || !product.active) throw new Error("أحد المنتجات غير متوفر");
      if (item.quantity <= 0 || item.quantity > product.stock) throw new Error(`الكمية غير متوفرة: ${product.name}`);
      subtotal += product.salePrice * item.quantity;
      resolved.push({ product, quantity: item.quantity });
    }
    const total = Math.max(0, subtotal - args.discount);
    const saleId = await ctx.db.insert("sales", { customerName, customerPhone, customerAddress, kind: "cash", subtotal, discount: args.discount, total, paidAmount: total, remainingAmount: 0, createdAt: Date.now() });
    for (const { product, quantity } of resolved) {
      await ctx.db.insert("saleItems", { saleId, productId: product._id, productName: product.name, quantity, unitPrice: product.salePrice, total: product.salePrice * quantity });
      await ctx.db.patch(product._id, { stock: product.stock - quantity });
    }
    return saleId;
  },
});

export const createCustomerSale = mutation({
  args: {
    customerId: v.id("customers"),
    paidAmount: v.number(),
    items: v.array(v.object({ productId: v.id("products"), quantity: v.number() })),
  },
  handler: async (ctx, args) => {
    if (!args.items.length) throw new Error("الفاتورة فارغة");
    const customer = await ctx.db.get(args.customerId);
    if (!customer || !customer.active) throw new Error("الزبون غير موجود");
    let subtotal = 0;
    const resolved = [];
    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (!product || !product.active) throw new Error("أحد المنتجات غير متوفر");
      if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > product.stock) {
        throw new Error(`الكمية غير متوفرة: ${product.name}`);
      }
      subtotal += product.salePrice * item.quantity;
      resolved.push({ product, quantity: item.quantity });
    }
    if (!Number.isFinite(args.paidAmount) || args.paidAmount < 0 || args.paidAmount > subtotal) {
      throw new Error("المبلغ المدفوع غير صحيح");
    }

    const remainingAmount = subtotal - args.paidAmount;
    const createdAt = Date.now();
    const saleId = await ctx.db.insert("sales", {
      customerId: args.customerId,
      kind: remainingAmount > 0 ? "credit" : "cash",
      subtotal,
      discount: 0,
      total: subtotal,
      paidAmount: args.paidAmount,
      remainingAmount,
      createdAt,
    });
    for (const { product, quantity } of resolved) {
      await ctx.db.insert("saleItems", { saleId, productId: product._id, productName: product.name, quantity, unitPrice: product.salePrice, total: product.salePrice * quantity });
      await ctx.db.patch(product._id, { stock: product.stock - quantity });
    }
    if (remainingAmount > 0) {
      await ctx.db.insert("debts", {
        customerId: args.customerId,
        saleId,
        originalAmount: remainingAmount,
        remainingAmount,
        installmentAmount: remainingAmount,
        nextDueDate: createdAt + (customer.reminderDays ?? 30) * 86_400_000,
        status: "active",
        createdAt,
      });
    }
    return { saleId, total: subtotal, remainingAmount };
  },
});

export const listRecentDirectSales = query({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 30 * 86_400_000;
    const sales = (await ctx.db.query("sales").withIndex("by_created_at", (q) => q.gte("createdAt", cutoff)).collect())
      .filter((sale) => !sale.customerId);
    return Promise.all(sales.sort((a, b) => b.createdAt - a.createdAt).map(async (sale) => ({
      ...sale,
      items: await ctx.db.query("saleItems").withIndex("by_sale", (q) => q.eq("saleId", sale._id)).collect(),
    })));
  },
});

export const updateDirectSale = mutation({
  args: {
    saleId: v.id("sales"),
    customerName: v.string(),
    customerPhone: v.string(),
    customerAddress: v.string(),
    items: v.array(v.object({ productId: v.id("products"), quantity: v.number() })),
  },
  handler: async (ctx, args) => {
    const sale = await ctx.db.get(args.saleId);
    if (!sale || sale.customerId) throw new Error("معاملة البيع غير موجودة");
    if (!args.items.length) throw new Error("الفاتورة فارغة");
    if (!args.customerName.trim()) throw new Error("اسم المشتري مطلوب");
    if (args.customerPhone.replace(/\D/g, "").length < 10) throw new Error("رقم الواتساب غير صحيح");
    if (!args.customerAddress.trim()) throw new Error("عنوان المشتري مطلوب");

    const oldItems = await ctx.db.query("saleItems").withIndex("by_sale", (q) => q.eq("saleId", args.saleId)).collect();
    const oldQuantities = new Map(oldItems.map((item) => [item.productId, item.quantity]));
    const newQuantities = new Map(args.items.map((item) => [item.productId, item.quantity]));
    const productIds = new Set([...oldQuantities.keys(), ...newQuantities.keys()]);
    const resolved = [];
    let subtotal = 0;
    for (const productId of productIds) {
      const product = await ctx.db.get(productId);
      if (!product || !product.active) throw new Error("أحد المنتجات غير متوفر");
      const oldQuantity = oldQuantities.get(productId) ?? 0;
      const newQuantity = newQuantities.get(productId) ?? 0;
      if (!Number.isInteger(newQuantity) || newQuantity < 0 || newQuantity > product.stock + oldQuantity) throw new Error(`الكمية غير متوفرة: ${product.name}`);
      resolved.push({ product, oldQuantity, newQuantity });
      subtotal += product.salePrice * newQuantity;
    }
    for (const item of oldItems) await ctx.db.delete(item._id);
    for (const { product, oldQuantity, newQuantity } of resolved) {
      await ctx.db.patch(product._id, { stock: product.stock + oldQuantity - newQuantity });
      if (newQuantity > 0) await ctx.db.insert("saleItems", { saleId: sale._id, productId: product._id, productName: product.name, quantity: newQuantity, unitPrice: product.salePrice, total: product.salePrice * newQuantity });
    }
    await ctx.db.patch(sale._id, { customerName: args.customerName.trim(), customerPhone: args.customerPhone.trim(), customerAddress: args.customerAddress.trim(), subtotal, total: subtotal, paidAmount: subtotal, remainingAmount: 0 });
    return sale._id;
  },
});

export const deleteDirectSale = mutation({
  args: { saleId: v.id("sales") },
  handler: async (ctx, args) => {
    const sale = await ctx.db.get(args.saleId);
    if (!sale || sale.customerId) throw new Error("معاملة البيع غير موجودة");
    const items = await ctx.db.query("saleItems").withIndex("by_sale", (q) => q.eq("saleId", args.saleId)).collect();
    for (const item of items) {
      const product = await ctx.db.get(item.productId);
      if (product) await ctx.db.patch(product._id, { stock: product.stock + item.quantity });
      await ctx.db.delete(item._id);
    }
    await ctx.db.delete(sale._id);
  },
});

export const cleanupOldDirectSales = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 30 * 86_400_000;
    const expiredSales = (await ctx.db.query("sales").withIndex("by_created_at", (q) => q.lt("createdAt", cutoff)).collect())
      .filter((sale) => !sale.customerId);
    for (const sale of expiredSales) {
      const items = await ctx.db.query("saleItems").withIndex("by_sale", (q) => q.eq("saleId", sale._id)).collect();
      for (const item of items) await ctx.db.delete(item._id);
      await ctx.db.delete(sale._id);
    }
    return expiredSales.length;
  },
});
