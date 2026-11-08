import { getSessionUser, isStaffRole } from '@/lib/auth';
import { resolvePlayerDbUser } from '@/lib/resolvePlayerDbUser';
import { getDb } from '@/lib/mongodb';

/** Admin session wins over player cookie (admin desk + dual-tab safe). */
export async function resolveStaffOrPlayer(req) {
  const admin = await getSessionUser(req, 'admin');
  const player = await getSessionUser(req, 'player');
  const isStaff = Boolean(admin && isStaffRole(admin.role));
  if (isStaff) return { user: admin, isStaff: true, dbUser: null };
  if (player) {
    const db = await getDb();
    const dbUser = await resolvePlayerDbUser(player, db.collection('users'));
    return { user: player, isStaff: false, dbUser };
  }
  return { user: null, isStaff: false, dbUser: null };
}
