import React, { useState } from 'react';
import { ChevronRight, User } from 'lucide-react';
import { useConvex } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

interface Props {
  onLogin: (id: string) => void;
  onBack: () => void;
}

export function CustomerLoginScreen({ onLogin, onBack }: Props) {
  const [loginNumber, setLoginNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const convex = useConvex();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const found = await convex.query(api.customers.findByPhone, { phone: loginNumber });
      if (found) {
        setError('');
        onLogin(found._id);
        return;
      }
      setError('رقم الهاتف غير مسجل. يرجى التأكد والمحاولة مرة أخرى.');
    } catch {
      setError('تعذر الاتصال بقاعدة البيانات. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-[Cairo]" dir="rtl">
      <div className="p-4 sticky top-0 bg-gray-50 z-10">
        <button onClick={onBack} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-600 hover:bg-gray-100 transition-colors">
          <ChevronRight size={24} />
        </button>
      </div>
      
      <div className="flex-1 flex flex-col justify-center p-6 max-w-md w-full mx-auto -mt-10">
        <div className="w-20 h-20 bg-teal-600 rounded-3xl flex items-center justify-center text-white mb-6 shadow-lg shadow-teal-200">
          <User size={40} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">تسجيل دخول الزبون</h1>
        <p className="text-sm text-gray-500 mb-8">تابع ديونك ومدفوعاتك بكل سهولة</p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm font-bold p-3 rounded-xl mb-4 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">رقم الهاتف</label>
            <input 
              type="text" 
              value={loginNumber}
              onChange={(e) => setLoginNumber(e.target.value)}
              inputMode="tel"
              placeholder="07XXXXXXXXX" 
              className="w-full bg-white border border-gray-200 text-gray-900 rounded-xl p-4 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all text-left" 
              dir="ltr" 
              required 
            />
          </div>
          
          <button disabled={loading} type="submit" className="w-full bg-teal-600 text-white font-bold rounded-xl p-4 mt-6 hover:bg-teal-700 active:scale-[0.98] transition-all shadow-md shadow-teal-200 disabled:opacity-60">
            {loading ? 'جاري التحقق...' : 'دخول إلى حسابي'}
          </button>
        </form>
      </div>
    </div>
  );
}
