/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect } from 'react';
import { AppRouter } from './navigation/app_router/AppRouter';
import { ConvexDataBridge } from './shared/convex/ConvexDataBridge';

export default function App() {
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
          const activateUpdate = () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
          activateUpdate();
          registration.update();
          registration.addEventListener('updatefound', () => {
            const worker = registration.installing;
            worker?.addEventListener('statechange', () => {
              if (worker.state === 'installed') activateUpdate();
            });
          });
          updateTimer = window.setInterval(() => registration.update(), 60_000);
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

  return <><ConvexDataBridge /><AppRouter /></>;
}
