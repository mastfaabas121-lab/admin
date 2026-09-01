
import React, { useState } from 'react';
import { ChevronRight, Store } from 'lucide-react';

interface Props {
  onLogin: () => void;
  onBack: () => void;
  onGoToRegister: () => void;
}

export function MerchantLoginScreen({ onLogin, onBack, onGoToRegister }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code === '1001') {
      setError('');
      onLogin();
    } else {
      setError('رمز الدخول غير صحيح');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-[Cairo]" dir="rtl">
      <div className="p-4">
        <button onClick={onBack} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-600 hover:bg-gray-100 transition-colors">
          <ChevronRight size={24} />
        </button>
      </div>
      
      <div className="flex-1 flex flex-col justify-center p-6 max-w-md w-full mx-auto -mt-10">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-200">
          <Store size={40} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">تسجيل الدخول للمحل</h1>
        <p className="text-sm text-gray-500 mb-8">أدخل رمز الدخول للمتابعة</p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm font-bold p-3 rounded-xl mb-4 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">رمز الدخول</label>
            <input 
              type="password" 
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-white border border-gray-200 text-gray-900 rounded-xl p-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-left" 
              dir="ltr" 
              required 
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold rounded-xl p-4 mt-4 hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md shadow-indigo-200">
            تسجيل الدخول
          </button>
        </form>

      </div>
    </div>
  );
}
