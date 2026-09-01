/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { AppRouter } from './navigation/app_router/AppRouter';
import { ConvexDataBridge } from './shared/convex/ConvexDataBridge';

export default function App() {
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isUpdateVisible, setIsUpdateVisible] = useState(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const dismissedUpdateRef = useRef(false);

  useEffect(() => {
    let updateTimer: number | undefined;
    let reloadingForUpdate = false;
    const reloadForUpdate = () => {
      if (reloadingForUpdate) return;
      reloadingForUpdate = true;
      window.location.reload();
    };

    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      const baseUrl = import.meta.env.BASE_URL;
      navigator.serviceWorker
        .register(`${baseUrl}sw.js?v=${encodeURIComponent(import.meta.env.VITE_APP_VERSION)}`, {
          scope: baseUrl,
          updateViaCache: 'none',
        })
        .then((registration) => {
          const announceUpdate = () => {
            if (!registration.waiting || !navigator.serviceWorker.controller || dismissedUpdateRef.current) return;
            setUpdateRegistration(registration);
            setIsUpdateVisible(true);
          };

          announceUpdate();
          registration.update().then(announceUpdate).catch(() => undefined);
          registration.addEventListener('updatefound', () => {
            const worker = registration.installing;
            worker?.addEventListener('statechange', () => {
              if (worker.state === 'installed') announceUpdate();
            });
          });
          updateTimer = window.setInterval(() => {
            registration.update().then(announceUpdate).catch(() => undefined);
          }, 60_000);
        })
        .catch((error) => console.error('تعذر تشغيل التحديث التلقائي', error));

      navigator.serviceWorker.addEventListener('controllerchange', reloadForUpdate);
    }

    const isLocalDataCleaned = localStorage.getItem('LOCAL_DATA_CLEANUP_V2');
    if (!isLocalDataCleaned) {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('merchant_') || key.startsWith('mock_')) {
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem('LOCAL_DATA_CLEANUP_V2', 'true');
      localStorage.setItem('app_theme', 'dark');
      window.location.reload();
      return;
    }

    // Initialize theme
    const theme = localStorage.getItem('app_theme') || 'dark';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    return () => {
      if (updateTimer) window.clearInterval(updateTimer);
      navigator.serviceWorker?.removeEventListener('controllerchange', reloadForUpdate);
    };
  }, []);

  const applyUpdate = () => {
    const waitingWorker = updateRegistration?.waiting;
    if (!waitingWorker) return;
    setIsApplyingUpdate(true);
    waitingWorker.postMessage({ type: 'ACTIVATE_UPDATE' });
  };

  const dismissUpdate = () => {
    dismissedUpdateRef.current = true;
    setIsUpdateVisible(false);
  };

  return <>
    <ConvexDataBridge />
    <AppRouter />
    {isUpdateVisible && (
      <div className="fixed inset-x-3 top-3 z-[200] mx-auto max-w-md rounded-2xl border border-indigo-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-800" dir="rtl" role="status">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
            <RefreshCw size={22} className={isApplyingUpdate ? 'animate-spin' : ''} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-gray-900 dark:text-white">يتوفر تحديث جديد</h2>
            <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-300">حدّث الآن للحصول على أحدث التحسينات والإصلاحات.</p>
          </div>
          <button
            type="button"
            aria-label="لاحقًا"
            onClick={dismissUpdate}
            disabled={isApplyingUpdate}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300"
          >
            <X size={17} />
          </button>
        </div>
        <button
          type="button"
          onClick={applyUpdate}
          disabled={isApplyingUpdate}
          className="mt-3 w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-70"
        >
          {isApplyingUpdate ? 'جارٍ تثبيت التحديث...' : 'تحديث الآن'}
        </button>
      </div>
    )}
  </>;
}
