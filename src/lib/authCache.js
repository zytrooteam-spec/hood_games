import { cache } from '@/lib/cache';

export const AUTH_ME_PREFIX = 'auth_me_';

export function authMeCacheKey(userId) {
  return `${AUTH_ME_PREFIX}${userId}`;
}

export function invalidateAuthCache(userId) {
  if (userId) cache.del(authMeCacheKey(userId));
  else cache.invalidatePrefix(AUTH_ME_PREFIX);
}

export function invalidateGameAccountsCache(email) {
  if (!email) return;
  cache.del(`game_accounts_${String(email).toLowerCase().trim()}`);
}

export function invalidatePaymentMethodsCache() {
  cache.del('hood_payment_methods');
  cache.del('hood_payment_methods_all');
}

export function invalidateAccountRequestsCache() {
  cache.invalidatePrefix('hood_account_requests');
}
