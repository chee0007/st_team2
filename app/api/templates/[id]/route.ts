import { type NextRequest, NextResponse } from 'next/server';
import { templateDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import type { Priority, RecurrencePattern } from '@/lib/db';

interface UpdateTemplateBody {
  name?: string;
  description?: string | null;
  category?: string | null;
  title_template?: string;
  priority?: Priority;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  reminder_minutes?: number | null;
  due_date_offset_minutes?: number | null;
  subtasks?: { title: string; position: number }[];
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const template = templateDB.findById(Number(id), session.userId);
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const body: UpdateTemplateBody = await request.json();

  // Validate recurring constraint if being changed
  const willBeRecurring = body.is_recurring ?? template.is_recurring;
  const willHaveOffset =
    body.due_date_offset_minutes !== undefined
      ? body.due_date_offset_minutes
      : template.due_date_offset_minutes;

  if (willBeRecurring && willHaveOffset == null) {
    return NextResponse.json(
      { error: 'Recurring templates require a due_date_offset_minutes value' },
      { status: 400 },
    );
  }

  const subtasks_json =
    body.subtasks !== undefined
      ? body.subtasks.length > 0
        ? JSON.stringify(body.subtasks.map((s) => ({ title: s.title, position: s.position })))
        : null
      : undefined;

  const updated = templateDB.update(Number(id), session.userId, {
    name: body.name?.trim(),
    description: body.description,
    category: body.category,
    title_template: body.title_template?.trim(),
    priority: body.priority,
    is_recurring: body.is_recurring,
    recurrence_pattern: body.recurrence_pattern,
    reminder_minutes: body.reminder_minutes,
    due_date_offset_minutes: body.due_date_offset_minutes,
    ...(subtasks_json !== undefined ? { subtasks_json } : {}),
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const template = templateDB.findById(Number(id), session.userId);
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  templateDB.delete(Number(id), session.userId);
  return new NextResponse(null, { status: 204 });
}
