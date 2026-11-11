/** Warm Mongo + indexes when the Node server starts (login no longer pays full seed cost). */

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  try {
    const { ensureDbReady } = await import('./lib/initDb');
    await ensureDbReady();
  } catch (err) {
    console.warn('DB warm-up on boot:', err?.message || err);
  }
}
