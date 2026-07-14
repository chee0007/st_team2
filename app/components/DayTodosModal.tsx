import type { Holiday, Todo } from '@/lib/db';
import { PriorityBadge } from '@/app/components/todo-badges';

function formatDateLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00+08:00`);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Singapore',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(parsed);
}

export function DayTodosModal({
  date,
  todos,
  holiday,
  onClose,
}: {
  date: string;
  todos: Todo[];
  holiday?: Holiday;
  onClose: () => void;
}) {
  return (
    <div
      data-testid="day-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl dark:bg-gray-900">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{formatDateLabel(date)}</h3>
            {holiday && (
              <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Holiday: {holiday.name}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            ✕
          </button>
        </div>

        {todos.length === 0 ? (
          <p className="text-sm text-gray-500">No todos due on this date.</p>
        ) : (
          <ul className="space-y-2">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{todo.title}</p>
                  <PriorityBadge priority={todo.priority} />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {todo.completed ? 'Completed' : 'Pending'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
