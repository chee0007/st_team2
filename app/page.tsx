'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Template, Priority, RecurrencePattern, Todo } from '@/lib/db';
import { sectionTodos } from '@/lib/todo-sort';
import { getSingaporeNow, isAtLeastOneMinuteInFuture, parseISODate } from '@/lib/timezone';
import { PriorityBadge, RecurrenceBadge, ReminderBadge } from '@/app/components/todo-badges';
import { useNotifications } from '@/lib/hooks/useNotifications';

// ΓöÇΓöÇΓöÇ Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function formatReminder(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${minutes / 60}h`;
  if (minutes < 10080) return `${minutes / 1440}d`;
  return `${minutes / 10080}w`;
}

function toDateTimeLocal(iso: string | null): string {
  if (!iso) return '';

  const date = parseISODate(iso);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  return `${value}:00+08:00`;
}

function formatDue(iso: string | null): string {
  if (!iso) return 'No due date';
  return new Intl.DateTimeFormat('en-SG', {
    timeZone: 'Asia/Singapore',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parseISODate(iso));
}

type TodosResponse = { success: boolean; data: Todo[] };
type TodoResponse = { success: boolean; data: Todo };

// ΓöÇΓöÇΓöÇ SaveTemplateModal ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface TemplateDraft {
  title: string;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  due_date_offset_minutes: number | null;
  subtasks: { title: string; position: number }[];
}

