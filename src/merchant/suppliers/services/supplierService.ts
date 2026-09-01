import { Supplier, SupplierPayment } from '../models/types';
import { getPurchases } from '../../purchases/services/purchasesService';
import { Purchase } from '../../purchases/models/types';

export const getSuppliers = (): Supplier[] => {
  const local = localStorage.getItem('merchant_suppliers_new');
  return local ? JSON.parse(local) : [];
};

export const saveSuppliers = (suppliers: Supplier[]) => {
  localStorage.setItem('merchant_suppliers_new', JSON.stringify(suppliers));
};

export const getSupplierById = (supplierId: string): Supplier | undefined => {
  return getSuppliers().find(s => s.supplierId === supplierId);
};

export const addSupplier = (name: string, phone: string, notes?: string): Supplier => {
  const suppliers = getSuppliers();
  const newSupplier: Supplier = {
    supplierId: 'sup_' + Date.now().toString(),
    name,
    phone,
    notes,
    createdAt: new Date().toISOString(),
    balance: 0
  };
  saveSuppliers([newSupplier, ...suppliers]);
  return newSupplier;
};

export const getSupplierPayments = (supplierId: string): SupplierPayment[] => {
  const local = localStorage.getItem('merchant_supplier_payments');
  const payments: SupplierPayment[] = local ? JSON.parse(local) : [];
  return payments.filter(p => p.supplierId === supplierId);
};

export const addSupplierPayment = (supplierId: string, amount: number, note?: string): SupplierPayment => {
  const suppliers = getSuppliers();
  const supplierIndex = suppliers.findIndex(s => s.supplierId === supplierId);
  if (supplierIndex === -1) throw new Error('المورد غير موجود');

  const supplier = suppliers[supplierIndex];
  const balanceBefore = supplier.balance;
  
  if (amount <= 0) throw new Error('المبلغ يجب أن يكون أكبر من صفر');
  
  const balanceAfter = Math.max(0, balanceBefore - amount);
  
  // Create payment record
  const newPayment: SupplierPayment = {
    supplierPaymentId: 'spay_' + Date.now().toString(),
    supplierId,
    amount,
    balanceBefore,
    balanceAfter,
    createdAt: new Date().toISOString(),
    note
  };

  const localPayments = localStorage.getItem('merchant_supplier_payments');
  const payments = localPayments ? JSON.parse(localPayments) : [];
  localStorage.setItem('merchant_supplier_payments', JSON.stringify([newPayment, ...payments]));

  // Update supplier balance
  suppliers[supplierIndex].balance = balanceAfter;
  saveSuppliers(suppliers);

  // Apply FIFO logic to OPEN credit purchases
  const allPurchases = getPurchases();
  let remainingPayment = amount;

  // Process from oldest to newest (purchases are stored newest first)
  for (let i = allPurchases.length - 1; i >= 0; i--) {
    const purchase = allPurchases[i];
    if (
      purchase.supplierId === supplierId && 
      purchase.paymentType === 'CREDIT' && 
      purchase.status !== 'PAID' &&
      remainingPayment > 0
    ) {
      const currentRemaining = purchase.remainingAmount ?? purchase.total;
      
      if (remainingPayment >= currentRemaining) {
        remainingPayment -= currentRemaining;
        allPurchases[i] = { ...purchase, remainingAmount: 0, status: 'PAID' as const };
      } else {
        const newRemaining = currentRemaining - remainingPayment;
        remainingPayment = 0;
        allPurchases[i] = { ...purchase, remainingAmount: newRemaining };
      }
    }
  }

  localStorage.setItem('merchant_purchases', JSON.stringify(allPurchases));

  return newPayment;
};
