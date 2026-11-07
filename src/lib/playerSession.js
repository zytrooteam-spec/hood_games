const STAFF_ROLES = new Set([
  'admin',
  'superadmin',
  'staff',
  'coin_manager',
  'financial_manager',
  'support_admin',
]);

/** Player shell must never treat staff JWT as a logged-in player (dual admin tab). */
export function normalizePlayerUser(user) {
  if (!user) return null;
  const role = String(user.role || 'player').toLowerCase();
  if (STAFF_ROLES.has(role)) return null;
  return user;
}
