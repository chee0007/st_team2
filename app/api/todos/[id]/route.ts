import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, subtaskDB, tagDB } from '@/lib/db';
import { getSingaporeNow } from '@/lib/timezone';
import type { Priority, RecurrencePattern } from '@/lib/db';

function calculateNextDueDate(current: string, pattern: RecurrencePattern): string {
  const d = new Date(current);
  switch (pattern) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly': {
      const day = d.getDate();
      d.setMonth(d.getMonth() + 1);
      // Clamp to last day of new month
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, lastDay));
      break;
    }
    case 'yearly': {
      const day = d.getDate();
      const month = d.getMonth();
      d.setFullYear(d.getFullYear() + 1);
      // Feb 29 → Feb 28 on non-leap year
      const lastDay = new Date(d.getFullYear(), month + 1, 0).getDate();
      d.setDate(Math.min(day, lastDay));
      break;
    }
  }
  return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const todo = todoDB.findById(Number(id), session.userId);
  if (!todo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    ...todo,
    subtasks: subtaskDB.findByTodoId(todo.id),
    tags: tagDB.findByTodoId(todo.id),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const todo = todoDB.findById(Number(id), session.userId);
  if (!todo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Handle recurring completion: create next instance before marking done
  if (body.completed === true && todo.is_recurring && todo.recurrence_pattern && todo.due_date) {
    const nextDueDate = calculateNextDueDate(todo.due_date, todo.recurrence_pattern);
    const nextTodo = todoDB.create({
      user_id: session.userId,
      title: todo.title,
      due_date: nextDueDate,
      priority: todo.priority as Priority,
      is_recurring: true,
      recurrence_pattern: todo.recurrence_pattern as RecurrencePattern,
      reminder_minutes: todo.reminder_minutes ?? null,
    });
    // Copy tags
    const currentTags = tagDB.findByTodoId(todo.id);
    for (const tag of currentTags) {
      tagDB.attachToTodo(nextTodo.id, tag.id);
    }
  }

  const updated = todoDB.update(Number(id), session.userId, {
    title: body.title?.trim() ?? todo.title,
    completed: body.completed ?? todo.completed,
    due_date: 'due_date' in body ? (body.due_date ?? null) : todo.due_date,
    priority: body.priority ?? todo.priority,
    is_recurring: body.is_recurring ?? todo.is_recurring,
    recurrence_pattern: body.recurrence_pattern ?? todo.recurrence_pattern,
    reminder_minutes: 'reminder_minutes' in body ? (body.reminder_minutes ?? null) : todo.reminder_minutes,
  });

  // Update tags if provided
  if (Array.isArray(body.tag_ids)) {
    const currentTags = tagDB.findByTodoId(Number(id));
    for (const tag of currentTags) {
      tagDB.detachFromTodo(Number(id), tag.id);
    }
    for (const tagId of body.tag_ids) {
      tagDB.attachToTodo(Number(id), tagId);
    }
  }

  return NextResponse.json({
    ...updated,
    subtasks: subtaskDB.findByTodoId(Number(id)),
    tags: tagDB.findByTodoId(Number(id)),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const todo = todoDB.findById(Number(id), session.userId);
  if (!todo) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  todoDB.delete(Number(id), session.userId);
  return NextResponse.json({ success: true });
}