function SaveTemplateModal({
  draft,
  onClose,
  onSaved,
}: {
  draft: TemplateDraft;
  onClose: () => void;
  onSaved: (t: Template) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          category: category.trim() || undefined,
          title_template: draft.title,
          priority: draft.priority,
          is_recurring: draft.is_recurring,
          recurrence_pattern: draft.recurrence_pattern ?? undefined,
          reminder_minutes: draft.reminder_minutes ?? undefined,
          due_date_offset_minutes: draft.due_date_offset_minutes ?? undefined,
          subtasks: draft.subtasks,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Save failed'); return; }
      onSaved(data as Template);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md space-y-4 p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">≡ƒÆ╛ Save as Template</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Name <span className="text-red-500">*</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekly Team Meeting"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Work, Personal, FinanceΓÇª"
              list="category-suggestions"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
            />
            <datalist id="category-suggestions">
              {['Work', 'Personal', 'Finance', 'Health', 'Education'].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50"
          >
            {saving ? 'SavingΓÇª' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ΓöÇΓöÇΓöÇ TemplateCard ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function TemplateCard({
  template,
  onUse,
  onDelete,
}: {
  template: Template;
  onUse: (id: number) => void;
  onDelete?: (id: number) => void;
}) {
  return (
    <div className="template-card border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">{template.name}</span>
          {template.category && (
            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">
              {template.category}
            </span>
          )}
        </div>
      </div>

      {template.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{template.description}</p>
      )}

      <p className="text-sm text-gray-600 dark:text-gray-300 italic truncate">&ldquo;{template.title_template}&rdquo;</p>

      <div className="flex flex-wrap gap-1.5 text-xs">
        <PriorityBadge priority={template.priority} />
        {template.is_recurring && (
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-full">
            Recurs: {template.recurrence_pattern}
          </span>
        )}
        {template.reminder_minutes != null && (
          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 rounded-full">
            Reminder: {formatReminder(template.reminder_minutes)}
          </span>
        )}
        {template.subtasks_json && (() => {
          try {
            const count = (JSON.parse(template.subtasks_json) as unknown[]).length;
            return count > 0 ? (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                {count} subtask{count !== 1 ? 's' : ''}
              </span>
            ) : null;
          } catch { return null; }
        })()}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onUse(template.id)}
          className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Use
        </button>
        {onDelete && (
          <button
            onClick={() => onDelete(template.id)}
            className="px-3 py-1.5 text-sm border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ΓöÇΓöÇΓöÇ TemplateManagerModal ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function TemplateManagerModal({
  templates,
  onUse,
  onDelete,
  onClose,
}: {
  templates: Template[];
  onUse: (id: number) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">≡ƒôï Templates</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {templates.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No templates yet. Save a todo as a template to get started.</p>
          ) : (
            templates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onUse={(id) => { onUse(id); onClose(); }}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TodoEditModal({
  todo,
  onCancel,
  onSave,
}: {
  todo: Todo;
  onCancel: () => void;
  onSave: (input: { title: string; priority: Priority; due_date: string | null }) => Promise<void>;
}) {
  const [title, setTitle] = useState(todo.title);
  const [priority, setPriority] = useState<Priority>(todo.priority);
  const [dueDate, setDueDate] = useState(toDateTimeLocal(todo.due_date));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [onCancel]);

  async function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Title is required');
      return;
    }

    const due = fromDateTimeLocal(dueDate);
    if (due && !isAtLeastOneMinuteInFuture(parseISODate(due))) {
      setError('Due date must be at least 1 minute in the future');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSave({ title: trimmed, priority, due_date: due });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(event) => {
        if (event.currentTarget === event.target) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800 space-y-4">
        <h2 className="text-lg font-semibold">Edit Todo</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Priority</label>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as Priority)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Due date</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Update'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TodoRow({
  todo,
  onToggle,
  onEdit,
  onDelete,
  onSaveTemplate,
}: {
  todo: Todo;
  onToggle: (todo: Todo, completed: boolean) => Promise<void>;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => Promise<void>;
  onSaveTemplate: (todo: Todo) => void;
}) {
  return (
    <li className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={(event) => {
              void onToggle(todo, event.target.checked);
            }}
            aria-label={`Toggle ${todo.title}`}
            className="mt-1 h-4 w-4"
          />

          <div className="min-w-0">
            <p className={`font-medium ${todo.completed ? 'line-through text-gray-500' : ''}`}>
              {todo.title}
            </p>
            <p className="text-xs text-gray-500 mt-1">{formatDue(todo.due_date)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <PriorityBadge priority={todo.priority} />
              <RecurrenceBadge
                isRecurring={todo.is_recurring}
                recurrencePattern={todo.recurrence_pattern ?? null}
              />
              <ReminderBadge minutes={todo.reminder_minutes ?? null} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm shrink-0">
          <button
            onClick={() => onSaveTemplate(todo)}
            className="px-2 py-1 rounded border border-indigo-300 text-indigo-700 dark:text-indigo-300"
          >
            Save Template
          </button>
          <button
            onClick={() => onEdit(todo)}
            className="px-2 py-1 rounded border border-blue-300 text-blue-700 dark:text-blue-300"
          >
            Edit
          </button>
          <button
            onClick={() => {
              void onDelete(todo);
            }}
            className="px-2 py-1 rounded border border-red-300 text-red-700 dark:text-red-300"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}

function TodoSection({
  title,
  todos,
  onToggle,
  onEdit,
  onDelete,
  onSaveTemplate,
}: {
  title: string;
  todos: Todo[];
  onToggle: (todo: Todo, completed: boolean) => Promise<void>;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => Promise<void>;
  onSaveTemplate: (todo: Todo) => void;
}) {
  if (todos.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title} ({todos.length})</h2>
      <ul className="space-y-2">
        {todos.map((todo) => (
          <TodoRow
            key={todo.id}
            todo={todo}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            onSaveTemplate={onSaveTemplate}
          />
        ))}
      </ul>
    </section>
  );
}

// ΓöÇΓöÇΓöÇ Main page ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(true);
  const [todoError, setTodoError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [creatingTodo, setCreatingTodo] = useState(false);

  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  const [templateDraft, setTemplateDraft] = useState<TemplateDraft | null>(null);

  // Template state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  // Notification: todo created from template
  const [templateUseMessage, setTemplateUseMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) { router.push('/login'); return null; }
        return res.json();
      })
      .then((data) => { if (data) setUsername(data.username); });
  }, [router]);

  const sections = useMemo(() => sectionTodos(todos, getSingaporeNow()), [todos]);

  const loadTodos = useCallback(async () => {
    setLoadingTodos(true);
    setTodoError(null);
    try {
      const res = await fetch('/api/todos');
      if (!res.ok) throw new Error('Failed to load todos');
      const payload = (await res.json()) as TodosResponse;
      setTodos(payload.data ?? []);
    } catch {
      setTodoError('Could not load todos');
    } finally {
      setLoadingTodos(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    const res = await fetch('/api/templates');
    if (res.ok) setTemplates(await res.json());
  }, []);

  useEffect(() => {
    if (username) {
      void loadTemplates();
      void loadTodos();
    }
  }, [username, loadTemplates, loadTodos]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function handleUseTemplate(id: number) {
    const res = await fetch(`/api/templates/${id}/use`, { method: 'POST' });
    if (res.ok) {
      const todo = await res.json();
      setTodos((prev) => [todo as Todo, ...prev]);
      setTemplateUseMessage(`Created: "${todo.title}"`);
      setTimeout(() => setTemplateUseMessage(null), 3000);
    }
  }

  async function handleDeleteTemplate(id: number) {
    const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  }

  async function createTodo() {
    const title = newTitle.trim();
    if (!title) {
      setTodoError('Title is required');
      return;
    }

    const dueDate = fromDateTimeLocal(newDueDate);
    if (dueDate && !isAtLeastOneMinuteInFuture(parseISODate(dueDate))) {
      setTodoError('Due date must be at least 1 minute in the future');
      return;
    }

    setCreatingTodo(true);
    setTodoError(null);

    const optimisticId = -Date.now();
    const optimisticTodo: Todo = {
      id: optimisticId,
      user_id: 0,
      title,
      completed: false,
      due_date: dueDate,
      priority: newPriority,
      is_recurring: false,
      recurrence_pattern: null,
      reminder_minutes: null,
      last_notification_sent: null,
      created_at: getSingaporeNow().toISOString(),
      updated_at: null,
      subtasks: [],
      tags: [],
    };

    setTodos((prev) => [optimisticTodo, ...prev]);

    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority: newPriority, due_date: dueDate }),
      });

      const payload = (await res.json()) as TodoResponse | { error?: string };
      if (!res.ok || !('success' in payload) || !payload.success) {
        throw new Error('error' in payload ? payload.error : 'Failed to create todo');
      }

      setTodos((prev) => prev.map((todo) => (todo.id === optimisticId ? payload.data : todo)));
      setNewTitle('');
      setNewPriority('medium');
      setNewDueDate('');
    } catch (error) {
      setTodos((prev) => prev.filter((todo) => todo.id !== optimisticId));
      setTodoError(error instanceof Error ? error.message : 'Failed to create todo');
    } finally {
      setCreatingTodo(false);
    }
  }

  async function toggleTodo(todo: Todo, completed: boolean) {
    const previous = todo;
    const optimistic: Todo = {
      ...todo,
      completed,
      updated_at: getSingaporeNow().toISOString(),
    };
    setTodos((prev) => prev.map((item) => (item.id === todo.id ? optimistic : item)));

    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      const payload = (await res.json()) as TodoResponse | { error?: string };
      if (!res.ok || !('success' in payload) || !payload.success) {
        throw new Error('error' in payload ? payload.error : 'Failed to update todo');
      }
      setTodos((prev) => prev.map((item) => (item.id === todo.id ? payload.data : item)));
    } catch (error) {
      setTodos((prev) => prev.map((item) => (item.id === todo.id ? previous : item)));
      setTodoError(error instanceof Error ? error.message : 'Failed to update todo');
    }
  }

  async function saveTodoEdit(input: {
    title: string;
    priority: Priority;
    due_date: string | null;
  }) {
    if (!editingTodo) return;

    const previous = editingTodo;
    const optimistic: Todo = {
      ...editingTodo,
      title: input.title,
      priority: input.priority,
      due_date: input.due_date,
      updated_at: getSingaporeNow().toISOString(),
    };

    setTodos((prev) => prev.map((item) => (item.id === editingTodo.id ? optimistic : item)));

    try {
      const res = await fetch(`/api/todos/${editingTodo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const payload = (await res.json()) as TodoResponse | { error?: string };
      if (!res.ok || !('success' in payload) || !payload.success) {
        throw new Error('error' in payload ? payload.error : 'Failed to update todo');
      }
      setTodos((prev) => prev.map((item) => (item.id === editingTodo.id ? payload.data : item)));
      setEditingTodo(null);
    } catch (error) {
      setTodos((prev) => prev.map((item) => (item.id === previous.id ? previous : item)));
      setTodoError(error instanceof Error ? error.message : 'Failed to update todo');
      throw error;
    }
  }

  async function deleteTodo(todo: Todo) {
    setTodoError(null);
    setTodos((prev) => prev.filter((item) => item.id !== todo.id));

    try {
      const res = await fetch(`/api/todos/${todo.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(payload.error ?? 'Failed to delete todo');
      }
    } catch (error) {
      setTodos((prev) => [todo, ...prev]);
      setTodoError(error instanceof Error ? error.message : 'Failed to delete todo');
    }
  }

  function openSaveTemplate(todo: Todo) {
    setTemplateDraft({
      title: todo.title,
      priority: todo.priority,
      is_recurring: todo.is_recurring,
      recurrence_pattern: todo.recurrence_pattern,
      reminder_minutes: todo.reminder_minutes,
      due_date_offset_minutes: null,
      subtasks: [],
    });
  }

  if (!username) return null;

  return (
    <main className="max-w-3xl mx-auto p-6">
      {/* ΓöÇΓöÇ Navigation bar ΓöÇΓöÇ */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Todo App</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowTemplateManager(true)}
            className="px-3 py-1.5 text-sm bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-800/40 transition-colors"
          >
            Templates {templates.length > 0 && `(${templates.length})`}
          </button>
          <NotificationToggle />
          <span className="text-sm text-gray-500">Hi, {username}</span>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Template-use success toast */}
      {templateUseMessage && (
        <div className="mb-4 px-4 py-2 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-lg text-sm">
          Γ£ô {templateUseMessage}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 mb-6 space-y-3">
        <h2 className="text-lg font-semibold">Add Todo</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="What do you need to do?"
            className="md:col-span-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
          />

          <select
            value={newPriority}
            onChange={(event) => setNewPriority(event.target.value as Priority)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="datetime-local"
            value={newDueDate}
            onChange={(event) => setNewDueDate(event.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
          />
          <button
            onClick={() => {
              void createTodo();
            }}
            disabled={creatingTodo}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60"
          >
            {creatingTodo ? 'Adding...' : 'Add'}
          </button>
        </div>

        {todoError && <p className="text-sm text-red-600 dark:text-red-400">{todoError}</p>}
      </section>

      {loadingTodos ? (
        <p className="text-sm text-gray-500">Loading todos...</p>
      ) : (
        <div className="space-y-6">
          <TodoSection
            title="Overdue"
            todos={sections.overdue as Todo[]}
            onToggle={toggleTodo}
            onEdit={setEditingTodo}
            onDelete={deleteTodo}
            onSaveTemplate={openSaveTemplate}
          />
          <TodoSection
            title="Pending"
            todos={sections.pending as Todo[]}
            onToggle={toggleTodo}
            onEdit={setEditingTodo}
            onDelete={deleteTodo}
            onSaveTemplate={openSaveTemplate}
          />
          <TodoSection
            title="Completed"
            todos={sections.completed as Todo[]}
            onToggle={toggleTodo}
            onEdit={setEditingTodo}
            onDelete={deleteTodo}
            onSaveTemplate={openSaveTemplate}
          />
          {todos.length === 0 && <p className="text-sm text-gray-500">No todos yet.</p>}
        </div>
      )}

      {/* ΓöÇΓöÇ Template Manager modal ΓöÇΓöÇ */}
      {showTemplateManager && (
        <TemplateManagerModal
          templates={templates}
          onUse={handleUseTemplate}
          onDelete={handleDeleteTemplate}
          onClose={() => setShowTemplateManager(false)}
        />
      )}

      {templateDraft && (
        <SaveTemplateModal
          draft={templateDraft}
          onClose={() => setTemplateDraft(null)}
          onSaved={(template) => {
            setTemplates((prev) => [template, ...prev]);
            setTemplateDraft(null);
          }}
        />
      )}

      {editingTodo && (
        <TodoEditModal
          todo={editingTodo}
          onCancel={() => setEditingTodo(null)}
          onSave={saveTodoEdit}
        />
      )}
    </main>
  );
}
