'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Todo } from '@/lib/db';

/**
 * Polls GET /api/notifications/check every 30 s when browser notification
 * permission is granted. For each due todo, fires a native Notification and
 * stamps last_notification_sent via PUT /api/todos/[id] so the same reminder
 * never fires twice.
 *
 * All timing is server-authoritative (Singapore timezone). The client is only
 * a polling trigger — never a timing authority.
 */
export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Sync with browser's current permission state on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  useEffect(() => {
    if (permission !== 'granted') return;

    const poll = async () => {
      try {
        const res = await fetch('/api/notifications/check');
        if (!res.ok) return;
        const { data: dueTodos } = (await res.json()) as { data: Todo[] };

        for (const todo of dueTodos) {
          // Guard: re-check permission inside the loop (could be revoked mid-session)
          if (Notification.permission !== 'granted') break;

          const dueLabel = todo.due_date
            ? new Date(todo.due_date).toLocaleString('en-SG', { timeZone: 'Asia/Singapore', dateStyle: 'medium', timeStyle: 'short' })
            : '';

          new Notification(todo.title, {
            body: dueLabel ? `Due ${dueLabel}` : 'Reminder',
            // tag deduplicates same-todo notifications at the OS level
            // (handles the multi-tab race documented in PRP 04)
            tag: `todo-${todo.id}`,
          });

          // Stamp the server so this reminder doesn't fire again
          await fetch(`/api/todos/${todo.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ last_notification_sent: new Date().toISOString() }),
          });
        }
      } catch {
        // Swallow errors silently — polling is best-effort
      }
    };

    poll();
    const interval = setInterval(poll, 30_000);
    return () => clearInterval(interval);
  }, [permission]);

  return { permission, requestPermission };
}
