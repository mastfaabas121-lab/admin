import { useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

type Command = { type: string; payload: any };

export function ConvexDataBridge() {
  const products = useQuery(api.products.list);
  const accounts = useQuery(api.customers.allAccounts);
  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);
  const removeProduct = useMutation(api.products.remove);
  const createCustomer = useMutation(api.customers.create);
  const updateCustomer = useMutation(api.customers.update);
  const removeCustomer = useMutation(api.customers.remove);
  const createDebt = useMutation(api.debts.create);
  const recordPayment = useMutation(api.debts.recordCustomerPayment);
  const createCashSale = useMutation(api.sales.createCashSale);
  const createCustomerSale = useMutation(api.sales.createCustomerSale);

  useEffect(() => {
    if (!products) return;
    localStorage.setItem("merchant_products", JSON.stringify(products.map((product) => ({
      productId: product._id,
      name: product.name,
      category: product.category,
      purchasePrice: product.purchasePrice,
      salePrice: product.salePrice,
      quantity: product.stock,
      lowStockLimit: product.lowStockAt,
      createdAt: new Date(product._creationTime).toISOString(),
      updatedAt: new Date(product._creationTime).toISOString(),
      barcode: product.sku,
      status: "active",
    }))));
    window.dispatchEvent(new Event("merchant_data_updated"));
  }, [products]);

  useEffect(() => {
    if (!accounts) return;
    const customerRows: any[] = [];
    const debtRows: Record<string, any[]> = {};
    const paymentRows: Record<string, any[]> = {};
    for (const account of accounts) {
      const { customer, debts, payments } = account;
      const totalTaken = debts.reduce((sum, debt) => sum + debt.originalAmount, 0);
      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const balance = debts.reduce((sum, debt) => sum + debt.remainingAmount, 0);
      const lastTime = Math.max(customer.createdAt ?? customer._creationTime, ...debts.map((debt) => debt.createdAt), ...payments.map((payment) => payment.paidAt));
      customerRows.push({
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        balance,
        totalTaken,
        totalPaid,
        lastActivity: new Date(lastTime).toISOString().slice(0, 10),
        status: "active",
      });
      debtRows[customer._id] = debts.map((debt) => ({
        debtId: debt._id,
        customerId: customer._id,
        description: debt.saleId ? "عملية بيع آجل" : "دين",
        quantity: 1,
        amount: debt.originalAmount,
        createdAt: new Date(debt.createdAt).toISOString().slice(0, 10),
        remainingAmount: debt.remainingAmount,
        status: debt.remainingAmount > 0 ? "OPEN" : "PAID",
        dueDate: new Date(debt.nextDueDate).toISOString().slice(0, 10),
      }));
      paymentRows[customer._id] = payments.map((payment) => ({
        paymentId: payment._id,
        customerId: customer._id,
        amount: payment.amount,
        createdAt: new Date(payment.paidAt).toISOString().slice(0, 10),
        note: payment.note ?? "",
        balanceBefore: 0,
        balanceAfter: 0,
      }));
    }
    localStorage.setItem("merchant_customers", JSON.stringify(customerRows));
    localStorage.setItem("merchant_debts", JSON.stringify(debtRows));
    localStorage.setItem("merchant_payments", JSON.stringify(paymentRows));
    window.dispatchEvent(new Event("merchant_data_updated"));
  }, [accounts]);

  useEffect(() => {
    const handle = async (event: Event) => {
      const { type, payload } = (event as CustomEvent<Command>).detail;
      try {
        if (type === "product.create") await createProduct(payload);
        if (type === "product.update") await updateProduct(payload);
        if (type === "product.remove") await removeProduct(payload);
        if (type === "customer.create") await createCustomer(payload);
        if (type === "customer.update") {
          const current = accounts?.find((account) => account.customer._id === payload.customerId)?.customer;
          await updateCustomer({
            ...payload,
            address: current?.address || "-",
            reminderDays: current?.reminderDays ?? 30,
          });
        }
        if (type === "customer.remove") await removeCustomer(payload);
        if (type === "debt.create") await createDebt(payload);
        if (type === "payment.create") await recordPayment(payload);
        if (type === "sale.cash") await createCashSale(payload);
        if (type === "sale.customer") await createCustomerSale(payload);
      } catch (error) {
        console.error("Convex sync failed", error);
        window.dispatchEvent(new CustomEvent("convex-sync-error", { detail: error }));
      }
    };
    window.addEventListener("convex-command", handle);
    return () => window.removeEventListener("convex-command", handle);
  }, [accounts, createProduct, updateProduct, removeProduct, createCustomer, updateCustomer, removeCustomer, createDebt, recordPayment, createCashSale, createCustomerSale]);

  return null;
}
