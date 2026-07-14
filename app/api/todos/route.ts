import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { tagDB, type Priority, todoDB } from "@/lib/db";
import { isAtLeastOneMinuteInFuture, parseISODate } from "@/lib/timezone";

const prioritySchema = z.enum(["high", "medium", "low"]);

const createTodoSchema = z.object({
  title: z.string().trim().min(1),
  due_date: z.string().datetime().nullable().optional(),
  priority: prioritySchema.optional(),
});

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const todos = todoDB.findAllByUser(session.userId);
  const tagMap = tagDB.findByTodoIds(todos.map((todo) => todo.id));
  const withTags = todos.map((todo) => ({
    ...todo,
    tags: tagMap.get(todo.id) ?? [],
  }));
  return NextResponse.json({ success: true, data: withTags });
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const input = createTodoSchema.parse(await request.json());
    const title = input.title.trim();
    const dueDate = input.due_date ?? null;

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

    const todo = todoDB.create({
      user_id: session.userId,
      title,
      due_date: dueDate,
      priority: (input.priority ?? "medium") as Priority,
    });

    return NextResponse.json(
      { success: true, data: { ...todo, tags: [] } },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
