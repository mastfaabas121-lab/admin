import { getProducts, addStockMovement } from '../../inventory/services/inventoryService';
import { addDebt, getCustomers } from '../../debts/services/debtService';
import { Sale, SaleItem } from '../models/types';

const sync = (type: string, payload: unknown) =>
  window.dispatchEvent(new CustomEvent('convex-command', { detail: { type, payload } }));

export const getSales = (): Sale[] => {
  const local = localStorage.getItem('merchant_sales');
  return local ? JSON.parse(local) : [];
};

export const createSale = (
  saleType: 'CASH' | 'CREDIT',
  items: SaleItem[],
  customerId?: string,
  cashCustomer?: { name?: string; phone?: string; address?: string },
) => {
  const products = getProducts();

  for (const item of items) {
    const prod = products.find(p => p.productId === item.productId);
    if (!prod || prod.quantity < item.quantity) {
      throw new Error(`الكمية غير كافية للمنتج: ${item.productName}`);
    }
  }
  
  if (saleType === 'CREDIT' && !customerId) {
    throw new Error('يجب تحديد الزبون للبيع الآجل');
  }

  const enrichedItems = items.map(item => {
    const prod = products.find(p => p.productId === item.productId);
    return {
      ...item,
      unitPurchasePrice: prod?.purchasePrice || 0
    };
  });

  for (const item of enrichedItems) {
    addStockMovement(item.productId, 'STOCK_OUT', item.quantity, 'عملية بيع');
  }

  if (saleType === 'CREDIT' && customerId) {
    for (const item of enrichedItems) {
      addDebt(customerId, {
        description: item.productName,
        quantity: item.quantity,
        amount: item.totalPrice,
        note: 'عملية بيع آجل'
      });
    }
  }

  const total = enrichedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const newSale: Sale = {
    saleId: 's_' + Date.now().toString(),
    saleType,
    customerId,
    items: enrichedItems,
    subtotal: total,
    total: total,
    createdAt: new Date().toISOString(),
    customerName: cashCustomer?.name?.trim() || undefined,
    customerPhone: cashCustomer?.phone?.trim() || undefined,
    customerAddress: cashCustomer?.address?.trim() || undefined,
  };

  const sales = getSales();
  localStorage.setItem('merchant_sales', JSON.stringify([newSale, ...sales]));

  const convexItems = enrichedItems
    .filter((item) => !item.productId.startsWith('p_'))
    .map((item) => ({ productId: item.productId, quantity: item.quantity }));
  if (convexItems.length === enrichedItems.length) {
    if (saleType === 'CREDIT' && customerId && !customerId.startsWith('c_')) {
      sync('sale.customer', { customerId, paidAmount: 0, items: convexItems });
    } else if (saleType === 'CASH') {
      sync('sale.cash', {
        discount: 0,
        customerName: cashCustomer?.name?.trim() || undefined,
        customerPhone: cashCustomer?.phone?.trim() || undefined,
        customerAddress: cashCustomer?.address?.trim() || undefined,
        items: convexItems,
      });
    }
  }

  return newSale;
};

export const deleteSale = (saleId: string) => {
  const sales = getSales();
  const saleIdx = sales.findIndex(s => s.saleId === saleId);
  if (saleIdx < 0) return;
  const sale = sales[saleIdx];

  // 1. Return items to stock
  for (const item of sale.items) {
    addStockMovement(item.productId, 'STOCK_IN', item.quantity, 'إلغاء عملية بيع');
  }

  // 2. If credit, adjust customer balance
  if (sale.saleType === 'CREDIT' && sale.customerId) {
    const customersLocal = localStorage.getItem('merchant_customers');
    if (customersLocal) {
      const customers = JSON.parse(customersLocal);
      const cIdx = customers.findIndex((c: any) => c.id === sale.customerId);
      if (cIdx > -1) {
        customers[cIdx].balance -= sale.total;
        customers[cIdx].totalTaken -= sale.total;
        localStorage.setItem('merchant_customers', JSON.stringify(customers));
      }
    }
    
    const debtsLocal = localStorage.getItem('merchant_debts');
    if (debtsLocal) {
      const allDebts = JSON.parse(debtsLocal);
      const cDebts = allDebts[sale.customerId] || [];
      for (const item of sale.items) {
        const dIdx = cDebts.findIndex((d: any) => d.description === item.productName && d.amount === item.totalPrice && d.note === 'عملية بيع آجل');
        if (dIdx > -1) {
          cDebts.splice(dIdx, 1);
        }
      }
      allDebts[sale.customerId] = cDebts;
      localStorage.setItem('merchant_debts', JSON.stringify(allDebts));
    }
    window.dispatchEvent(new Event('merchant_data_updated'));
  }

  // 3. Remove sale
  sales.splice(saleIdx, 1);
  localStorage.setItem('merchant_sales', JSON.stringify(sales));
};
