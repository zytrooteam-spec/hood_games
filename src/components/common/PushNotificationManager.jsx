'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Bell, X, ExternalLink, Sparkles, ShieldCheck, MessageSquare } from 'lucide-react';
import { playTune, unlockAudioContext } from '@/lib/soundAlerts';
import { getOrCreateDeviceId } from '@/lib/deviceClient';

export default function PushNotificationManager() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeToast, setActiveToast] = useState(null);
  const [toastProgress, setToastProgress] = useState(100);
  const lastSeenIdRef = useRef(null);
  const isInitialRef = useRef(true);
  const toastTimerRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Helper to trigger native Chrome desktop & Android notification shade
  const triggerChromeDesktopNotification = async (item) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const title = item.title || '🎰 VIP Flash Coin Drop Activated!';
      const body =
        item.message ||
        '5.00 SC + 50,000 GC test bonus has been credited to your player account. Enjoy the games!';
      const url = item.url || '/';

      try {
        // Method 1: Use registered Service Worker (Mandatory for Android Chrome notification bar)
        if ('serviceWorker' in navigator) {
          try {
            const reg = await navigator.serviceWorker.ready;
            if (reg && reg.showNotification) {
              await reg.showNotification(title, {
                body,
                icon: '/logo.png',
                badge: '/logo.png',
                tag: 'pp-alert-' + (item.id || Date.now()),
                renotify: true,
                requireInteraction: true,
                vibrate: [300, 100, 300],
                data: { url, date: Date.now() },
                actions: [
                  { action: 'open', title: 'Claim / View' },
                  { action: 'dismiss', title: 'Dismiss' },
                ],
              });
              return;
            }
          } catch (swErr) {
            console.warn('SW showNotification notice:', swErr);
          }

          // Method 2: Send message to active service worker controller
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_NOTIFICATION',
              title,
              body,
              url,
            });
            return;
          }
        }

        // Method 3: Desktop browser standard Notification API fallback
        new Notification(title, {
          body,
          icon: '/logo.png',
          tag: 'pp-alert-' + (item.id || Date.now()),
        });
      } catch (err) {
        console.warn('Chrome notification dispatch error:', err);
      }
    }
  };

  // Helper to show In-App Pop-Up Toast
  const showInAppToast = (item) => {
    // Play sci-fi audio alert
    try {
      unlockAudioContext();
      playTune('cyber', 0.65);
    } catch {}

    setActiveToast(item);
    setToastProgress(100);

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    const totalDuration = 7000;
    const intervalStep = 100;
    let elapsed = 0;

    progressIntervalRef.current = setInterval(() => {
      elapsed += intervalStep;
      const remainingPct = Math.max(0, 100 - (elapsed / totalDuration) * 100);
      setToastProgress(remainingPct);
      if (elapsed >= totalDuration) {
        clearInterval(progressIntervalRef.current);
      }
    }, intervalStep);

    toastTimerRef.current = setTimeout(() => {
      setActiveToast(null);
    }, totalDuration);
  };

  // Combined dispatch for incoming notification
  const dispatchAlert = (item) => {
    triggerChromeDesktopNotification(item);
    showInAppToast(item);
  };

  // 1. Android Native Capacitor Push Notifications (For APK / Installed App)
  useEffect(() => {
    const initCapacitor = async () => {
      try {
        if (typeof window === 'undefined') return;

        let isNative = false;
        try {
          const { Capacitor } = await import('@capacitor/core');
          isNative = Capacitor.isNativePlatform();
        } catch {
          isNative = Boolean(window.Capacitor?.isNativePlatform?.());
        }

        if (isNative) {
          // Let WebView finish boot before FCM register (avoids cold-start crash on some devices)
          await new Promise((r) => setTimeout(r, 1200));
          const { PushNotifications } = await import('@capacitor/push-notifications');

          // Explicitly create MAX-importance channel for Android 8.0+ Lockscreen popup
          try {
            await PushNotifications.createChannel({
              id: 'default',
              name: 'Hood Gaming Alerts',
              description: 'Deposits, game IDs, chat, cashouts & bonuses',
              importance: 5, // 5 = IMPORTANCE_HIGH (Android heads-up + lockscreen banner)
              visibility: 1, // 1 = VISIBILITY_PUBLIC (Displays on Lock Screen)
              sound: 'default',
              vibration: true,
              lights: true,
              lightColor: '#2cb64e',
            });
          } catch (chanErr) {
            console.warn('[PUSH] Channel create notice:', chanErr.message);
          }

          const permStatus = await PushNotifications.requestPermissions();

          if (permStatus.receive === 'granted') {
            await PushNotifications.removeAllListeners().catch(() => {});

            PushNotifications.addListener('registration', async (token) => {
              try {
                const storedDevId = getOrCreateDeviceId();
                if (typeof window !== 'undefined' && token.value) {
                  localStorage.setItem('hood_fcm_device_token', token.value);
                }
                const meRes = await fetch('/api/auth/me?session=player', { credentials: 'include' }).catch(() => null);
                const me = meRes?.ok ? await meRes.json().catch(() => ({})) : {};
                const liveUser = me?.success ? me.user : null;
                await fetch('/api/notifications', {
                  method: 'PUT',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    token: token.value,
                    fcmToken: token.value,
                    device: 'android_apk',
                    deviceId: storedDevId,
                    userId: liveUser?.id || liveUser?._id,
                    email: liveUser?.email,
                    username: liveUser?.username,
                    role: liveUser?.role || 'player',
                  }),
                });
              } catch {}
            });

            PushNotifications.addListener('pushNotificationReceived', (notification) => {
              const notifTarget = notification.data?.target;
              // Filter out staff alerts on player client
              if (notifTarget === 'staff') return;
              const type = notification.data?.type || '';
              const url =
                notification.data?.url || (type === 'chat_message' ? '/chat' : '/');

              dispatchAlert({
                title: notification.title,
                message: notification.body,
                type,
                url,
              });
            });

            PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
              const url = action.notification?.data?.url;
              if (url && url !== '/') {
                router.push(url);
              }
            });

            // Register AFTER listeners are attached so the token event is never missed
            try {
              await PushNotifications.register();
            } catch (regErr) {
              console.warn('[PUSH] register skipped:', regErr?.message || regErr);
            }
          }
        }
      } catch (err) {
        console.warn('Capacitor native push note:', err?.message || err);
      }
    };

    initCapacitor();
  }, [router]);

  // 2. Browser Service Worker & Chrome Permission Setup
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    }

    const subscribeWebAlerts = () => {
      fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ device: 'web_chrome' }),
      }).catch(() => {});
    };

    // Auto-request Chrome permission if not decided
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        subscribeWebAlerts();
      } else if (Notification.permission === 'default') {
        const askPermission = () => {
          Notification.requestPermission()
            .then((perm) => {
              if (perm === 'granted') {
                subscribeWebAlerts();
                triggerChromeDesktopNotification({
                  title: '🔔 Notifications Enabled!',
                  message: 'You will now receive instant alerts for deposits, cashouts, and bonuses.',
                });
              }
            })
            .catch(() => {});
        };

        const timer = setTimeout(askPermission, 3000);
        window.addEventListener('click', askPermission, { once: true });
        return () => {
          clearTimeout(timer);
          window.removeEventListener('click', askPermission);
        };
      }
    }
  }, []);

  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // 3. Poll for incoming broadcast notifications in real time
  useEffect(() => {
    let isCancelled = false;

    const checkIncomingNotifications = async () => {
      if (document.hidden) return; // Save VPS resources when tab inactive
      if (pathnameRef.current && pathnameRef.current.startsWith('/admin')) return; // Never show on admin operations console

      try {
        const activeGuestId = typeof window !== 'undefined' ? (localStorage.getItem('hood_guest_chat_id') || '') : '';
        const storedEmail = typeof window !== 'undefined' ? (localStorage.getItem('hood_user_email') || '') : '';
        const params = new URLSearchParams();
        if (storedEmail) params.set('email', storedEmail);
        else if (activeGuestId) params.set('guestId', activeGuestId);

        const notifUrl = params.toString() ? `/api/notifications?${params.toString()}` : '/api/notifications';
        const res = await fetch(notifUrl, { cache: 'no-store' });
        const data = await res.json();
        if (isCancelled || !data.success || !Array.isArray(data.notifications)) return;

        const notifs = data.notifications;
        if (notifs.length === 0) return;

        const newest = notifs[0];

        // On first run, record the newest ID so we don't spam old historical alerts
        if (isInitialRef.current) {
          lastSeenIdRef.current = newest.id;
          isInitialRef.current = false;
          return;
        }

        // If a new unread notification arrived with a different ID
        if (newest.id && newest.id !== lastSeenIdRef.current && !newest.read) {
          lastSeenIdRef.current = newest.id;
          dispatchAlert(newest);
        }
      } catch {
        // silent fail
      }
    };

    checkIncomingNotifications();
    const interval = setInterval(checkIncomingNotifications, 6000);

    // Event listener for manual test or in-app triggers
    const handleCustomTrigger = (e) => {
      if (pathnameRef.current && pathnameRef.current.startsWith('/admin')) return;
      if (e.detail) dispatchAlert(e.detail);
    };

    window.addEventListener('hood-show-notification', handleCustomTrigger);

    // Global developer / test shortcut
    if (typeof window !== 'undefined') {
      window.triggerTestPush = (customTitle, customMessage) => {
        dispatchAlert({
          title: customTitle || '🎰 VIP Flash Coin Drop Activated!',
          message:
            customMessage ||
            '5.00 SC + 50,000 GC test bonus has been credited to your player account. Enjoy the games!',
          url: '/deposit',
        });
      };
    }

    return () => {
      isCancelled = true;
      clearInterval(interval);
      window.removeEventListener('hood-show-notification', handleCustomTrigger);
    };
  }, []);

  // 4. Auto-bind FCM push token to user account whenever user logs in or switches
  useEffect(() => {
    const handleUserSync = (e) => {
      const liveUser = e.detail;
      if (liveUser && (liveUser.userId || liveUser.email)) {
        try {
          const storedToken = typeof window !== 'undefined' ? localStorage.getItem('hood_fcm_device_token') : null;
          const storedDevId = getOrCreateDeviceId();
          const isNative = Boolean(window.Capacitor?.isNativePlatform?.());
          fetch('/api/notifications', {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: liveUser.userId || liveUser._id || liveUser.id,
              email: liveUser.email,
              username: liveUser.username,
              token: storedToken,
              fcmToken: storedToken,
              device: isNative ? 'android_apk' : 'web_chrome',
              deviceId: storedDevId,
              role: liveUser.role || 'player',
            }),
          }).catch(() => {});
        } catch {}
      }
    };

    window.addEventListener('hood-user-sync', handleUserSync);
    return () => window.removeEventListener('hood-user-sync', handleUserSync);
  }, []);

  if (!activeToast || (pathname && pathname.startsWith('/admin'))) return null;

  const isChatAlert = (item) => {
    if (!item) return false;
    if (item.type === 'chat_message') return true;
    if (item.url === '/chat') return true;
    const title = String(item.title || '').toLowerCase();
    return title.includes('concierge') || title.includes('support') || title.includes('chat reply');
  };

  const handleOpenAction = () => {
    if (!activeToast) return;
    const target = { ...activeToast };
    setActiveToast(null);
    if (isChatAlert(target)) {
      router.push('/chat');
      return;
    }
    if (target.url && target.url !== '/') {
      router.push(target.url);
      return;
    }
    router.push('/');
  };

  return (
    <div
      role="alert"
      tabIndex={0}
      onClick={(e) => {
        if (e.target.closest('button')) return;
        handleOpenAction();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpenAction();
        }
      }}
      className="fixed top-4 right-4 z-[9999] max-w-sm w-full mx-auto p-4 rounded-2xl bg-[#090d1a]/95 backdrop-blur-2xl border border-emerald-400/50 shadow-[0_12px_40px_rgba(44,182,78,0.35)] animate-in slide-in-from-top duration-300 overflow-hidden cursor-pointer"
      style={{
        boxShadow: '0 0 25px rgba(0, 240, 255, 0.25), inset 0 0 15px rgba(0, 240, 255, 0.1)',
      }}
    >
      {/* Top Banner Content */}
      <div className="flex items-start gap-3">
        {/* Glowing Icon */}
        <div className="relative shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-purple-600/20 border border-emerald-400/60 flex items-center justify-center text-emerald-300 shadow-[0_0_12px_rgba(44,182,78,0.4)]">
          {isChatAlert(activeToast) ? (
            <MessageSquare size={18} className="animate-bounce text-emerald-400" />
          ) : (
            <Bell size={18} className="animate-bounce" />
          )}
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </div>

        {/* Message Text */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-500/30">
              ALERT
            </span>
            <span className="text-[10px] text-slate-400">Just now</span>
          </div>

          <h4 className="text-xs font-heading font-black text-white truncate tracking-wide">
            {activeToast.title || '🎰 VIP Flash Coin Drop Activated!'}
          </h4>

          <p className="text-[11px] text-slate-300 mt-0.5 leading-snug line-clamp-2">
            {activeToast.message}
          </p>

          {/* Quick Action Button */}
          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={handleOpenAction}
              className="px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-300 text-black text-[11px] font-heading font-black hover:scale-102 active:scale-98 transition-all flex items-center gap-1 shadow-[0_0_10px_rgba(44,182,78,0.4)]"
            >
              <span>{isChatAlert(activeToast) ? 'OPEN CHAT' : 'CLAIM / VIEW'}</span>
              <ExternalLink size={11} strokeWidth={3} />
            </button>

            <button
              onClick={() => setActiveToast(null)}
              className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={() => setActiveToast(null)}
          className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          title="Close alert"
        >
          <X size={15} />
        </button>
      </div>

      {/* Auto-Dismiss Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/80">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(44,182,78,0.7)]"
          style={{ width: `${toastProgress}%` }}
        />
      </div>
    </div>
  );
}
