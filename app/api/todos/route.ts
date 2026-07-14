import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';
import type { Priority } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const todos = todoDB.findByUserId(session.userId);
  return NextResponse.json({ todos });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const priority: Priority = ['high', 'medium', 'low'].includes(body.priority)
    ? (body.priority as Priority)
    : 'medium';

  const todo = todoDB.create({
    user_id: session.userId,
    title,
    due_date: typeof body.due_date === 'string' ? body.due_date : null,
    priority,
    is_recurring: Boolean(body.is_recurring),
    recurrence_pattern: body.recurrence_pattern ?? null,
    reminder_minutes: typeof body.reminder_minutes === 'number' ? body.reminder_minutes : null,
  });

  return NextResponse.json({ todo }, { status: 201 });
}
