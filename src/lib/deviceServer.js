/**
 * Server-side helper to extract or generate a persistent device ID from Next.js requests.
 */
export function getDeviceIdFromRequest(req, explicitBodyId = null) {
  // 1. Direct explicit ID in JSON body
  if (explicitBodyId && typeof explicitBodyId === 'string' && explicitBodyId.trim().length >= 6) {
    return explicitBodyId.trim();
  }

  // 2. Custom header
  try {
    const headerId = req.headers?.get?.('x-device-id');
    if (headerId && headerId.trim().length >= 6) {
      return headerId.trim();
    }
  } catch {}

  // 3. Cookie v1_device_id
  try {
    if (req.cookies?.get) {
      const cookieVal = req.cookies.get('v1_device_id')?.value;
      if (cookieVal && cookieVal.trim().length >= 6) {
        return cookieVal.trim();
      }
    }
  } catch {}

  // 4. Fallback: generate a unique ID
  const rand1 = Math.random().toString(36).substring(2, 10);
  const rand2 = Math.random().toString(36).substring(2, 10);
  return `dev_${Date.now().toString(36)}_${rand1}_${rand2}`;
}
