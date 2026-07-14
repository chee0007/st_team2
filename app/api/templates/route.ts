import { type NextRequest, NextResponse } from 'next/server';
import { templateDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import type { Priority, RecurrencePattern } from '@/lib/db';

interface CreateTemplateBody {
  name: string;
  description?: string;
  category?: string;
  title_template: string;
  priority?: Priority;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
  reminder_minutes?: number;
  due_date_offset_minutes?: number;
  subtasks?: { title: string; position: number }[];
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const templates = templateDB.findAllByUser(session.userId);
  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body: CreateTemplateBody = await request.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!body.title_template?.trim()) {
    return NextResponse.json({ error: 'Title template is required' }, { status: 400 });
  }

  // Recurring templates must have a due-date offset — enforced at save-time per PRP edge case.
  if (body.is_recurring && body.due_date_offset_minutes == null) {
    return NextResponse.json(
      { error: 'Recurring templates require a due_date_offset_minutes value' },
      { status: 400 },
    );
  }

  const subtasks_json =
    body.subtasks && body.subtasks.length > 0
      ? JSON.stringify(body.subtasks.map((s) => ({ title: s.title, position: s.position })))
      : null;

  const template = templateDB.create({
    user_id: session.userId,
    name: body.name.trim(),
    description: body.description ?? null,
    category: body.category ?? null,
    title_template: body.title_template.trim(),
    priority: body.priority ?? 'medium',
    is_recurring: body.is_recurring ?? false,
    recurrence_pattern: body.recurrence_pattern ?? null,
    reminder_minutes: body.reminder_minutes ?? null,
    due_date_offset_minutes: body.due_date_offset_minutes ?? null,
    subtasks_json,
  });

  return NextResponse.json(template, { status: 201 });
}
