import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, subtaskDB, tagDB } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const todos = todoDB.findAllByUser(session.userId);
  const enriched = todos.map((todo) => ({
    ...todo,
    subtasks: subtaskDB.findByTodoId(todo.id),
    tags: tagDB.findByTodoId(todo.id),
  }));
  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const todo = todoDB.create({
    user_id: session.userId,
    title,
    due_date: body.due_date ?? null,
    priority: body.priority ?? 'medium',
    is_recurring: body.is_recurring ?? false,
    recurrence_pattern: body.recurrence_pattern ?? null,
    reminder_minutes: body.reminder_minutes ?? null,
  });

  // Attach tags if provided
  if (Array.isArray(body.tag_ids)) {
    for (const tagId of body.tag_ids) {
      tagDB.attachToTodo(todo.id, tagId);
    }
  }

  return NextResponse.json({
    ...todo,
    subtasks: [],
    tags: tagDB.findByTodoId(todo.id),
  }, { status: 201 });
}
