import { Expense } from '../models/types';

const STORAGE_KEY = 'merchant_expenses';

export const getExpenses = (): Expense[] => {
  const local = localStorage.getItem(STORAGE_KEY);
  return local ? JSON.parse(local) : [];
};

export const saveExpenses = (expenses: Expense[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
};

export const addExpense = (category: string, amount: number, note?: string): Expense => {
  const expenses = getExpenses();
  const newExpense: Expense = {
    expenseId: 'exp_' + Date.now().toString(),
    category,
    amount,
    createdAt: new Date().toISOString(),
    note
  };
  saveExpenses([newExpense, ...expenses]);
  return newExpense;
};

export const updateExpense = (expenseId: string, category: string, amount: number, note?: string): Expense => {
  const expenses = getExpenses();
  const index = expenses.findIndex(e => e.expenseId === expenseId);
  if (index === -1) throw new Error('المصروف غير موجود');
  
  expenses[index] = {
    ...expenses[index],
    category,
    amount,
    note
  };
  
  saveExpenses(expenses);
  return expenses[index];
};

export const deleteExpense = (expenseId: string): void => {
  const expenses = getExpenses();
  const filtered = expenses.filter(e => e.expenseId !== expenseId);
  saveExpenses(filtered);
};
