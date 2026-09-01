import { mockCustomers, mockCustomerTransactions, mockSuppliers } from '../../../data/mock/merchant/mockData';
import { Customer, Supplier } from '../../../shared/models/types';

const sync = (type: string, payload: unknown) =>
  window.dispatchEvent(new CustomEvent('convex-command', { detail: { type, payload } }));

export interface Debt {
  debtId: string;
  customerId: string;
  description: string;
  quantity: number;
  amount: number;
  createdAt: string;
  remainingAmount: number;
  status: 'OPEN' | 'PAID';
  note?: string;
  dueDate?: string;
}

export interface Payment {
  paymentId: string;
  customerId: string;
  amount: number;
  createdAt: string;
  note: string;
  balanceBefore: number;
  balanceAfter: number;
}

export const getCustomers = (): Customer[] => {
  const local = localStorage.getItem('merchant_customers');
  if (local) return JSON.parse(local);
  return mockCustomers;
};

export const getCustomer = (id: string): Customer | undefined => {
  return getCustomers().find(c => c.id === id);
};

export const saveCustomers = (customers: Customer[]) => {
  localStorage.setItem('merchant_customers', JSON.stringify(customers));
  window.dispatchEvent(new Event('merchant_data_updated'));
};

export const updateCustomer = (id: string, name: string, phone: string) => {
  const customers = getCustomers();
  const cIdx = customers.findIndex(c => c.id === id);
  if (cIdx > -1) {
    customers[cIdx].name = name;
    customers[cIdx].phone = phone;
    saveCustomers(customers);
    if (!id.startsWith('c_')) sync('customer.update', { customerId: id, name, phone });
  }
};

export const canDeleteCustomer = (id: string): boolean => {
  return getCustomers().some(c => c.id === id);
};

export const deleteCustomer = (id: string): boolean => {
  const customers = getCustomers();
  if (!customers.some(c => c.id === id)) return false;
  const filtered = customers.filter(c => c.id !== id);

  const allDebts: Record<string, Debt[]> = JSON.parse(localStorage.getItem('merchant_debts') || '{}');
  const allPayments: Record<string, Payment[]> = JSON.parse(localStorage.getItem('merchant_payments') || '{}');
  delete allDebts[id];
  delete allPayments[id];
  localStorage.setItem('merchant_debts', JSON.stringify(allDebts));
  localStorage.setItem('merchant_payments', JSON.stringify(allPayments));
  saveCustomers(filtered);
  if (!id.startsWith('c_')) sync('customer.remove', { customerId: id });
  return true;
};

export const addCustomer = (name: string, phone: string) => {
  const customers = getCustomers();
  
  // Generate random 8 digit login number and 6 digit password
  const customerLoginNumber = Math.floor(10000000 + Math.random() * 90000000).toString();
  const customerPassword = Math.floor(100000 + Math.random() * 900000).toString();

  const newCustomer: Customer = {
    id: 'c_' + Date.now(),
    name,
    phone,
    balance: 0,
    lastActivity: new Date().toISOString().split('T')[0],
    totalTaken: 0,
    totalPaid: 0,
    status: 'active',
    customerLoginNumber,
    customerPassword,
  };
  saveCustomers([newCustomer, ...customers]);
  sync('customer.create', { name, phone, address: '-', reminderDays: 30 });
  return newCustomer.id;
};

export const getDebts = (customerId: string): Debt[] => {
  const local = localStorage.getItem('merchant_debts');
  const allDebts: Record<string, Debt[]> = local ? JSON.parse(local) : {};
  
  if (!allDebts[customerId]) {
    const mockTxs = mockCustomerTransactions[customerId] || [];
    allDebts[customerId] = mockTxs.filter(t => t.type === 'debt').map(t => ({
      debtId: t.id,
      customerId,
      description: t.description,
      quantity: t.items ? t.items.reduce((acc, i) => acc + i.quantity, 0) : 1,
      amount: t.amount,
      createdAt: t.date,
      remainingAmount: t.amount,
      status: 'OPEN',
      note: ''
    }));
  }
  return allDebts[customerId] || [];
};

