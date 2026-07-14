import Database from 'better-sqlite3';
import path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Priority = 'high' | 'medium' | 'low';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type ReminderMinutes = 15 | 30 | 60 | 120 | 1440 | 2880 | 10080;

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface Authenticator {
  id: number;
  user_id: number;
  credential_id: string;
  credential_public_key: Buffer;
  counter: number;
  created_at: string;
}

export interface Session {
  userId: number;
  username: string;
}

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: boolean;
  due_date: string | null;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  last_notification_sent: string | null;
  created_at: string;
  updated_at: string | null;
  subtasks?: Subtask[];
  tags?: Tag[];
}

export interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
}

export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface Template {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  category: string | null;
  title_template: string;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  due_date_offset_minutes: number | null;
  subtasks_json: string | null;
  created_at: string;
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
}

export interface TodoExportItem
  extends Omit<
    Todo,
    'id' | 'user_id' | 'updated_at' | 'last_notification_sent' | 'subtasks' | 'tags'
  > {
  subtasks: Array<Omit<Subtask, 'id' | 'todo_id' | 'created_at'>>;
  tags: Array<Pick<Tag, 'name' | 'color'>>;
}

export interface ImportResult {
  imported: number;
  tagsCreated: number;
  tagsReused: number;
}

// ─── Database init (singleton) ────────────────────────────────────────────────

const DB_PATH = path.join(process.cwd(), 'todos.db');

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

