'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Tag, Template, Todo } from '@/lib/db';

interface TodoWithTags extends Todo {
  tags?: Tag[];
}

interface TodosResponse {
  success: boolean;
  data: TodoWithTags[];
}

function TagPill({
  tag,
  selected,
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
      style={selected ? { backgroundColor: tag.color } : undefined}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
        selected
          ? 'border-transparent text-white'
          : 'border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200'
      }`}
    >
      {selected && <span aria-hidden>✓</span>}
      <span className="max-w-[10rem] truncate">{tag.name}</span>
    </button>
  );
}

function ManageTagsModal({
  tags,
  onClose,
  onChanged,
}: {
  tags: Tag[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('#3B82F6');
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    if (submitting) return;
    const nextName = name.trim();
    if (!nextName) {
      setError('Tag name is required');
      return;
    }

    const nextColor = color;
    setError(null);
    setSubmitting(true);
    setName('');
    setColor('#3B82F6');

    const response = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nextName, color: nextColor }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: 'Failed to create tag' }));
      setError(payload.error ?? 'Failed to create tag');
      setName(nextName);
      setColor(nextColor);
      setSubmitting(false);
      return;
    }

    await onChanged();
    setSubmitting(false);
  }

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setEditingName(tag.name);
    setEditingColor(tag.color);
    setError(null);
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    const response = await fetch(`/api/tags/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingName.trim(), color: editingColor }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: 'Failed to update tag' }));
      setError(payload.error ?? 'Failed to update tag');
      setSubmitting(false);
      return;
    }

    setEditingId(null);
    await onChanged();
    setSubmitting(false);
  }

  async function handleDelete(tagId: number) {
    if (submitting) return;
    const confirmed = window.confirm('Delete this tag?');
    if (!confirmed) return;

    setError(null);
    setSubmitting(true);
    const response = await fetch(`/api/tags/${tagId}`, { method: 'DELETE' });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: 'Failed to delete tag' }));
      setError(payload.error ?? 'Failed to delete tag');
      setSubmitting(false);
      return;
    }

    if (editingId === tagId) setEditingId(null);
    await onChanged();
    setSubmitting(false);
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Manage Tags</h2>

        {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <ul className="mb-4 max-h-64 space-y-2 overflow-y-auto">
          {tags.map((tag) => (
            <li key={tag.id} className="flex items-center justify-between gap-2">
              {editingId === tag.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    placeholder="Tag name"
                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    type="color"
                    value={editingColor}
                    onChange={(event) => setEditingColor(event.target.value)}
                    aria-label="Edit tag color"
                  />
                  <input
                    value={editingColor}
                    onChange={(event) => setEditingColor(event.target.value)}
                    className="w-24 rounded border border-gray-300 px-2 py-1 text-sm uppercase dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              ) : (
                <TagPill tag={tag} selected />
              )}

              <div className="flex gap-2 text-sm">
                {editingId === tag.id ? (
                  <>
                    <button onClick={handleSaveEdit} className="text-blue-600 dark:text-blue-400">
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-gray-600 dark:text-gray-300">
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(tag)} className="text-blue-600 dark:text-blue-400">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(tag.id)} className="text-red-600 dark:text-red-400">
                      Delete
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Tag name"
            className="flex-1 rounded border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            aria-label="Tag color"
          />
          <input
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="w-24 rounded border border-gray-300 px-2 py-1 text-sm uppercase dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            aria-label="Tag color hex"
          />
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50"
          >
            Create
          </button>
        </div>

        <button onClick={onClose} className="mt-4 text-gray-500 dark:text-gray-400">
          Close
        </button>
      </div>
    </div>
  );
}

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
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-semibold">{template.name}</span>
      </div>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">{template.title_template}</p>
      <div className="flex gap-2">
        <button
          onClick={() => onUse(template.id)}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
        >
          Use
        </button>
        {onDelete && (
          <button
            onClick={() => onDelete(template.id)}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 dark:border-red-700 dark:text-red-400"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Templates</h2>
          <button onClick={onClose} className="text-xl leading-none text-gray-400 hover:text-gray-600">
            &times;
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {templates.length === 0 ? (
            <p className="py-8 text-center text-gray-500">No templates yet.</p>
          ) : (
            templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onUse={(id) => {
                  onUse(id);
                  onClose();
                }}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [todos, setTodos] = useState<TodoWithTags[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [title, setTitle] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [activeFilterTagId, setActiveFilterTagId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showManageTags, setShowManageTags] = useState(false);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [templateUseMessage, setTemplateUseMessage] = useState<string | null>(null);

  const loadTodos = useCallback(async () => {
    const response = await fetch('/api/todos');
    if (!response.ok) return;
    const payload = (await response.json()) as TodosResponse;
    setTodos(payload.data ?? []);
  }, []);

  const loadTags = useCallback(async () => {
    const response = await fetch('/api/tags');
    if (!response.ok) return;
    const payload = (await response.json()) as Tag[];
    setTags(payload);
  }, []);

  const loadTemplates = useCallback(async () => {
    const response = await fetch('/api/templates');
    if (!response.ok) return;
    setTemplates(await response.json());
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((response) => {
        if (!response.ok) {
          router.push('/login');
          return null;
        }
        return response.json();
      })
      .then((payload) => {
        if (payload) setUsername(payload.username);
      });
  }, [router]);

  useEffect(() => {
    if (!username) return;
    loadTodos();
    loadTags();
    loadTemplates();
  }, [username, loadTags, loadTemplates, loadTodos]);

  useEffect(() => {
    if (activeFilterTagId == null) return;
    const exists = tags.some((tag) => tag.id === activeFilterTagId);
    if (!exists) setActiveFilterTagId(null);
  }, [activeFilterTagId, tags]);

  async function refreshTagData() {
    await Promise.all([loadTags(), loadTodos()]);
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  function toggleSelectedTag(tagId: number) {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]
    );
  }

  async function handleCreateTodo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError('Title is required');
      return;
    }

    const createResponse = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmedTitle }),
    });

    const createPayload = await createResponse.json().catch(() => ({ error: 'Failed to create todo' }));
    if (!createResponse.ok) {
      setFormError(createPayload.error ?? 'Failed to create todo');
      return;
    }

    const createdTodo = createPayload.data as TodoWithTags;

    const attachResults = await Promise.all(
      selectedTagIds.map((tagId) =>
        fetch(`/api/todos/${createdTodo.id}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag_id: tagId }),
        })
      )
    );

    if (attachResults.some((response) => !response.ok)) {
      setFormError('Todo created, but some tags could not be attached.');
    }

    setTitle('');
    setSelectedTagIds([]);
    await loadTodos();
  }

  async function handleUseTemplate(id: number) {
    const response = await fetch(`/api/templates/${id}/use`, { method: 'POST' });
    if (!response.ok) return;

    const todo = await response.json();
    setTemplateUseMessage(`Created: "${todo.title}"`);
    setTimeout(() => setTemplateUseMessage(null), 3000);
    await loadTodos();
  }

  async function handleDeleteTemplate(id: number) {
    const response = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 204) return;
    setTemplates((current) => current.filter((template) => template.id !== id));
  }

  const filteredTodos = useMemo(() => {
    if (activeFilterTagId == null) return todos;
    return todos.filter((todo) => (todo.tags ?? []).some((tag) => tag.id === activeFilterTagId));
  }, [activeFilterTagId, todos]);

  if (!username) return null;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Todo App</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowTemplateManager(true)}
            className="rounded-lg bg-indigo-100 px-3 py-1.5 text-sm text-indigo-700 transition-colors hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-800/40"
          >
            Templates {templates.length > 0 && `(${templates.length})`}
          </button>
          <span className="text-sm text-gray-500">Hi, {username}</span>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            Logout
          </button>
        </div>
      </div>

      {templateUseMessage && (
        <div className="mb-4 rounded-lg bg-green-100 px-4 py-2 text-sm text-green-700 dark:bg-green-900/40 dark:text-green-300">
          {templateUseMessage}
        </div>
      )}

      <form onSubmit={handleCreateTodo} className="mb-6 space-y-3 rounded-lg bg-white p-4 shadow dark:bg-gray-800">
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add a new todo…"
            className="flex-1 rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Add
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <TagPill
                key={tag.id}
                tag={tag}
                selected={selectedTagIds.includes(tag.id)}
                onClick={(selectedTag) => toggleSelectedTag(selectedTag.id)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowManageTags(true)}
            className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200"
          >
            + Manage Tags
          </button>
        </div>

        {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveFilterTagId(null)}
          className={`rounded-full px-3 py-1 text-sm ${
            activeFilterTagId == null
              ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          All Tags
        </button>

        {tags.map((tag) => (
          <button
            key={`filter-${tag.id}`}
            type="button"
            onClick={() => setActiveFilterTagId(tag.id)}
            style={activeFilterTagId === tag.id ? { backgroundColor: tag.color } : undefined}
            className={`rounded-full border px-3 py-1 text-sm ${
              activeFilterTagId === tag.id
                ? 'border-transparent text-white'
                : 'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-200'
            }`}
          >
            {tag.name}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredTodos.length === 0 ? (
          <p className="text-gray-500">No todos yet.</p>
        ) : (
          filteredTodos.map((todo) => (
            <article key={todo.id} className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
              <p className="font-medium text-gray-900 dark:text-gray-100">{todo.title}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(todo.tags ?? []).map((tag) => (
                  <button
                    key={`todo-tag-${todo.id}-${tag.id}`}
                    type="button"
                    onClick={() => setActiveFilterTagId(tag.id)}
                    style={{ backgroundColor: tag.color }}
                    className="rounded-full px-2.5 py-0.5 text-xs text-white"
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </article>
          ))
        )}
      </div>

      {showTemplateManager && (
        <TemplateManagerModal
          templates={templates}
          onUse={handleUseTemplate}
          onDelete={handleDeleteTemplate}
          onClose={() => setShowTemplateManager(false)}
        />
      )}

      {showManageTags && (
        <ManageTagsModal
          tags={tags}
          onClose={() => setShowManageTags(false)}
          onChanged={refreshTagData}
        />
      )}
    </main>
  );
}
