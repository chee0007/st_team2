import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { type Priority, todoDB } from "@/lib/db";
import { isAtLeastOneMinuteInFuture, parseISODate } from "@/lib/timezone";

function isPriority(value: unknown): value is Priority {
  return value === "high" || value === "medium" || value === "low";
}

function validateUpdatePriority(value: unknown): Priority | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (isPriority(value)) {
    return value;
  }
  throw new Error(
    `Invalid priority: ${String(value)}. Must be 'high', 'medium', or 'low'.`
  );
}

const updateTodoSchema = z.object({
  title: z.string().trim().min(1).optional(),
  completed: z.boolean().optional(),
  due_date: z.string().datetime().nullable().optional(),
  priority: z.unknown().optional(),
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
    const parsed = updateTodoSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const input = parsed.data;
    let priority: Priority | undefined;

    try {
      priority = validateUpdatePriority(input.priority);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid priority" },
        { status: 400 }
      );
    }

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
      priority,
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