const db: Database.Database = globalThis.__db ?? new Database(DB_PATH);
if (process.env.NODE_ENV !== 'production') {
  globalThis.__db = db;
}

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// ─── Schema ───────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS authenticators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id TEXT UNIQUE NOT NULL,
    credential_public_key BLOB NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_authenticators_user_id ON authenticators(user_id);

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    due_date TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    is_recurring INTEGER NOT NULL DEFAULT 0,
    recurrence_pattern TEXT,
    reminder_minutes INTEGER,
    last_notification_sent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
  CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);

  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_subtasks_todo_id ON subtasks(todo_id);

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, name)
  );

  CREATE TABLE IF NOT EXISTS todo_tags (
    todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (todo_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    title_template TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    is_recurring INTEGER NOT NULL DEFAULT 0,
    recurrence_pattern TEXT,
    reminder_minutes INTEGER,
    due_date_offset_minutes INTEGER,
    subtasks_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
`);

// ─── Helper: convert raw DB row booleans ─────────────────────────────────────

function rawToTodo(raw: Record<string, unknown>): Todo {
  return {
    ...(raw as Omit<Todo, 'completed' | 'is_recurring'>),
    completed: Boolean(raw.completed),
    is_recurring: Boolean(raw.is_recurring),
  };
}

function rawToSubtask(raw: Record<string, unknown>): Subtask {
  return {
    ...(raw as Omit<Subtask, 'completed'>),
    completed: Boolean(raw.completed),
  };
}

function rawToTemplate(raw: Record<string, unknown>): Template {
  return {
    ...(raw as Omit<Template, 'is_recurring'>),
    is_recurring: Boolean(raw.is_recurring),
  };
}

// ─── userDB ───────────────────────────────────────────────────────────────────

export const userDB = {
  findByUsername(username: string): User | undefined {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
  },

  findById(id: number): User | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  },

  create(username: string): User {
    const result = db.prepare('INSERT INTO users (username) VALUES (?)').run(username);
    return userDB.findById(result.lastInsertRowid as number)!;
  },
};

// ─── authenticatorDB ──────────────────────────────────────────────────────────

export const authenticatorDB = {
  findByCredentialId(credentialId: string): Authenticator | undefined {
    return db
      .prepare('SELECT * FROM authenticators WHERE credential_id = ?')
      .get(credentialId) as Authenticator | undefined;
  },

  findByUserId(userId: number): Authenticator[] {
    return db
      .prepare('SELECT * FROM authenticators WHERE user_id = ?')
      .all(userId) as Authenticator[];
  },

  create(data: {
    user_id: number;
    credential_id: string;
    credential_public_key: Buffer;
    counter: number;
  }): Authenticator {
    const result = db
      .prepare(
        'INSERT INTO authenticators (user_id, credential_id, credential_public_key, counter) VALUES (?, ?, ?, ?)',
      )
      .run(data.user_id, data.credential_id, data.credential_public_key, data.counter);
    return db
      .prepare('SELECT * FROM authenticators WHERE id = ?')
      .get(result.lastInsertRowid) as Authenticator;
  },

  updateCounter(id: number, counter: number): void {
    db.prepare('UPDATE authenticators SET counter = ? WHERE id = ?').run(counter, id);
  },
};

// ─── todoDB ───────────────────────────────────────────────────────────────────

export const todoDB = {
  findAllByUser(userId: number): Todo[] {
    const rows = db
      .prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Record<string, unknown>[];
    return rows.map(rawToTodo);
  },

  findById(id: number, userId: number): Todo | undefined {
    const row = db
      .prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?')
      .get(id, userId) as Record<string, unknown> | undefined;
    return row ? rawToTodo(row) : undefined;
  },

  create(data: {
    user_id: number;
    title: string;
    due_date?: string | null;
    priority?: Priority;
    is_recurring?: boolean;
    recurrence_pattern?: RecurrencePattern | null;
    reminder_minutes?: number | null;
  }): Todo {
    const result = db
      .prepare(
        `INSERT INTO todos (user_id, title, due_date, priority, is_recurring, recurrence_pattern, reminder_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        data.user_id,
        data.title,
        data.due_date ?? null,
        data.priority ?? 'medium',
        data.is_recurring ? 1 : 0,
        data.recurrence_pattern ?? null,
        data.reminder_minutes ?? null,
      );
    return todoDB.findById(result.lastInsertRowid as number, data.user_id)!;
  },

  update(
    id: number,
    userId: number,
    data: Partial<Omit<Todo, 'id' | 'user_id' | 'created_at'>>,
  ): Todo | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.completed !== undefined) { fields.push('completed = ?'); values.push(data.completed ? 1 : 0); }
    if (data.due_date !== undefined) { fields.push('due_date = ?'); values.push(data.due_date); }
    if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority); }
    if (data.is_recurring !== undefined) { fields.push('is_recurring = ?'); values.push(data.is_recurring ? 1 : 0); }
    if (data.recurrence_pattern !== undefined) { fields.push('recurrence_pattern = ?'); values.push(data.recurrence_pattern); }
    if (data.reminder_minutes !== undefined) { fields.push('reminder_minutes = ?'); values.push(data.reminder_minutes); }
    if (data.last_notification_sent !== undefined) { fields.push('last_notification_sent = ?'); values.push(data.last_notification_sent); }

    if (fields.length === 0) return todoDB.findById(id, userId);

    fields.push("updated_at = datetime('now')");
    values.push(id, userId);

    db.prepare(`UPDATE todos SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
    return todoDB.findById(id, userId);
  },

  delete(id: number, userId: number): void {
    db.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?').run(id, userId);
  },

  findAllWithRelations(userId: number): Todo[] {
    const todos = todoDB.findAllByUser(userId);
    return todos.map((todo) => ({
      ...todo,
      subtasks: subtaskDB.findByTodoId(todo.id),
      tags: tagDB.findByTodoId(todo.id),
    }));
  },

  importAll(userId: number, items: TodoExportItem[]): ImportResult {
    let tagsCreated = 0;
    let tagsReused = 0;

    const insertTodo = db.prepare(
      `INSERT INTO todos
       (user_id, title, completed, due_date, priority, is_recurring, recurrence_pattern, reminder_minutes, created_at, updated_at, last_notification_sent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const insertSubtask = db.prepare(
      `INSERT INTO subtasks (todo_id, title, completed, position)
       VALUES (?, ?, ?, ?)`,
    );

    const findTagByNameCI = db.prepare(
      'SELECT id FROM tags WHERE user_id = ? AND lower(name) = lower(?)',
    );

    const insertTag = db.prepare(
      'INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)',
    );

    const linkTodoTag = db.prepare(
      'INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)',
    );

    const run = db.transaction((payload: TodoExportItem[]) => {
      payload.forEach((item) => {
        const todoResult = insertTodo.run(
          userId,
          item.title,
          item.completed ? 1 : 0,
          item.due_date,
          item.priority,
          item.is_recurring ? 1 : 0,
          item.recurrence_pattern,
          item.reminder_minutes,
          item.created_at,
          null,
          null,
        );

        const todoId = todoResult.lastInsertRowid as number;

        item.subtasks.forEach((subtask, index) => {
          insertSubtask.run(
            todoId,
            subtask.title,
            subtask.completed ? 1 : 0,
            Number.isInteger(subtask.position) ? subtask.position : index,
          );
        });

        item.tags.forEach((tag) => {
          const existing = findTagByNameCI.get(userId, tag.name) as
            | { id: number }
            | undefined;
          const tagId = existing
            ? (tagsReused++, existing.id)
            : (tagsCreated++, insertTag.run(userId, tag.name, tag.color).lastInsertRowid as number);
          linkTodoTag.run(todoId, tagId);
        });
      });
    });

    run(items);

    return {
      imported: items.length,
      tagsCreated,
      tagsReused,
    };
  },
};

