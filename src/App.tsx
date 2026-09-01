/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect } from 'react';
import { AppRouter } from './navigation/app_router/AppRouter';
import { ConvexDataBridge } from './shared/convex/ConvexDataBridge';

export default function App() {
  useEffect(() => {
    // Remove the previous dashboard service worker so the restored interface
    // is not replaced by stale cached files.
    navigator.serviceWorker?.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });

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
  }, []);

  return <><ConvexDataBridge /><AppRouter /></>;
}
