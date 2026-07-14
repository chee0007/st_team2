import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { type Priority, type RecurrencePattern, todoDB } from "@/lib/db";
import { isAtLeastOneMinuteInFuture, parseISODate } from "@/lib/timezone";

const prioritySchema = z.enum(["high", "medium", "low"]);

function isPriority(value: unknown): value is Priority {
  return value === "high" || value === "medium" || value === "low";
}

function validateCreatePriority(value: unknown): Priority {
  if (value === undefined || value === null) {
    return "medium";
  }
  if (isPriority(value)) {
    return value;
  }
  throw new Error(
    `Invalid priority: ${String(value)}. Must be 'high', 'medium', or 'low'.`
  );
}

const createTodoSchema = z.object({
  title: z.string().trim().min(1),
  due_date: z.string().datetime().nullable().optional(),
  priority: z.unknown().optional(),
  is_recurring: z.boolean().optional(),
  recurrence_pattern: z.enum(["daily", "weekly", "monthly", "yearly"]).nullable().optional(),
});

export async function GET(request: Request): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const priorityParam = new URL(request.url).searchParams.get("priority");
  if (priorityParam && !prioritySchema.safeParse(priorityParam).success) {
    return NextResponse.json(
      {
        error: `Invalid priority: ${priorityParam}. Must be 'high', 'medium', or 'low'.`,
      },
      { status: 400 }
    );
  }

  const todos = todoDB
    .findAllByUser(session.userId)
    .filter((todo) => (priorityParam ? todo.priority === priorityParam : true));
  return NextResponse.json({ success: true, data: todos });
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const parsed = createTodoSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const input = parsed.data;
    const title = input.title.trim();
    const dueDate = input.due_date ?? null;
    let priority: Priority;

    try {
      priority = validateCreatePriority(input.priority);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid priority" },
        { status: 400 }
      );
    }

    if (dueDate) {
      const parsed = parseISODate(dueDate);
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

    const isRecurring = input.is_recurring ?? false;
    const recurrencePattern = input.recurrence_pattern ?? null;

    if (isRecurring && !dueDate) {
      return NextResponse.json(
        { error: "Recurring todos require a due date" },
        { status: 400 }
      );
    }

    if (isRecurring && !recurrencePattern) {
      return NextResponse.json(
        { error: "Recurring todos require a recurrence pattern" },
        { status: 400 }
      );
    }

    const todo = todoDB.create({
      user_id: session.userId,
      title,
      due_date: dueDate,
      priority,
      is_recurring: isRecurring,
      recurrence_pattern: recurrencePattern,
    });

    return NextResponse.json({ success: true, data: todo }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
