import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  products: defineTable({
    name: v.string(),
    category: v.string(),
    sku: v.string(),
    stock: v.number(),
    salePrice: v.number(),
    purchasePrice: v.number(),
    lowStockAt: v.number(),
    active: v.boolean(),
  }).index("by_sku", ["sku"]),

  customers: defineTable({
    name: v.string(),
    phone: v.string(),
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
    active: v.boolean(),
  }).index("by_phone", ["phone"]),

  debts: defineTable({
    customerId: v.id("customers"),
    saleId: v.optional(v.id("sales")),
    originalAmount: v.number(),
    remainingAmount: v.number(),
    installmentAmount: v.number(),
    nextDueDate: v.number(),
    status: v.union(v.literal("active"), v.literal("overdue"), v.literal("paid")),
    createdAt: v.number(),
  }).index("by_customer", ["customerId"]).index("by_status", ["status"]),

  payments: defineTable({
    debtId: v.id("debts"),
    customerId: v.id("customers"),
    amount: v.number(),
    paidAt: v.number(),
    note: v.optional(v.string()),
  }).index("by_debt", ["debtId"]).index("by_customer", ["customerId"]),

  sales: defineTable({
    customerId: v.optional(v.id("customers")),
    kind: v.union(v.literal("cash"), v.literal("credit")),
    subtotal: v.number(),
    discount: v.number(),
    total: v.number(),
    createdAt: v.number(),
  }).index("by_created_at", ["createdAt"]),

  saleItems: defineTable({
    saleId: v.id("sales"),
    productId: v.id("products"),
    productName: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    total: v.number(),
  }).index("by_sale", ["saleId"]),
});