// ─── subtaskDB ────────────────────────────────────────────────────────────────

export const subtaskDB = {
  findByTodoId(todoId: number): Subtask[] {
    const rows = db
      .prepare('SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position ASC')
      .all(todoId) as Record<string, unknown>[];
    return rows.map(rawToSubtask);
  },

  findById(id: number): Subtask | undefined {
    const row = db
      .prepare('SELECT * FROM subtasks WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    return row ? rawToSubtask(row) : undefined;
  },

  create(data: { todo_id: number; title: string }): Subtask {
    const maxRow = db
      .prepare('SELECT COALESCE(MAX(position), -1) as max_pos FROM subtasks WHERE todo_id = ?')
      .get(data.todo_id) as { max_pos: number };
    const position = maxRow.max_pos + 1;
    const result = db
      .prepare('INSERT INTO subtasks (todo_id, title, position) VALUES (?, ?, ?)')
      .run(data.todo_id, data.title, position);
    return subtaskDB.findById(result.lastInsertRowid as number)!;
  },

  update(id: number, data: { title?: string; completed?: boolean }): Subtask | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.completed !== undefined) { fields.push('completed = ?'); values.push(data.completed ? 1 : 0); }

    if (fields.length === 0) return subtaskDB.findById(id);

    values.push(id);
    db.prepare(`UPDATE subtasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return subtaskDB.findById(id);
  },

  delete(id: number): void {
    db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
  },
};

// ─── tagDB ────────────────────────────────────────────────────────────────────

export const tagDB = {
  findAllByUser(userId: number): Tag[] {
    return db
      .prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC')
      .all(userId) as Tag[];
  },

  findById(id: number, userId: number): Tag | undefined {
    return db
      .prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?')
      .get(id, userId) as Tag | undefined;
  },

  findByTodoId(todoId: number): Tag[] {
    return db
      .prepare(
        `SELECT t.* FROM tags t
         JOIN todo_tags tt ON tt.tag_id = t.id
         WHERE tt.todo_id = ?`,
      )
      .all(todoId) as Tag[];
  },

  create(data: { user_id: number; name: string; color?: string }): Tag {
    const result = db
      .prepare('INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)')
      .run(data.user_id, data.name, data.color ?? '#3B82F6');
    return tagDB.findById(result.lastInsertRowid as number, data.user_id)!;
  },

  update(id: number, userId: number, data: { name?: string; color?: string }): Tag | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }

    if (fields.length === 0) return tagDB.findById(id, userId);

    values.push(id, userId);
    db.prepare(`UPDATE tags SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
    return tagDB.findById(id, userId);
  },

  delete(id: number, userId: number): void {
    db.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').run(id, userId);
  },

  attachToTodo(todoId: number, tagId: number): void {
    db.prepare('INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)').run(todoId, tagId);
  },

  detachFromTodo(todoId: number, tagId: number): void {
    db.prepare('DELETE FROM todo_tags WHERE todo_id = ? AND tag_id = ?').run(todoId, tagId);
  },

  findByNameCaseInsensitive(userId: number, name: string): Tag | undefined {
    return db
      .prepare('SELECT * FROM tags WHERE user_id = ? AND lower(name) = lower(?)')
      .get(userId, name) as Tag | undefined;
  },

  getTagIdsForTodo(todoId: number): number[] {
    const rows = db
      .prepare('SELECT tag_id FROM todo_tags WHERE todo_id = ?')
      .all(todoId) as { tag_id: number }[];
    return rows.map(r => r.tag_id);
  },

  setTodoTags(todoId: number, tagIds: number[]): void {
    db.prepare('DELETE FROM todo_tags WHERE todo_id = ?').run(todoId);
    if (tagIds.length > 0) {
      const stmt = db.prepare('INSERT INTO todo_tags (todo_id, tag_id) VALUES (?, ?)');
      for (const tagId of tagIds) {
        stmt.run(todoId, tagId);
      }
    }
  },
};

