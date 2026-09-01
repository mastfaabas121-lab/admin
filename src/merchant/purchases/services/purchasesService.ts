import { addStockMovement, updateProduct } from '../../inventory/services/inventoryService';
import { getSuppliers, saveSuppliers } from '../../suppliers/services/supplierService';
import { Purchase, PurchaseItem } from '../models/types';

export const getPurchases = (): Purchase[] => {
  const local = localStorage.getItem('merchant_purchases');
  return local ? JSON.parse(local) : [];
};

export const createPurchase = (
  paymentType: 'CASH' | 'CREDIT',
  items: PurchaseItem[],
  supplierId?: string
) => {
  if (paymentType === 'CREDIT' && !supplierId) {
    throw new Error('يجب تحديد المورد للشراء الآجل');
  }

  for (const item of items) {
    addStockMovement(item.productId, 'STOCK_IN', item.quantity, 'عملية شراء');
    updateProduct(item.productId, { purchasePrice: item.unitPurchasePrice });
  }

  const total = items.reduce((sum, item) => sum + item.totalPrice, 0);

  if (paymentType === 'CREDIT' && supplierId) {
    const suppliers = getSuppliers();
    const supIndex = suppliers.findIndex(s => s.supplierId === supplierId);
    if (supIndex !== -1) {
      suppliers[supIndex].balance += total;
      saveSuppliers(suppliers);
    }
  }

  const newPurchase: Purchase = {
    purchaseId: 'pur_' + Date.now().toString(),
    paymentType,
    supplierId,
    items,
    subtotal: total,
    total: total,
    ...(paymentType === 'CREDIT' && {
      remainingAmount: total,
      status: 'OPEN'
    }),
    createdAt: new Date().toISOString()
  };

  const purchases = getPurchases();
  localStorage.setItem('merchant_purchases', JSON.stringify([newPurchase, ...purchases]));

  return newPurchase;
};

export const deletePurchase = (purchaseId: string) => {
  const purchases = getPurchases();
  const purIdx = purchases.findIndex(p => p.purchaseId === purchaseId);
  if (purIdx < 0) return;
  const purchase = purchases[purIdx];

  // 1. Subtract items from stock
  for (const item of purchase.items) {
    addStockMovement(item.productId, 'STOCK_OUT', item.quantity, 'إلغاء عملية شراء');
  }

  // 2. Adjust supplier balance if credit
  if (purchase.paymentType === 'CREDIT' && purchase.supplierId) {
    const suppliers = getSuppliers();
    const supIndex = suppliers.findIndex(s => s.supplierId === purchase.supplierId);
    if (supIndex !== -1) {
      suppliers[supIndex].balance -= purchase.total;
      saveSuppliers(suppliers);
    }
  }

  // 3. Remove purchase
  purchases.splice(purIdx, 1);
  localStorage.setItem('merchant_purchases', JSON.stringify(purchases));
};
