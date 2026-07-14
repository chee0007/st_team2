import test from "node:test";
import assert from "node:assert/strict";
import { sectionTodos, sortTodos, type SortableTodo } from "./todo-sort";

function todo(input: Partial<SortableTodo> & Pick<SortableTodo, "id" | "title">): SortableTodo {
  return {
    id: input.id,
    title: input.title,
    completed: input.completed ?? false,
    due_date: input.due_date ?? null,
    priority: input.priority ?? "medium",
    created_at: input.created_at ?? "2026-01-01T00:00:00.000Z",
    updated_at: input.updated_at ?? null,
  };
}

test("sortTodos orders by priority, then due date, then newest created_at", () => {
  const todos = [
    todo({ id: 1, title: "medium-late", priority: "medium", due_date: "2026-01-05T01:00:00.000Z" }),
    todo({ id: 2, title: "high-no-date", priority: "high", due_date: null, created_at: "2026-01-01T02:00:00.000Z" }),
    todo({ id: 3, title: "high-early", priority: "high", due_date: "2026-01-03T01:00:00.000Z" }),
    todo({ id: 4, title: "high-early-newer", priority: "high", due_date: "2026-01-03T01:00:00.000Z", created_at: "2026-01-01T03:00:00.000Z" }),
  ];

  const orderedIds = sortTodos(todos).map((item) => item.id);
  assert.deepEqual(orderedIds, [4, 3, 2, 1]);
});

test("sectionTodos places exact due-date boundary in pending", () => {
  const now = new Date("2026-01-10T12:00:00.000Z");
  const items: SortableTodo[] = [
    todo({ id: 1, title: "overdue", due_date: "2026-01-10T11:59:59.000Z" }),
    todo({ id: 2, title: "boundary-pending", due_date: "2026-01-10T12:00:00.000Z" }),
    todo({ id: 3, title: "no-date-pending", due_date: null }),
    todo({ id: 4, title: "completed", completed: true, updated_at: "2026-01-10T11:00:00.000Z" }),
  ];

  const sections = sectionTodos(items, now);
  assert.deepEqual(sections.overdue.map((item) => item.id), [1]);
  assert.deepEqual(sections.pending.map((item) => item.id), [2, 3]);
  assert.deepEqual(sections.completed.map((item) => item.id), [4]);
});
