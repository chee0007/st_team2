import type { Holiday, Todo } from '@/lib/db';
import type { CalendarDay } from '@/lib/calendar';

const MAX_VISIBLE_TODOS = 3;

function priorityPillClass(priority: Todo['priority']): string {
  if (priority === 'high') {
    return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
  }
  if (priority === 'medium') {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
  }
  return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
}

function cellClass(day: CalendarDay): string {
  const classes = [
    'h-28 w-full rounded-lg border p-1.5 text-left transition-colors md:h-32',
    'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700/70',
  ];

  if (!day.isCurrentMonth) {
    classes.push('opacity-45');
  }
  if (day.isWeekend) {
    classes.push('bg-slate-50 dark:bg-slate-900/50');
  }
  if (day.isPast && day.isCurrentMonth && !day.isToday) {
    classes.push('text-gray-500 dark:text-gray-400');
  }
  if (day.isToday) {
    classes.push('ring-2 ring-blue-500');
  }

  return classes.join(' ');
}

export function CalendarCell({
  day,
  todos,
  holiday,
  onSelect,
}: {
  day: CalendarDay;
  todos: Todo[];
  holiday?: Holiday;
  onSelect: (date: string) => void;
}) {
  const visible = todos.slice(0, MAX_VISIBLE_TODOS);
  const overflow = todos.length - visible.length;

  return (
    <button
      type="button"
      data-testid="calendar-cell"
      data-date={day.date}
      onClick={() => onSelect(day.date)}
      className={cellClass(day)}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold">{day.date.slice(8, 10)}</span>
      </div>

      {holiday && (
        <div className="mb-1 truncate rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
          {holiday.name}
        </div>
      )}

      <div className="space-y-1">
        {visible.map((todo) => (
          <div
            key={todo.id}
            className={`truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${priorityPillClass(todo.priority)}`}
            title={todo.title}
          >
            {todo.title}
          </div>
        ))}
        {overflow > 0 && (
          <div className="text-[11px] font-medium text-gray-500 dark:text-gray-300">
            +{overflow} more
          </div>
        )}
      </div>
    </button>
  );
}
