'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Holiday, Todo } from '@/lib/db';
import { getSingaporeDateString, getSingaporeNow, parseISODate } from '@/lib/timezone';
import { CalendarGrid } from '@/app/components/CalendarGrid';
import { DayTodosModal } from '@/app/components/DayTodosModal';

function getCurrentSingaporeMonth(): { year: number; month: number } {
  const now = getSingaporeNow();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);

  const year = Number(parts.find((p) => p.type === 'year')?.value ?? now.getFullYear());
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? now.getMonth() + 1);
  return { year, month };
}

function parseMonthParam(raw: string | null): { year: number; month: number } {
  const current = getCurrentSingaporeMonth();
  if (!raw || !/^\d{4}-\d{2}$/.test(raw)) return current;

  const [y, m] = raw.split('-').map(Number);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    return current;
  }
  return { year: y, month: m };
}

function toMonthParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function toSingaporeDateOnly(iso: string | null): string | null {
  if (!iso) return null;
  const parsed = parseISODate(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return getSingaporeDateString(parsed);
}

export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { year, month } = useMemo(
    () => parseMonthParam(searchParams.get('month')),
    [searchParams],
  );

  const [todos, setTodos] = useState<Todo[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      const [todosRes, holidaysRes] = await Promise.all([
        fetch('/api/todos'),
        fetch(`/api/holidays?year=${year}&month=${String(month).padStart(2, '0')}`),
      ]);

      if (todosRes.ok) {
        const payload = (await todosRes.json()) as { data?: Todo[]; todos?: Todo[] };
        setTodos(payload.data ?? payload.todos ?? []);
      }

      if (holidaysRes.ok) {
        const payload = (await holidaysRes.json()) as { holidays?: Holiday[] };
        setHolidays(payload.holidays ?? []);
      }
    }

    void load();
  }, [year, month]);

  const todosByDate = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const todo of todos) {
      const dateOnly = toSingaporeDateOnly(todo.due_date);
      if (!dateOnly) continue;
      const existing = map.get(dateOnly) ?? [];
      map.set(dateOnly, [...existing, todo]);
    }
    return map;
  }, [todos]);

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, Holiday>();
    for (const holiday of holidays) {
      map.set(holiday.date, holiday);
    }
    return map;
  }, [holidays]);

  function navigate(nextYear: number, nextMonth: number): void {
    router.replace(`/calendar?month=${toMonthParam(nextYear, nextMonth)}`);
  }

  function goToToday(): void {
    const current = getCurrentSingaporeMonth();
    router.replace(`/calendar?month=${toMonthParam(current.year, current.month)}`);
  }

  const selectedTodos = selectedDate ? (todosByDate.get(selectedDate) ?? []) : [];
  const selectedHoliday = selectedDate ? holidaysByDate.get(selectedDate) : undefined;

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <Link
          href="/"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
        >
          List
        </Link>
      </div>

      <CalendarGrid
        year={year}
        month={month}
        todosByDate={todosByDate}
        holidaysByDate={holidaysByDate}
        onSelectDay={setSelectedDate}
        onNavigate={navigate}
        onToday={goToToday}
      />

      {selectedDate && (
        <DayTodosModal
          date={selectedDate}
          todos={selectedTodos}
          holiday={selectedHoliday}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </main>
  );
}
