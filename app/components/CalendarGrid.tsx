import type { Holiday, Todo } from '@/lib/db';
import { generateCalendarGrid, nextMonth, prevMonth } from '@/lib/calendar';
import { CalendarCell } from '@/app/components/CalendarCell';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Singapore',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function CalendarGrid({
  year,
  month,
  todosByDate,
  holidaysByDate,
  onSelectDay,
  onNavigate,
  onToday,
}: {
  year: number;
  month: number;
  todosByDate: Map<string, Todo[]>;
  holidaysByDate: Map<string, Holiday>;
  onSelectDay: (date: string) => void;
  onNavigate: (nextYear: number, nextMonth: number) => void;
  onToday: () => void;
}) {
  const days = generateCalendarGrid(year, month);
  const prev = prevMonth(year, month);
  const next = nextMonth(year, month);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900 md:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          data-testid="prev-month-btn"
          onClick={() => onNavigate(prev.year, prev.month)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
        >
          ◀
        </button>

        <h2 data-testid="calendar-month-label" className="text-lg font-semibold">
          {monthLabel(year, month)}
        </h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="today-btn"
            onClick={onToday}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            Today
          </button>
          <button
            type="button"
            data-testid="next-month-btn"
            onClick={() => onNavigate(next.year, next.month)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            ▶
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="rounded bg-gray-100 py-1 text-center text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <CalendarCell
            key={day.date}
            day={day}
            todos={todosByDate.get(day.date) ?? []}
            holiday={holidaysByDate.get(day.date)}
            onSelect={onSelectDay}
          />
        ))}
      </div>
    </section>
  );
}
