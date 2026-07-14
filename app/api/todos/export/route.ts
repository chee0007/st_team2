import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSingaporeDateString, getSingaporeNow } from '@/lib/timezone';
import { todoDB, type Todo, type TodoExportItem } from '@/lib/db';

type TodoExport = {
  version: 1;
  exported_at: string;
  todos: TodoExportItem[];
};

function toExportItem(todo: Todo): TodoExportItem {
  return {
    title: todo.title,
    completed: todo.completed,
    due_date: todo.due_date,
    priority: todo.priority,
    is_recurring: todo.is_recurring,
    recurrence_pattern: todo.recurrence_pattern,
    reminder_minutes: todo.reminder_minutes,
    created_at: todo.created_at,
    subtasks: (todo.subtasks ?? []).map((subtask) => ({
      title: subtask.title,
      completed: subtask.completed,
      position: subtask.position,
    })),
    tags: (todo.tags ?? []).map((tag) => ({
      name: tag.name,
      color: tag.color,
    })),
  };
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(todos: Todo[]): string {
  const header = 'ID,Title,Completed,Due Date,Priority,Recurring,Pattern,Reminder';
  const lines = todos.map((todo) => {
    const row = [
      String(todo.id),
      todo.title,
      todo.completed ? 'true' : 'false',
      todo.due_date ?? '',
      todo.priority,
      todo.is_recurring ? 'true' : 'false',
      todo.recurrence_pattern ?? '',
      todo.reminder_minutes != null ? String(todo.reminder_minutes) : '',
    ];

    return row.map(escapeCsv).join(',');
  });

  return [header, ...lines].join('\n');
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const format = request.nextUrl.searchParams.get('format') ?? 'json';
  if (format !== 'json' && format !== 'csv') {
    return NextResponse.json({ error: 'Invalid export format' }, { status: 400 });
  }

  const todos = todoDB.findAllWithRelations(session.userId);
  const dateStr = getSingaporeDateString(getSingaporeNow());

  if (format === 'csv') {
    const csv = toCsv(todos);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="todos-${dateStr}.csv"`,
      },
    });
  }

  const payload: TodoExport = {
    version: 1,
    exported_at: getSingaporeNow().toISOString(),
    todos: todos.map(toExportItem),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="todos-${dateStr}.json"`,
    },
  });
}
