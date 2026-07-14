import { type NextRequest, NextResponse } from 'next/server';
import { templateDB, todoDB, subtaskDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getSingaporeNow } from '@/lib/timezone';

interface TemplateSubtask {
  title: string;
  position: number;
}

export async function POST(
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

  // Resolve due date from relative offset — all in Singapore time
  const due_date =
    template.due_date_offset_minutes != null
      ? new Date(
          getSingaporeNow().getTime() + template.due_date_offset_minutes * 60 * 1000,
        ).toISOString()
      : null;

  const todo = todoDB.create({
    user_id: session.userId,
    title: template.title_template,
    priority: template.priority,
    due_date,
    is_recurring: template.is_recurring,
    recurrence_pattern: template.recurrence_pattern ?? undefined,
    reminder_minutes: template.reminder_minutes ?? undefined,
  });

  // Deserialise subtasks — malformed JSON must not fail todo creation
  let subtasks: TemplateSubtask[] = [];
  if (template.subtasks_json) {
    try {
      subtasks = JSON.parse(template.subtasks_json) as TemplateSubtask[];
    } catch {
      subtasks = [];
    }
  }

  // Insert in ascending position order so auto-sequenced positions match the template
  const sorted = [...subtasks].sort((a, b) => a.position - b.position);
  sorted.forEach((s) => subtaskDB.create({ todo_id: todo.id, title: s.title }));

  return NextResponse.json(
    { ...todo, subtasks: subtaskDB.findByTodoId(todo.id) },
    { status: 201 },
  );
}
