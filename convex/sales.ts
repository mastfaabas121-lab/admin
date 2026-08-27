import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createCashSale = mutation({
  args: {
    discount: v.number(),
    items: v.array(v.object({ productId: v.id("products"), quantity: v.number() })),
  },
  handler: async (ctx, args) => {
    if (!args.items.length) throw new Error("الفاتورة فارغة");
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
    const saleId = await ctx.db.insert("sales", { kind: "cash", subtotal, discount: args.discount, total, createdAt: Date.now() });
    for (const { product, quantity } of resolved) {
      await ctx.db.insert("saleItems", { saleId, productId: product._id, productName: product.name, quantity, unitPrice: product.salePrice, total: product.salePrice * quantity });
      await ctx.db.patch(product._id, { stock: product.stock - quantity });
    }
    return saleId;
  },
});
