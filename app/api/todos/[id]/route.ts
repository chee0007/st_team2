import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';
import type { Priority, RecurrencePattern } from '@/lib/db';

// ── GET /api/todos/[id] ───────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const todo = todoDB.findById(Number(id), session.userId);
  if (!todo) return NextResponse.json({ error: 'Todo not found' }, { status: 404 });

  return NextResponse.json({ todo });
}

// ── PUT /api/todos/[id] ───────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;

  const existing = todoDB.findById(Number(id), session.userId);
  if (!existing) return NextResponse.json({ error: 'Todo not found' }, { status: 404 });

  // ── Validate known fields ──────────────────────────────────────────────────
  const data: Parameters<typeof todoDB.update>[2] = {};

  if ('title' in body) {
    const t = String(body.title ?? '').trim();
    if (!t) return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
    data.title = t;
  }
  if ('completed' in body)          data.completed          = Boolean(body.completed);
  if ('priority' in body)           data.priority           = body.priority as Priority;
  if ('is_recurring' in body)       data.is_recurring       = Boolean(body.is_recurring);
  if ('recurrence_pattern' in body) data.recurrence_pattern = (body.recurrence_pattern ?? null) as RecurrencePattern | null;

  // due_date and reminder_minutes: changing either resets last_notification_sent
  // so the reminder fires again for the new window.
  const changingDueOrReminder =
    ('due_date' in body || 'reminder_minutes' in body) &&
    !('last_notification_sent' in body);

  if ('due_date' in body) {
    data.due_date = (body.due_date as string | null) ?? null;
  }
  if ('reminder_minutes' in body) {
    data.reminder_minutes = body.reminder_minutes != null ? Number(body.reminder_minutes) : null;
  }
  if ('last_notification_sent' in body) {
    data.last_notification_sent = (body.last_notification_sent as string | null) ?? null;
  }

  if (changingDueOrReminder) {
    data.last_notification_sent = null;
  }

  const updated = todoDB.update(Number(id), session.userId, data);
  return NextResponse.json({ todo: updated });
}

// ── DELETE /api/todos/[id] ────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const existing = todoDB.findById(Number(id), session.userId);
  if (!existing) return NextResponse.json({ error: 'Todo not found' }, { status: 404 });

  todoDB.delete(Number(id), session.userId);
  return new NextResponse(null, { status: 204 });
}