// ─── templateDB ───────────────────────────────────────────────────────────────

export const templateDB = {
  findAllByUser(userId: number): Template[] {
    const rows = db
      .prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Record<string, unknown>[];
    return rows.map(rawToTemplate);
  },

  findById(id: number, userId: number): Template | undefined {
    const row = db
      .prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?')
      .get(id, userId) as Record<string, unknown> | undefined;
    return row ? rawToTemplate(row) : undefined;
  },

  create(data: {
    user_id: number;
    name: string;
    description?: string | null;
    category?: string | null;
    title_template: string;
    priority?: Priority;
    is_recurring?: boolean;
    recurrence_pattern?: RecurrencePattern | null;
    reminder_minutes?: number | null;
    due_date_offset_minutes?: number | null;
    subtasks_json?: string | null;
  }): Template {
    const result = db
      .prepare(
        `INSERT INTO templates
         (user_id, name, description, category, title_template, priority, is_recurring, recurrence_pattern, reminder_minutes, due_date_offset_minutes, subtasks_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        data.user_id,
        data.name,
        data.description ?? null,
        data.category ?? null,
        data.title_template,
        data.priority ?? 'medium',
        data.is_recurring ? 1 : 0,
        data.recurrence_pattern ?? null,
        data.reminder_minutes ?? null,
        data.due_date_offset_minutes ?? null,
        data.subtasks_json ?? null,
      );
    return templateDB.findById(result.lastInsertRowid as number, data.user_id)!;
  },

  update(
    id: number,
    userId: number,
    data: Partial<Omit<Template, 'id' | 'user_id' | 'created_at'>>,
  ): Template | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
    if (data.title_template !== undefined) { fields.push('title_template = ?'); values.push(data.title_template); }
    if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority); }
    if (data.is_recurring !== undefined) { fields.push('is_recurring = ?'); values.push(data.is_recurring ? 1 : 0); }
    if (data.recurrence_pattern !== undefined) { fields.push('recurrence_pattern = ?'); values.push(data.recurrence_pattern); }
    if (data.reminder_minutes !== undefined) { fields.push('reminder_minutes = ?'); values.push(data.reminder_minutes); }
    if (data.due_date_offset_minutes !== undefined) { fields.push('due_date_offset_minutes = ?'); values.push(data.due_date_offset_minutes); }
    if (data.subtasks_json !== undefined) { fields.push('subtasks_json = ?'); values.push(data.subtasks_json); }

    if (fields.length === 0) return templateDB.findById(id, userId);

    values.push(id, userId);
    db.prepare(`UPDATE templates SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
    return templateDB.findById(id, userId);
  },

  delete(id: number, userId: number): void {
    db.prepare('DELETE FROM templates WHERE id = ? AND user_id = ?').run(id, userId);
  },
};

// ─── holidayDB ────────────────────────────────────────────────────────────────

export const holidayDB = {
  findAll(): Holiday[] {
    return db.prepare('SELECT * FROM holidays ORDER BY date ASC').all() as Holiday[];
  },

  findByMonth(year: number, month: number): Holiday[] {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return db
      .prepare("SELECT * FROM holidays WHERE date LIKE ? ORDER BY date ASC")
      .all(`${prefix}%`) as Holiday[];
  },

  upsert(date: string, name: string): void {
    db.prepare('INSERT OR REPLACE INTO holidays (date, name) VALUES (?, ?)').run(date, name);
  },
};

export default db;