export const addDebt = (customerId: string, debtData: Omit<Debt, 'debtId' | 'customerId' | 'createdAt' | 'remainingAmount' | 'status'>) => {
  const local = localStorage.getItem('merchant_debts');
  const allDebts: Record<string, Debt[]> = local ? JSON.parse(local) : {};
  
  const currentDebts = getDebts(customerId);
  if (!allDebts[customerId]) allDebts[customerId] = currentDebts;

  const newDebt: Debt = {
    ...debtData,
    debtId: 'd_' + Date.now().toString(),
    customerId,
    createdAt: new Date().toISOString().split('T')[0],
    remainingAmount: debtData.amount,
    status: 'OPEN'
  };

  allDebts[customerId] = [newDebt, ...allDebts[customerId]];
  localStorage.setItem('merchant_debts', JSON.stringify(allDebts));
  if (!customerId.startsWith('c_') && debtData.note !== 'عملية بيع آجل') {
    sync('debt.create', {
      customerId,
      amount: debtData.amount,
      installmentAmount: debtData.amount,
    });
  }

  const customers = getCustomers();
  const cIdx = customers.findIndex(c => c.id === customerId);
  if (cIdx >= 0) {
    customers[cIdx].balance += newDebt.amount;
    customers[cIdx].totalTaken += newDebt.amount;
    saveCustomers(customers);
  }
};

export const addPayment = (customerId: string, amount: number, note: string = '') => {
  const customers = getCustomers();
  const cIdx = customers.findIndex(c => c.id === customerId);
  if (cIdx < 0) return;

  const customer = customers[cIdx];
  const balanceBefore = customer.balance;
  const balanceAfter = balanceBefore - amount;

  const local = localStorage.getItem('merchant_debts');
  const allDebts: Record<string, Debt[]> = local ? JSON.parse(local) : {};
  const debts = getDebts(customerId);
   
  let remainingPayment = amount;
  
  const openDebts = debts.filter(d => d.status === 'OPEN').sort((a, b) => {
    const tA = new Date(a.createdAt).getTime();
    const tB = new Date(b.createdAt).getTime();
    if (tA === tB) return a.debtId.localeCompare(b.debtId);
    return tA - tB;
  });

  for (const debt of openDebts) {
    if (remainingPayment <= 0) break;
    
    const actualDebt = debts.find(d => d.debtId === debt.debtId);
    if (!actualDebt) continue;

    if (remainingPayment >= actualDebt.remainingAmount) {
      remainingPayment -= actualDebt.remainingAmount;
      actualDebt.remainingAmount = 0;
      actualDebt.status = 'PAID';
    } else {
      actualDebt.remainingAmount -= remainingPayment;
      remainingPayment = 0;
    }
  }

  allDebts[customerId] = debts;
  localStorage.setItem('merchant_debts', JSON.stringify(allDebts));

  customer.balance = balanceAfter;
  customer.totalPaid += amount;
  saveCustomers(customers);

  const localPayments = localStorage.getItem('merchant_payments');
  const allPayments: Record<string, Payment[]> = localPayments ? JSON.parse(localPayments) : {};
  const newPayment: Payment = {
    paymentId: 'p_' + Date.now().toString(),
    customerId,
    amount,
    createdAt: new Date().toISOString().split('T')[0],
    note,
    balanceBefore,
    balanceAfter
  };

  if (!allPayments[customerId]) allPayments[customerId] = [];
  allPayments[customerId] = [newPayment, ...allPayments[customerId]];
  localStorage.setItem('merchant_payments', JSON.stringify(allPayments));
  if (!customerId.startsWith('c_')) sync('payment.create', { customerId, amount, note });
  
  return { balanceBefore, balanceAfter };
};

// -- SUPPLIERS --
export const getSuppliers = (): Supplier[] => {
  const local = localStorage.getItem('merchant_suppliers');
  if (local) return JSON.parse(local);
  return mockSuppliers;
};

export const saveSuppliers = (suppliers: Supplier[]) => {
  localStorage.setItem('merchant_suppliers', JSON.stringify(suppliers));
};

export const addSupplierDebt = (supplierId: string, amount: number) => {
  const suppliers = getSuppliers();
  const sIdx = suppliers.findIndex(s => s.id === supplierId);
  if (sIdx >= 0) {
    suppliers[sIdx].balance += amount; // Assuming balance is how much we owe the supplier.
    saveSuppliers(suppliers);
  }
};

