import { ROLES } from '@/lib/auth';

/**
 * Find a player whose account is tied to this device (not staff/admin).
 */
export async function findPlayerBoundToDevice(usersCol, deviceId, excludeUserId = null) {
  if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length < 6) {
    return null;
  }
  const id = deviceId.trim();
  const query = {
    $and: [
      { $or: [{ role: ROLES.PLAYER }, { role: { $exists: false } }, { role: null }] },
      { $or: [{ deviceId: id }, { boundDevices: id }, { lastLoginDevice: id }] },
    ],
  };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  return usersCol.findOne(query, {
    projection: { email: 1, username: 1, deviceId: 1, boundDevices: 1 },
  });
}

export function deviceBindingErrorPayload(boundUser) {
  const email = boundUser?.email || 'another account';
  const username = boundUser?.username || '';
  const who = username ? `${username} (${email})` : email;
  return {
    success: false,
    deviceBound: true,
    linkedEmail: email,
    linkedUsername: username || null,
    error: `This device is already linked to ${who}. Only one account per device. Ask admin to unbind the device if you need to switch accounts.`,
  };
}

export function deviceBindingUpdateFields(deviceId) {
  if (!deviceId) return null;
  return {
    deviceId,
    lastLoginDevice: deviceId,
    updatedAt: new Date(),
  };
}
