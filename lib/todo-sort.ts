export type Priority = "high" | "medium" | "low";

export type SortableTodo = {
  id: number;
  title: string;
  completed: boolean;
  due_date: string | null;
  priority: Priority;
  created_at: string;
  updated_at: string | null;
};

const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function sortTodos(todos: SortableTodo[]): SortableTodo[] {
  return [...todos].sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
    if (aDue !== bDue) {
      return aDue - bDue;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function sectionTodos(todos: SortableTodo[], now: Date): {
  overdue: SortableTodo[];
  pending: SortableTodo[];
  completed: SortableTodo[];
} {
  const nowMs = now.getTime();

  const incomplete = todos.filter((todo) => !todo.completed);
  const overdue = sortTodos(
    incomplete.filter((todo) => todo.due_date && new Date(todo.due_date).getTime() < nowMs)
  );
  const pending = sortTodos(
    incomplete.filter((todo) => !todo.due_date || new Date(todo.due_date).getTime() >= nowMs)
  );

  const completed = todos
    .filter((todo) => todo.completed)
    .sort(
      (a, b) =>
        new Date(b.updated_at ?? b.created_at).getTime() -
        new Date(a.updated_at ?? a.created_at).getTime()
    );

  return { overdue, pending, completed };
}