export const deletePayment = (customerId: string, paymentId: string) => {
  const localPayments = localStorage.getItem('merchant_payments');
  if (!localPayments) return;
  const allPayments = JSON.parse(localPayments);
  const cPayments = allPayments[customerId] || [];
  
  const paymentIdx = cPayments.findIndex((p: any) => p.paymentId === paymentId);
  if (paymentIdx < 0) return;
  
  const payment = cPayments[paymentIdx];
  cPayments.splice(paymentIdx, 1);
  allPayments[customerId] = cPayments;
  localStorage.setItem('merchant_payments', JSON.stringify(allPayments));

  // Re-adjust balance
  const customersLocal = localStorage.getItem('merchant_customers');
  if (customersLocal) {
    const customers = JSON.parse(customersLocal);
    const cIdx = customers.findIndex((c: any) => c.id === customerId);
    if (cIdx > -1) {
      customers[cIdx].balance += payment.amount;
      customers[cIdx].totalPaid -= payment.amount;
      localStorage.setItem('merchant_customers', JSON.stringify(customers));
    }
  }

  // Also we need to re-distribute the debt. The simplest way is to fetch debts, sort by date, and re-apply payments.
  // Given complexity, let's just mark debts as OPEN again based on re-calculating logic or simply marking all OPEN then applying payments.
  const debtsLocal = localStorage.getItem('merchant_debts');
  if (debtsLocal) {
    const allDebts = JSON.parse(debtsLocal);
    const cDebts = allDebts[customerId] || [];
    
    // Reset all debts
    cDebts.forEach((d: any) => {
      d.status = 'OPEN';
      d.remainingAmount = d.amount;
    });

    // Re-apply remaining payments
    let remainingPayments = cPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
    cDebts.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    for (const d of cDebts) {
      if (remainingPayments <= 0) break;
      if (remainingPayments >= d.amount) {
        remainingPayments -= d.amount;
        d.remainingAmount = 0;
        d.status = 'PAID';
      } else {
        d.remainingAmount = d.amount - remainingPayments;
        remainingPayments = 0;
      }
    }
    allDebts[customerId] = cDebts;
    localStorage.setItem('merchant_debts', JSON.stringify(allDebts));
  }
  
  window.dispatchEvent(new Event('merchant_data_updated'));
};

export const deleteDebt = (customerId: string, debtId: string) => {
  const debtsLocal = localStorage.getItem('merchant_debts');
  if (!debtsLocal) return;
  const allDebts = JSON.parse(debtsLocal);
  const cDebts = allDebts[customerId] || [];
  
  const dIdx = cDebts.findIndex((d: any) => d.debtId === debtId);
  if (dIdx < 0) return;
  
  const debt = cDebts[dIdx];
  cDebts.splice(dIdx, 1);
  allDebts[customerId] = cDebts;
  localStorage.setItem('merchant_debts', JSON.stringify(allDebts));

  // Re-adjust balance
  const customersLocal = localStorage.getItem('merchant_customers');
  if (customersLocal) {
    const customers = JSON.parse(customersLocal);
    const cIdx = customers.findIndex((c: any) => c.id === customerId);
    if (cIdx > -1) {
      customers[cIdx].balance -= debt.amount;
      customers[cIdx].totalTaken -= debt.amount;
      localStorage.setItem('merchant_customers', JSON.stringify(customers));
    }
  }

  // Re-apply payments to remaining debts
  const localPayments = localStorage.getItem('merchant_payments');
  if (localPayments) {
    const allPayments = JSON.parse(localPayments);
    const cPayments = allPayments[customerId] || [];
    let remainingPayments = cPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
    
    cDebts.forEach((d: any) => {
      d.status = 'OPEN';
      d.remainingAmount = d.amount;
    });

    cDebts.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    for (const d of cDebts) {
      if (remainingPayments <= 0) break;
      if (remainingPayments >= d.amount) {
        remainingPayments -= d.amount;
        d.remainingAmount = 0;
        d.status = 'PAID';
      } else {
        d.remainingAmount = d.amount - remainingPayments;
        remainingPayments = 0;
      }
    }
    allDebts[customerId] = cDebts;
    localStorage.setItem('merchant_debts', JSON.stringify(allDebts));
  }

  window.dispatchEvent(new Event('merchant_data_updated'));
};

export const getPayments = (customerId: string): Payment[] => {
  const localPayments = localStorage.getItem('merchant_payments');
  if (!localPayments) return [];
  const allPayments = JSON.parse(localPayments);
  return allPayments[customerId] || [];
};
