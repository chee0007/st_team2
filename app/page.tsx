'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Todo, Tag, Priority } from '@/lib/db';

// ──────────────────────────────────────────────────────────────────────────────
// Types & helpers
// ──────────────────────────────────────────────────────────────────────────────

type Section = 'overdue' | 'pending' | 'completed';

function classifySection(todo: Todo, now: Date): Section {
  if (todo.completed) return 'completed';
  if (todo.due_date) {
    const due = new Date(todo.due_date);
    if (due < now) return 'overdue';
  }
  return 'pending';
}

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority as Priority] ?? 1;
    const pb = PRIORITY_ORDER[b.priority as Priority] ?? 1;
    if (pa !== pb) return pa - pb;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return b.created_at.localeCompare(a.created_at);
  });
}

const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
};

// ──────────────────────────────────────────────────────────────────────────────
// TagPill component
// ──────────────────────────────────────────────────────────────────────────────

function TagPill({
  tag,
  selected = false,
  onClick,
}: {
  tag: Tag;
  selected?: boolean;
  onClick?: (tag: Tag) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(tag)}
      style={selected ? { backgroundColor: tag.color, borderColor: tag.color } : { borderColor: tag.color }}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-medium border transition-colors
        ${selected
          ? 'text-white'
          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
    >
      {selected && <span aria-hidden="true">✓</span>}
      <span className="truncate max-w-[8rem]">{tag.name}</span>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Manage Tags Modal
// ──────────────────────────────────────────────────────────────────────────────

function ManageTagsModal({
  tags,
  onClose,
  onRefresh,
}: {
  tags: Tag[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [hexInput, setHexInput] = useState('#3B82F6');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#3B82F6');
  const [editHex, setEditHex] = useState('#3B82F6');
  const [error, setError] = useState('');

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) { setError('Name is required'); return; }
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) { setError('Invalid color'); return; }
    setError('');
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed, color }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setName(''); setColor('#3B82F6'); setHexInput('#3B82F6');
    onRefresh();
  }

  async function handleUpdate(id: number) {
    const trimmed = editName.trim();
    if (!trimmed) { setError('Name is required'); return; }
    if (!/^#[0-9A-Fa-f]{6}$/.test(editColor)) { setError('Invalid color'); return; }
    setError('');
    const res = await fetch(`/api/tags/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed, color: editColor }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setEditingId(null);
    onRefresh();
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this tag? It will be removed from all todos.')) return;
    await fetch(`/api/tags/${id}`, { method: 'DELETE' });
    onRefresh();
  }

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
    setEditHex(tag.color);
    setError('');
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Manage Tags</h2>

        {error && <p className="text-red-600 dark:text-red-400 text-sm mb-3">{error}</p>}

        <ul className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {tags.length === 0 && (
            <li className="text-gray-500 dark:text-gray-400 text-sm">No tags yet.</li>
          )}
          {tags.map((tag) =>
            editingId === tag.id ? (
              <li key={tag.id} className="flex items-center gap-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => { setEditColor(e.target.value); setEditHex(e.target.value); }}
                  className="h-8 w-8 rounded cursor-pointer border-0"
                />
                <input
                  value={editHex}
                  onChange={(e) => {
                    setEditHex(e.target.value);
                    if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) setEditColor(e.target.value);
                  }}
                  className="w-24 border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono"
                />
                <button onClick={() => handleUpdate(tag.id)} className="text-green-600 dark:text-green-400 text-sm font-medium">Save</button>
                <button onClick={() => setEditingId(null)} className="text-gray-500 dark:text-gray-400 text-sm">Cancel</button>
              </li>
            ) : (
              <li key={tag.id} className="flex items-center justify-between gap-2">
                <TagPill tag={tag} selected />
                <div className="flex gap-3 text-sm">
                  <button onClick={() => startEdit(tag)} className="text-blue-600 dark:text-blue-400 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(tag.id)} className="text-red-600 dark:text-red-400 hover:underline">Delete</button>
                </div>
              </li>
            )
          )}
        </ul>

        <div className="border-t dark:border-gray-700 pt-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Create new tag</p>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Tag name"
              className="flex-1 border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <input
              type="color"
              value={color}
              onChange={(e) => { setColor(e.target.value); setHexInput(e.target.value); }}
              className="h-8 w-8 rounded cursor-pointer border-0"
            />
            <input
              value={hexInput}
              onChange={(e) => {
                setHexInput(e.target.value);
                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) setColor(e.target.value);
              }}
              className="w-24 border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono"
            />
            <button
              onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1 text-sm font-medium"
            >
              Create
            </button>
          </div>
        </div>

        <button onClick={onClose} className="mt-4 text-sm text-gray-500 dark:text-gray-400 hover:underline">
          Close
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newTagIds, setNewTagIds] = useState<number[]>([]);
  const [formError, setFormError] = useState('');

  // Filter state
  const [filterTagId, setFilterTagId] = useState<number | null>(null);

  // Modals
  const [showManageTags, setShowManageTags] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  // Edit form
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('medium');
  const [editDueDate, setEditDueDate] = useState('');
  const [editTagIds, setEditTagIds] = useState<number[]>([]);

  const fetchTodos = useCallback(async () => {
    const res = await fetch('/api/todos');
    if (res.status === 401) { router.push('/login'); return; }
    const data = await res.json();
    setTodos(data);
  }, [router]);

  const fetchTags = useCallback(async () => {
    const res = await fetch('/api/tags');
    if (res.ok) setTags(await res.json());
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => {
        if (!r.ok) { router.push('/login'); return null; }
        return r.json();
      })
      .then((u) => {
        if (u) setUsername(u.username);
      });
    Promise.all([fetchTodos(), fetchTags()]).finally(() => setLoading(false));
  }, [fetchTodos, fetchTags, router]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function handleCreateTodo(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) { setFormError('Title is required'); return; }
    setFormError('');
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        priority: newPriority,
        due_date: newDueDate || null,
        tag_ids: newTagIds,
      }),
    });
    if (!res.ok) { const d = await res.json(); setFormError(d.error); return; }
    const todo = await res.json();
    setTodos((prev) => [todo, ...prev]);
    setNewTitle('');
    setNewDueDate('');
    setNewPriority('medium');
    setNewTagIds([]);
  }

  async function handleToggleComplete(todo: Todo) {
    const res = await fetch(`/api/todos/${todo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !todo.completed }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
      if (!todo.completed && todo.is_recurring) fetchTodos();
    }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/todos/${id}`, { method: 'DELETE' });
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  function startEdit(todo: Todo) {
    setEditingTodo(todo);
    setEditTitle(todo.title);
    setEditPriority(todo.priority as Priority);
    setEditDueDate(todo.due_date ?? '');
    setEditTagIds((todo.tags ?? []).map((t) => t.id));
  }

  async function handleUpdateTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTodo) return;
    const title = editTitle.trim();
    if (!title) return;
    const res = await fetch(`/api/todos/${editingTodo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        priority: editPriority,
        due_date: editDueDate || null,
        tag_ids: editTagIds,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === editingTodo.id ? updated : t)));
      setEditingTodo(null);
    }
  }

  function toggleNewTag(tag: Tag) {
    setNewTagIds((prev) =>
      prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
    );
  }

  function toggleEditTag(tag: Tag) {
    setEditTagIds((prev) =>
      prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
    );
  }

  const now = new Date();
  const filtered = todos.filter((t) =>
    filterTagId ? (t.tags ?? []).some((tag) => tag.id === filterTagId) : true
  );

  const overdue = sortTodos(filtered.filter((t) => classifySection(t, now) === 'overdue'));
  const pending = sortTodos(filtered.filter((t) => classifySection(t, now) === 'pending'));
  const completed = filtered.filter((t) => classifySection(t, now) === 'completed');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">My Todos</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500 dark:text-gray-400">{username}</span>
            <button onClick={handleLogout} className="text-red-600 dark:text-red-400 hover:underline">
              Logout
            </button>
          </div>
        </div>

        {/* Create todo form */}
        <form onSubmit={handleCreateTodo} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6 space-y-3">
          <div className="flex gap-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Add a new todo…"
              className="flex-1 border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 font-medium"
            >
              Add
            </button>
          </div>
          {formError && <p className="text-red-600 dark:text-red-400 text-sm">{formError}</p>}

          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as Priority)}
              className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <input
              type="datetime-local"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowManageTags(true)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              + Manage Tags
            </button>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <TagPill
                  key={tag.id}
                  tag={tag}
                  selected={newTagIds.includes(tag.id)}
                  onClick={toggleNewTag}
                />
              ))}
            </div>
          )}
        </form>

        {/* Filter bar */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Filter by tag:</span>
            <button
              onClick={() => setFilterTagId(null)}
              className={`text-sm rounded-full px-3 py-0.5 border transition-colors ${
                filterTagId === null
                  ? 'bg-gray-700 text-white border-gray-700 dark:bg-gray-200 dark:text-gray-800'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
              }`}
            >
              All Tags
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setFilterTagId(filterTagId === tag.id ? null : tag.id)}
                style={filterTagId === tag.id ? { backgroundColor: tag.color, borderColor: tag.color } : { borderColor: tag.color }}
                className={`text-xs rounded-full px-3 py-0.5 border font-medium transition-colors ${
                  filterTagId === tag.id
                    ? 'text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}

        {/* Sections */}
        {overdue.length > 0 && (
          <SectionWrapper title="Overdue" titleClass="text-red-600 dark:text-red-400">
            {overdue.map((todo) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                onToggle={handleToggleComplete}
                onDelete={handleDelete}
                onEdit={startEdit}
                onTagClick={(tag) => setFilterTagId(tag.id)}
              />
            ))}
          </SectionWrapper>
        )}

        {pending.length > 0 && (
          <SectionWrapper title="Pending">
            {pending.map((todo) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                onToggle={handleToggleComplete}
                onDelete={handleDelete}
                onEdit={startEdit}
                onTagClick={(tag) => setFilterTagId(tag.id)}
              />
            ))}
          </SectionWrapper>
        )}

        {completed.length > 0 && (
          <SectionWrapper title="Completed" titleClass="text-gray-500 dark:text-gray-400">
            {completed.map((todo) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                onToggle={handleToggleComplete}
                onDelete={handleDelete}
                onEdit={startEdit}
                onTagClick={(tag) => setFilterTagId(tag.id)}
              />
            ))}
          </SectionWrapper>
        )}

        {filtered.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 mt-12">
            {filterTagId ? 'No todos with this tag.' : 'No todos yet. Add one above!'}
          </p>
        )}
      </div>

      {/* Manage Tags Modal */}
      {showManageTags && (
        <ManageTagsModal
          tags={tags}
          onClose={() => setShowManageTags(false)}
          onRefresh={async () => {
            await fetchTags();
            await fetchTodos();
          }}
        />
      )}

      {/* Edit Todo Modal */}
      {editingTodo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Edit Todo</h2>
            <form onSubmit={handleUpdateTodo} className="space-y-3">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-3">
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as Priority)}
                  className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <input
                  type="datetime-local"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <TagPill
                      key={tag.id}
                      tag={tag}
                      selected={editTagIds.includes(tag.id)}
                      onClick={toggleEditTag}
                    />
                  ))}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 font-medium">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTodo(null)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg py-2 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SectionWrapper
// ──────────────────────────────────────────────────────────────────────────────

function SectionWrapper({
  title,
  titleClass = 'text-gray-700 dark:text-gray-300',
  children,
}: {
  title: string;
  titleClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h2 className={`text-sm font-semibold uppercase tracking-wider mb-2 ${titleClass}`}>{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// TodoCard
// ──────────────────────────────────────────────────────────────────────────────

function TodoCard({
  todo,
  onToggle,
  onDelete,
  onEdit,
  onTagClick,
}: {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onDelete: (id: number) => void;
  onEdit: (todo: Todo) => void;
  onTagClick: (tag: Tag) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 px-4 py-3 flex gap-3 items-start">
      <button
        onClick={() => onToggle(todo)}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
          todo.completed
            ? 'bg-green-500 border-green-500'
            : 'border-gray-400 dark:border-gray-500 hover:border-blue-500'
        }`}
        aria-label={todo.completed ? 'Mark incomplete' : 'Mark complete'}
      />

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${todo.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-white'}`}>
          {todo.title}
        </p>

        <div className="flex flex-wrap gap-1 mt-1 items-center">
          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${PRIORITY_COLORS[todo.priority as Priority]}`}>
            {todo.priority}
          </span>
          {todo.due_date && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Due: {new Date(todo.due_date).toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore', day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          )}
          {todo.is_recurring && (
            <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-full px-2 py-0.5">
              🔄 {todo.recurrence_pattern}
            </span>
          )}
          {(todo.tags ?? []).map((tag) => (
            <button
              key={tag.id}
              onClick={() => onTagClick(tag)}
              style={{ backgroundColor: tag.color }}
              className="text-xs rounded-full px-2 py-0.5 text-white font-medium hover:opacity-80 transition-opacity"
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <button onClick={() => onEdit(todo)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
          Edit
        </button>
        <button onClick={() => onDelete(todo.id)} className="text-xs text-red-600 dark:text-red-400 hover:underline">
          Del
        </button>
      </div>
    </div>
  );
}