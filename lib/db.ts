import Database from 'better-sqlite3';
import path from 'path';

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

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
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

// ──────────────────────────────────────────────────────────────────────────────
// Database init
// ──────────────────────────────────────────────────────────────────────────────

const DB_PATH = path.join(process.cwd(), 'todos.db');

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database) {
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

    CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

    CREATE TABLE IF NOT EXISTS todo_tags (
      todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (todo_id, tag_id)
    );

    CREATE INDEX IF NOT EXISTS idx_todo_tags_tag_id ON todo_tags(tag_id);

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
}

// ──────────────────────────────────────────────────────────────────────────────
// User DB
// ──────────────────────────────────────────────────────────────────────────────

export const userDB = {
  findByUsername(username: string): User | undefined {
    return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
  },
  findById(id: number): User | undefined {
    return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  },
  create(username: string): User {
    const info = getDb().prepare('INSERT INTO users (username) VALUES (?)').run(username);
    return getDb().prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid) as User;
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Authenticator DB
// ──────────────────────────────────────────────────────────────────────────────

export const authenticatorDB = {
  findByCredentialId(credentialId: string): Authenticator | undefined {
    return getDb()
      .prepare('SELECT * FROM authenticators WHERE credential_id = ?')
      .get(credentialId) as Authenticator | undefined;
  },
  findAllByUser(userId: number): Authenticator[] {
    return getDb()
      .prepare('SELECT * FROM authenticators WHERE user_id = ?')
      .all(userId) as Authenticator[];
  },
  create(userId: number, credentialId: string, publicKey: Buffer, counter: number): Authenticator {
    const info = getDb()
      .prepare(
        'INSERT INTO authenticators (user_id, credential_id, credential_public_key, counter) VALUES (?, ?, ?, ?)'
      )
      .run(userId, credentialId, publicKey, counter);
    return getDb()
      .prepare('SELECT * FROM authenticators WHERE id = ?')
      .get(info.lastInsertRowid) as Authenticator;
  },
  updateCounter(id: number, counter: number): void {
    getDb().prepare('UPDATE authenticators SET counter = ? WHERE id = ?').run(counter, id);
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Todo DB
// ──────────────────────────────────────────────────────────────────────────────

function mapTodo(row: Record<string, unknown>): Todo {
  return {
    ...(row as unknown as Todo),
    completed: Boolean(row.completed),
    is_recurring: Boolean(row.is_recurring),
  };
}

export const todoDB = {
  findAllByUser(userId: number): Todo[] {
    const rows = getDb()
      .prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Record<string, unknown>[];
    return rows.map(mapTodo);
  },
  findById(id: number, userId: number): Todo | undefined {
    const row = getDb()
      .prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?')
      .get(id, userId) as Record<string, unknown> | undefined;
    return row ? mapTodo(row) : undefined;
  },
  create(
    userId: number,
    data: {
      title: string;
      due_date?: string | null;
      priority?: Priority;
      is_recurring?: boolean;
      recurrence_pattern?: RecurrencePattern | null;
      reminder_minutes?: number | null;
    }
  ): Todo {
    const info = getDb()
      .prepare(
        `INSERT INTO todos (user_id, title, due_date, priority, is_recurring, recurrence_pattern, reminder_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        userId,
        data.title,
        data.due_date ?? null,
        data.priority ?? 'medium',
        data.is_recurring ? 1 : 0,
        data.recurrence_pattern ?? null,
        data.reminder_minutes ?? null
      );
    return mapTodo(
      getDb().prepare('SELECT * FROM todos WHERE id = ?').get(info.lastInsertRowid) as Record<string, unknown>
    );
  },
  update(
    id: number,
    userId: number,
    data: Partial<{
      title: string;
      completed: boolean;
      due_date: string | null;
      priority: Priority;
      is_recurring: boolean;
      recurrence_pattern: RecurrencePattern | null;
      reminder_minutes: number | null;
      last_notification_sent: string | null;
    }>
  ): Todo | undefined {
    const existing = todoDB.findById(id, userId);
    if (!existing) return undefined;
    const merged = { ...existing, ...data };
    getDb()
      .prepare(
        `UPDATE todos SET
          title = ?, completed = ?, due_date = ?, priority = ?,
          is_recurring = ?, recurrence_pattern = ?,
          reminder_minutes = ?, last_notification_sent = ?,
          updated_at = datetime('now')
         WHERE id = ? AND user_id = ?`
      )
      .run(
        merged.title,
        merged.completed ? 1 : 0,
        merged.due_date,
        merged.priority,
        merged.is_recurring ? 1 : 0,
        merged.recurrence_pattern,
        merged.reminder_minutes,
        merged.last_notification_sent,
        id,
        userId
      );
    return todoDB.findById(id, userId);
  },
  delete(id: number, userId: number): boolean {
    const info = getDb().prepare('DELETE FROM todos WHERE id = ? AND user_id = ?').run(id, userId);
    return info.changes > 0;
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Subtask DB
// ──────────────────────────────────────────────────────────────────────────────

export const subtaskDB = {
  findByTodoId(todoId: number): Subtask[] {
    return getDb()
      .prepare('SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position ASC')
      .all(todoId) as Subtask[];
  },
  findById(id: number): Subtask | undefined {
    return getDb().prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as Subtask | undefined;
  },
  create(todoId: number, title: string, position: number): Subtask {
    const info = getDb()
      .prepare('INSERT INTO subtasks (todo_id, title, position) VALUES (?, ?, ?)')
      .run(todoId, title, position);
    return getDb().prepare('SELECT * FROM subtasks WHERE id = ?').get(info.lastInsertRowid) as Subtask;
  },
  update(id: number, data: { title?: string; completed?: boolean }): Subtask | undefined {
    const existing = subtaskDB.findById(id);
    if (!existing) return undefined;
    const merged = { ...existing, ...data };
    getDb()
      .prepare('UPDATE subtasks SET title = ?, completed = ? WHERE id = ?')
      .run(merged.title, merged.completed ? 1 : 0, id);
    return subtaskDB.findById(id);
  },
  delete(id: number): boolean {
    const info = getDb().prepare('DELETE FROM subtasks WHERE id = ?').run(id);
    return info.changes > 0;
  },
  maxPosition(todoId: number): number {
    const row = getDb()
      .prepare('SELECT MAX(position) as maxPos FROM subtasks WHERE todo_id = ?')
      .get(todoId) as { maxPos: number | null };
    return row.maxPos ?? -1;
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Tag DB
// ──────────────────────────────────────────────────────────────────────────────

export const tagDB = {
  findAllByUser(userId: number): Tag[] {
    return getDb()
      .prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC')
      .all(userId) as Tag[];
  },
  findById(id: number, userId: number): Tag | undefined {
    return getDb()
      .prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?')
      .get(id, userId) as Tag | undefined;
  },
  create(userId: number, input: CreateTagInput): Tag {
    const info = getDb()
      .prepare('INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)')
      .run(userId, input.name, input.color ?? '#3B82F6');
    return getDb().prepare('SELECT * FROM tags WHERE id = ?').get(info.lastInsertRowid) as Tag;
  },
  update(id: number, userId: number, input: UpdateTagInput): Tag | undefined {
    const existing = tagDB.findById(id, userId);
    if (!existing) return undefined;
    const merged = { ...existing, ...input };
    getDb()
      .prepare('UPDATE tags SET name = ?, color = ? WHERE id = ? AND user_id = ?')
      .run(merged.name, merged.color, id, userId);
    return tagDB.findById(id, userId);
  },
  delete(id: number, userId: number): boolean {
    const info = getDb().prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').run(id, userId);
    return info.changes > 0;
  },
  attachToTodo(todoId: number, tagId: number, userId: number): void {
    // Verify the tag belongs to this user
    const tag = getDb().prepare('SELECT id FROM tags WHERE id = ? AND user_id = ?').get(tagId, userId);
    if (!tag) return;
    try {
      getDb()
        .prepare('INSERT INTO todo_tags (todo_id, tag_id) VALUES (?, ?)')
        .run(todoId, tagId);
    } catch {
      // Duplicate — idempotent no-op
    }
  },
  detachFromTodo(todoId: number, tagId: number, userId: number): void {
    const tag = getDb().prepare('SELECT id FROM tags WHERE id = ? AND user_id = ?').get(tagId, userId);
    if (!tag) return;
    getDb().prepare('DELETE FROM todo_tags WHERE todo_id = ? AND tag_id = ?').run(todoId, tagId);
  },
  findByTodoId(todoId: number): Tag[] {
    return getDb()
      .prepare(
        `SELECT t.* FROM tags t
         INNER JOIN todo_tags tt ON tt.tag_id = t.id
         WHERE tt.todo_id = ?
         ORDER BY t.name ASC`
      )
      .all(todoId) as Tag[];
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Template DB
// ──────────────────────────────────────────────────────────────────────────────

export const templateDB = {
  findAllByUser(userId: number): Template[] {
    return getDb()
      .prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Template[];
  },
  findById(id: number, userId: number): Template | undefined {
    return getDb()
      .prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?')
      .get(id, userId) as Template | undefined;
  },
  create(
    userId: number,
    data: Omit<Template, 'id' | 'user_id' | 'created_at'>
  ): Template {
    const info = getDb()
      .prepare(
        `INSERT INTO templates (user_id, name, description, category, title_template, priority,
          is_recurring, recurrence_pattern, reminder_minutes, due_date_offset_minutes, subtasks_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        userId,
        data.name,
        data.description ?? null,
        data.category ?? null,
        data.title_template,
        data.priority,
        data.is_recurring ? 1 : 0,
        data.recurrence_pattern ?? null,
        data.reminder_minutes ?? null,
        data.due_date_offset_minutes ?? null,
        data.subtasks_json ?? null
      );
    return getDb()
      .prepare('SELECT * FROM templates WHERE id = ?')
      .get(info.lastInsertRowid) as Template;
  },
  update(id: number, userId: number, data: Partial<Omit<Template, 'id' | 'user_id' | 'created_at'>>): Template | undefined {
    const existing = templateDB.findById(id, userId);
    if (!existing) return undefined;
    const merged = { ...existing, ...data };
    getDb()
      .prepare(
        `UPDATE templates SET name=?, description=?, category=?, title_template=?, priority=?,
          is_recurring=?, recurrence_pattern=?, reminder_minutes=?, due_date_offset_minutes=?, subtasks_json=?
         WHERE id=? AND user_id=?`
      )
      .run(
        merged.name,
        merged.description ?? null,
        merged.category ?? null,
        merged.title_template,
        merged.priority,
        merged.is_recurring ? 1 : 0,
        merged.recurrence_pattern ?? null,
        merged.reminder_minutes ?? null,
        merged.due_date_offset_minutes ?? null,
        merged.subtasks_json ?? null,
        id,
        userId
      );
    return templateDB.findById(id, userId);
  },
  delete(id: number, userId: number): boolean {
    const info = getDb().prepare('DELETE FROM templates WHERE id = ? AND user_id = ?').run(id, userId);
    return info.changes > 0;
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Holiday DB
// ──────────────────────────────────────────────────────────────────────────────

export const holidayDB = {
  findAll(): Holiday[] {
    return getDb().prepare('SELECT * FROM holidays ORDER BY date ASC').all() as Holiday[];
  },
  upsert(date: string, name: string): void {
    getDb()
      .prepare(
        'INSERT INTO holidays (date, name) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET name=excluded.name'
      )
      .run(date, name);
  },
};
