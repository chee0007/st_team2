'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { generateCalendarGrid, prevMonth, nextMonth, type CalendarDay } from '@/lib/calendar';
import type { Holiday, Todo } from '@/lib/db';

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseMonthParam(raw: string | null): { year: number; month: number } {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split('-').map(Number);
    if (m >= 1 && m <= 12) return { year: y, month: m };
  }
  // Fallback: current Singapore month
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function sgNow(): { year: number; month: number } {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

// ── Priority pill styles ───────────────────────────────────────────────────────

const PILL_CLASS: Record<string, string> = {
  high:   'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/60 dark:text-yellow-300',
  low:    'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300',
};

// ── DayTodosModal ─────────────────────────────────────────────────────────────

function DayTodosModal({
  date,
  todos,
  holiday,
  onClose,
}: {
  date: string;
  todos: Todo[];
  holiday: Holiday | undefined;
  onClose: () => void;
}) {
  const label = new Date(date + 'T00:00:00').toLocaleDateString('en-SG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Singapore',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        data-testid="day-modal"
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4 gap-2">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-snug">
            {label}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none shrink-0"
          >
            ✕
          </button>
        </div>

        {holiday && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-sm font-medium">
            🎉 {holiday.name}
          </div>
        )}

        {todos.length === 0 && !holiday ? (
          <p className="text-gray-400 text-sm">No todos due on this day.</p>
        ) : (
          <ul className="space-y-2">
            {todos.map(todo => (
              <li
                key={todo.id}
                className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span
                  className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${PILL_CLASS[todo.priority]}`}
                >
                  {todo.priority}
                </span>
                <span
                  className={`text-sm ${
                    todo.completed
                      ? 'line-through text-gray-400'
                      : 'text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {todo.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── CalendarCell ──────────────────────────────────────────────────────────────

const MAX_VISIBLE = 3;

function CalendarCell({
  day,
  todos,
  holiday,
  onClick,
}: {
  day: CalendarDay;
  todos: Todo[];
  holiday: Holiday | undefined;
  onClick: (date: string) => void;
}) {
  const visible  = todos.slice(0, MAX_VISIBLE);
  const overflow = todos.length - visible.length;
  const dayNum   = Number(day.date.split('-')[2]);

  const cellBase =
    'relative min-h-[90px] p-1 text-left cursor-pointer transition-colors ' +
    'border-r border-b border-gray-200 dark:border-gray-700 ' +
    'hover:bg-gray-50 dark:hover:bg-gray-700/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400';

  const dimmed   = !day.isCurrentMonth ? 'opacity-40' : '';
  const todayCls = day.isToday ? 'bg-blue-50 dark:bg-blue-900/20' : '';
  const wkndCls  = day.isWeekend && !day.isToday ? 'bg-gray-50/60 dark:bg-gray-800/30' : '';

  return (
    <button
      data-testid="calendar-cell"
      data-date={day.date}
      className={`${cellBase} ${dimmed} ${todayCls} ${wkndCls}`}
      onClick={() => onClick(day.date)}
    >
      {/* Day number */}
      <span
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mb-0.5
          ${day.isToday
            ? 'bg-blue-500 text-white'
            : day.isPast && day.isCurrentMonth
            ? 'text-gray-400 dark:text-gray-500'
            : 'text-gray-700 dark:text-gray-300'
          }`}
      >
        {dayNum}
      </span>

      {/* Holiday label */}
      {holiday && (
        <div className="mb-0.5 px-1 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[9px] leading-tight truncate font-medium">
          {holiday.name}
        </div>
      )}

      {/* Todo pills */}
      {visible.map(t => (
        <div
          key={t.id}
          className={`mb-0.5 px-1 py-0.5 rounded text-[9px] leading-tight truncate ${PILL_CLASS[t.priority]}`}
        >
          {t.title}
        </div>
      ))}

      {/* Overflow badge */}
      {overflow > 0 && (
        <div className="px-1 text-[9px] text-gray-500 dark:text-gray-400 font-medium">
          +{overflow} more
        </div>
      )}
    </button>
  );
}

// ── Day-of-week header ────────────────────────────────────────────────────────

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Calendar content (needs Suspense for useSearchParams) ─────────────────────

function CalendarContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { year, month } = parseMonthParam(searchParams.get('month'));

  const [todos, setTodos]       = useState<Todo[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/todos').then(r => r.json()),
      fetch(`/api/holidays?year=${year}&month=${month}`).then(r => r.json()),
    ])
      .then(([td, hd]) => {
        setTodos(td.todos ?? []);
        setHolidays(hd.holidays ?? []);
      })
      .catch(() => {
        setTodos([]);
        setHolidays([]);
      })
      .finally(() => setLoading(false));
  }, [year, month]);

  const grid = generateCalendarGrid(year, month);

  const todosFor   = (d: string) => todos.filter(t => t.due_date?.startsWith(d));
  const holidayFor = (d: string) => holidays.find(h => h.date === d);

  function go(y: number, m: number) {
    router.push(`/calendar?month=${y}-${String(m).padStart(2, '0')}`);
  }

  const prev    = prevMonth(year, month);
  const next    = nextMonth(year, month);
  const current = sgNow();

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">

        {/* ── Navigation header ── */}
        <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              ← List
            </a>
            <h1
              data-testid="calendar-month-label"
              className="text-xl font-bold text-gray-900 dark:text-white"
            >
              {monthLabel}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              data-testid="prev-month-btn"
              onClick={() => go(prev.year, prev.month)}
              aria-label="Previous month"
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600
                         text-gray-700 dark:text-gray-300 text-sm font-medium
                         hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              ◀
            </button>
            <button
              data-testid="today-btn"
              onClick={() => go(current.year, current.month)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600
                         text-gray-700 dark:text-gray-300 text-sm font-medium
                         hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Today
            </button>
            <button
              data-testid="next-month-btn"
              onClick={() => go(next.year, next.month)}
              aria-label="Next month"
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600
                         text-gray-700 dark:text-gray-300 text-sm font-medium
                         hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              ▶
            </button>
          </div>
        </div>

        {/* ── Calendar grid ── */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
            Loading calendar…
          </div>
        ) : (
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              {DOW.map(d => (
                <div
                  key={d}
                  className="py-2 text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* 6 × 7 cells */}
            <div className="grid grid-cols-7">
              {grid.map(day => (
                <CalendarCell
                  key={day.date}
                  day={day}
                  todos={todosFor(day.date)}
                  holiday={holidayFor(day.date)}
                  onClick={setSelectedDate}
                />
              ))}
            </div>
          </div>
        )}

        {/* Priority legend */}
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-red-400" /> High
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-yellow-400" /> Medium
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-blue-400" /> Low
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-purple-300" /> Holiday
          </span>
        </div>
      </div>

      {/* ── Day modal ── */}
      {selectedDate && (
        <DayTodosModal
          date={selectedDate}
          todos={todosFor(selectedDate)}
          holiday={holidayFor(selectedDate)}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
          Loading…
        </div>
      }
    >
      <CalendarContent />
    </Suspense>
  );
}
