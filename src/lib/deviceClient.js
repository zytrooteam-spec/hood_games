'use client';

/**
 * Utility to retrieve or create a persistent unique hardware/device identifier.
 * Stored redundantly across localStorage and long-lived browser cookies.
 */
export function getOrCreateDeviceId() {
  if (typeof window === 'undefined') return '';

  try {
    let deviceId = '';

    // 1. Check localStorage
    try {
      deviceId = localStorage.getItem('v1_device_id') || '';
    } catch {}

    // 2. Check cookie if localStorage was empty
    if (!deviceId && typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|;\s*)v1_device_id=([^;]+)/);
      if (match && match[1]) {
        deviceId = decodeURIComponent(match[1]);
      }
    }

    // 3. Generate a robust unique device identifier if not present
    if (!deviceId || deviceId.trim().length < 8) {
      const rand1 = Math.random().toString(36).substring(2, 10);
      const rand2 = Math.random().toString(36).substring(2, 10);
      const time = Date.now().toString(36);
      deviceId = `dev_${time}_${rand1}_${rand2}`;
    }

    // 4. Redundantly persist across localStorage and 10-year Cookie
    try {
      localStorage.setItem('v1_device_id', deviceId);
    } catch {}

    if (typeof document !== 'undefined') {
      document.cookie = `v1_device_id=${encodeURIComponent(deviceId)}; path=/; max-age=315360000; SameSite=Lax`;
    }

    return deviceId;
  } catch {
    return 'dev_default_client';
  }
}
