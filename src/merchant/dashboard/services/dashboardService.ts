import { getCustomers } from '../../debts/services/debtService';
import { getSuppliers } from '../../suppliers/services/supplierService';
import { getSales } from '../../sales/services/salesService';
import { getExpenses } from '../../expenses/services/expenseService';

export const getDashboardStats = () => {
  const customers = getCustomers();
  const suppliers = getSuppliers();
  const sales = getSales();
  const expenses = getExpenses();

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const customersDebt = customers.reduce((sum, c) => sum + c.balance, 0);
  const suppliersDebt = suppliers.reduce((sum, s) => sum + s.balance, 0);

  const todaySales = sales.filter(s => s.createdAt.startsWith(todayStr));
  const todaySalesTotal = todaySales.reduce((sum, s) => sum + s.total, 0);

  const todayExpenses = expenses.filter(e => e.createdAt && e.createdAt.startsWith(todayStr));
  const todayExpensesTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const todayProfitFromSales = todaySales.reduce((sum, sale) => {
    return sum + sale.items.reduce((itemSum, item) => {
      const profit = item.totalPrice - ((item.unitPurchasePrice || 0) * item.quantity);
      return itemSum + profit;
    }, 0);
  }, 0);

  const todayProfit = todayProfitFromSales - todayExpensesTotal;

  return {
    customersDebt,
    suppliersDebt,
    todaySales: todaySalesTotal,
    todayProfit
  };
};
