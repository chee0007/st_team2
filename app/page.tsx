'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Template, Priority, RecurrencePattern } from '@/lib/db';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatReminder(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${minutes / 60}h`;
  if (minutes < 10080) return `${minutes / 1440}d`;
  return `${minutes / 10080}w`;
}

const PRIORITY_CLASSES: Record<Priority, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
};

// ─── SaveTemplateModal ────────────────────────────────────────────────────────

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
          <h2 className="text-lg font-semibold">💾 Save as Template</h2>
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
              placeholder="e.g. Work, Personal, Finance…"
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
            {saving ? 'Saving…' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TemplateCard ─────────────────────────────────────────────────────────────

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
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
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
        <span className={`px-2 py-0.5 rounded-full font-medium ${PRIORITY_CLASSES[template.priority]}`}>
          {template.priority}
        </span>
        {template.is_recurring && (
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-full">
            🔄 {template.recurrence_pattern}
          </span>
        )}
        {template.reminder_minutes != null && (
          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 rounded-full">
            🔔 {formatReminder(template.reminder_minutes)}
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

// ─── TemplateManagerModal ─────────────────────────────────────────────────────

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
          <h2 className="text-lg font-semibold">📋 Templates</h2>
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

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

  const loadTemplates = useCallback(async () => {
    const res = await fetch('/api/templates');
    if (res.ok) setTemplates(await res.json());
  }, []);

  useEffect(() => {
    if (username) loadTemplates();
  }, [username, loadTemplates]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function handleUseTemplate(id: number) {
    const res = await fetch(`/api/templates/${id}/use`, { method: 'POST' });
    if (res.ok) {
      const todo = await res.json();
      setTemplateUseMessage(`Created: "${todo.title}"`);
      setTimeout(() => setTemplateUseMessage(null), 3000);
      // TODO (Person 2): refresh todo list after this
    }
  }

  async function handleDeleteTemplate(id: number) {
    const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  }

  if (!username) return null;

  return (
    <main className="max-w-3xl mx-auto p-6">
      {/* ── Navigation bar ── */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Todo App</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowTemplateManager(true)}
            className="px-3 py-1.5 text-sm bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-800/40 transition-colors"
          >
            📋 Templates {templates.length > 0 && `(${templates.length})`}
          </button>
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
          ✓ {templateUseMessage}
        </div>
      )}

      {/* ── Todo list (Person 2 fills this in) ── */}
      <p className="text-gray-500">Todos will appear here. (Person 2 implements this.)</p>

      {/* ── Template Manager modal ── */}
      {showTemplateManager && (
        <TemplateManagerModal
          templates={templates}
          onUse={handleUseTemplate}
          onDelete={handleDeleteTemplate}
          onClose={() => setShowTemplateManager(false)}
        />
      )}
    </main>
  );
}
