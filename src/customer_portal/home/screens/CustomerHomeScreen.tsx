import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  LogOut,
  Store,
  CreditCard,
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  Banknote,
} from "lucide-react";
import { Card } from "../../../shared/components/Card";

interface Props {
  customerId: string;
  onLogout: () => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("ar-IQ").format(amount) + " د.ع";

export function CustomerHomeScreen({ customerId, onLogout }: Props) {
  const account = useQuery(api.customers.account, {
    customerId: customerId as Id<"customers">,
  });

  if (account === undefined)
    return (
      <div
        className="min-h-screen bg-gray-50 flex items-center justify-center font-[Cairo]"
        dir="rtl"
      >
        جاري التحميل...
      </div>
    );

  if (!account)
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 font-[Cairo]" dir="rtl">
        <p>تعذر العثور على حساب الزبون.</p>
        <button onClick={onLogout} className="text-teal-600 font-bold">العودة إلى الدخول</button>
      </div>
    );

  const customer = account.customer;
  const debts = account.transactions.filter((transaction) => transaction.remainingAmount > 0);
  const payments = account.transactions.filter((transaction) => transaction.kind === "payment");
  const totalTaken = account.transactions
    .filter((transaction) => transaction.kind !== "payment")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalPaid = account.transactions
    .reduce((sum, transaction) => sum + transaction.paidAmount, 0);
  const storeName = 'البيت الأبيض للأثاث';
  const formatDate = (value: number) => new Intl.DateTimeFormat('en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(value);

  return (
    <div
      className="min-h-screen bg-gray-50 flex flex-col font-[Cairo]"
      dir="rtl"
    >
      <div className="bg-teal-600 px-5 pt-8 pb-12 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-900 opacity-20 rounded-full blur-2xl -ml-10 -mb-10"></div>

        <div className="flex justify-between items-center relative z-10">
          <div>
            <h1 className="text-xl font-bold text-white">حسابي</h1>
            <p className="text-teal-100 text-sm mt-1 flex items-center gap-1">
              <Store size={14} /> {storeName}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="px-5 -mt-6 relative z-20 space-y-4 pb-10">
        <Card className="border-none shadow-xl shadow-teal-900/5 bg-white relative overflow-hidden !p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
              <CreditCard size={20} />
            </div>
            <p className="text-sm font-bold text-gray-500">المبلغ المتبقي</p>
          </div>
          <h2 className="text-3xl font-black text-gray-900 mt-2">
            {formatCurrency(account.totalDebt)}
          </h2>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none shadow-md shadow-gray-200/40 !p-4 bg-white">
            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-3">
              <ArrowUpRight size={18} />
            </div>
            <p className="text-xs font-bold text-gray-500 mb-1">إجمالي الأخذ</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(totalTaken)}
            </p>
          </Card>

          <Card className="border-none shadow-md shadow-gray-200/40 !p-4 bg-white">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 mb-3">
              <ArrowDownRight size={18} />
            </div>
            <p className="text-xs font-bold text-gray-500 mb-1">
              إجمالي التسديد
            </p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(totalPaid)}
            </p>
          </Card>
        </div>

        <section className="pt-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Receipt size={18} className="text-teal-600" />
            الديون الحالية
          </h3>
          <div className="space-y-2">
            {debts.map((d) => (
              <div
                key={d.id}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center"
              >
                <div className="flex-1 pl-2">
                  <p className="text-sm font-bold text-gray-900">
                    {d.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 flex gap-2">
                    <span>{formatDate(d.date)}</span>
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-red-600">
                    {formatCurrency(d.remainingAmount)}
                  </p>
                </div>
              </div>
            ))}
            {debts.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-xl border border-gray-100">
                لا توجد ديون حالية
              </div>
            )}
          </div>
        </section>

        <section className="pt-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Banknote size={18} className="text-teal-600" />
            آخر التسديدات
          </h3>
          <div className="space-y-2">
            {payments.map((p) => (
              <div
                key={p.id}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center"
              >
                <div className="flex-1 pl-2">
                  <p className="text-sm font-bold text-gray-900">تسديد دفعة</p>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(p.date)}</p>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-green-600">
                    {formatCurrency(p.amount)}
                  </p>
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-xl border border-gray-100">
                لا توجد تسديدات سابقة
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
