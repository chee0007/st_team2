import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';

/**
 * GET /api/notifications/check
 *
 * Returns todos for the authenticated user whose reminder window has opened
 * but that have not yet been notified (last_notification_sent IS NULL).
 *
 * All time comparisons are Singapore-local (UTC+8) so client clock drift
 * cannot cause early/late firing — the server is the timing authority.
 *
 * Capped to windows that opened within the past 24 h to prevent flooding
 * after a long-closed tab re-opens.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const data = todoDB.findDueReminders(session.userId);
  return NextResponse.json({ success: true, data });
}
