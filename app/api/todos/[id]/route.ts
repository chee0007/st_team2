import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { type Priority, todoDB } from "@/lib/db";
import { isAtLeastOneMinuteInFuture, parseISODate } from "@/lib/timezone";

const updateTodoSchema = z.object({
  title: z.string().trim().min(1).optional(),
  completed: z.boolean().optional(),
  due_date: z.string().datetime().nullable().optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  is_recurring: z.boolean().optional(),
  recurrence_pattern: z.enum(["daily", "weekly", "monthly", "yearly"]).nullable().optional(),
  reminder_minutes: z.number().int().nullable().optional(),
  last_notification_sent: z.string().nullable().optional(),
});

function parseId(id: string): number | null {
  const value = Number(id);
  if (!Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const todoId = parseId(id);
  if (!todoId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const todo = todoDB.findById(todoId, session.userId);
  if (!todo) {
    return NextResponse.json({ error: "Todo not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: todo });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const todoId = parseId(id);
  if (!todoId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const input = updateTodoSchema.parse(await request.json());

    if (input.due_date) {
      const parsed = parseISODate(input.due_date);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
      }
      if (!isAtLeastOneMinuteInFuture(parsed)) {
        return NextResponse.json(
          { error: "Due date must be at least 1 minute in the future" },
          { status: 400 }
        );
      }
    }

    const todo = todoDB.update(todoId, session.userId, {
      title: input.title?.trim(),
      completed: input.completed,
      due_date: input.due_date,
      priority: input.priority as Priority | undefined,
      is_recurring: input.is_recurring,
      recurrence_pattern: input.recurrence_pattern,
      reminder_minutes: input.reminder_minutes,
      // Re-arm reminder when due_date or reminder_minutes changes (PRP-04).
      // If last_notification_sent is explicitly set in the payload, use that
      // value as-is (the notification hook stamps it after firing).
      last_notification_sent:
        input.last_notification_sent !== undefined
          ? input.last_notification_sent
          : (input.due_date !== undefined || input.reminder_minutes !== undefined)
            ? null
            : undefined,
    });

    if (!todo) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: todo });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const todoId = parseId(id);
  if (!todoId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const existing = todoDB.findById(todoId, session.userId);
  if (!existing) {
    return NextResponse.json({ error: "Todo not found" }, { status: 404 });
  }

  todoDB.delete(todoId, session.userId);

  return NextResponse.json({ success: true });
}
