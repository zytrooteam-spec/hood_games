import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { resolvePlayerDbUser } from '@/lib/resolvePlayerDbUser';

/** Player session + MongoDB user row (APK-safe id/email resolution). */
export async function requirePlayerDbUser(req) {
  const session = await getSessionUser(req, 'player');
  if (!session) {
    return {
      session: null,
      dbUser: null,
      error: 'Please log in to continue.',
      status: 401,
    };
  }
  const db = await getDb();
  const dbUser = await resolvePlayerDbUser(session, db.collection('users'));
  if (!dbUser) {
    return {
      session,
      dbUser: null,
      error: 'Session expired. Please log out and sign in again.',
      status: 401,
    };
  }
  return { session, dbUser, error: null, status: 200 };
}

export function playerIdentity(dbUser, session) {
  return {
    userId: dbUser._id.toString(),
    username: dbUser.username || session?.username || 'player',
    userEmail: (dbUser.email || session?.email || '').toLowerCase().trim(),
  };
}
