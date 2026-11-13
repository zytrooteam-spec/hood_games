import {
  getRealtimeHub,
  staffChannel,
  playerEmailChannel,
  playerIdChannel,
  guestChannel,
  playerBroadcastChannel,
} from '@/lib/realtimeHub';
import { getSessionUser, isStaffRole } from '@/lib/auth';
import { ensureDbReady } from '@/lib/initDb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function safeGuestId(raw) {
  const id = String(raw || '').trim();
  if (!id || id.length > 120) return null;
  if (!/^guest_[a-z0-9_]+$/i.test(id)) return null;
  return id;
}

export async function GET(req) {
  await ensureDbReady();
  const { searchParams } = new URL(req.url);
  const guestParam = safeGuestId(searchParams.get('guestId'));

  const adminSession = await getSessionUser(req, 'admin');
  const playerSession = await getSessionUser(req, 'player');

  const channels = [];

  if (adminSession && isStaffRole(adminSession.role)) {
    channels.push(staffChannel());
  }

  if (playerSession?.email) {
    const emailCh = playerEmailChannel(playerSession.email);
    if (emailCh) channels.push(emailCh);
    channels.push(playerBroadcastChannel());
  }
  const playerUid = playerSession?.userId || playerSession?.id;
  if (playerUid) {
    const idCh = playerIdChannel(String(playerUid));
    if (idCh) channels.push(idCh);
  }

  if (guestParam) {
    const gCh = guestChannel(guestParam);
    if (gCh) channels.push(gCh);
  }

  if (channels.length === 0) {
    return new Response('Unauthorized — sign in or pass guestId', { status: 401 });
  }

  const uniqueChannels = [...new Set(channels)];
  const encoder = new TextEncoder();
  const hub = getRealtimeHub();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          /* stream closed */
        }
      };

      send({ type: 'CONNECTED', channels: uniqueChannels, t: Date.now() });

      const unsubscribe = hub.subscribe(uniqueChannels, send);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 20000);

      const onAbort = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      };

      if (req.signal.aborted) {
        onAbort();
        return;
      }
      req.signal.addEventListener('abort', onAbort, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
