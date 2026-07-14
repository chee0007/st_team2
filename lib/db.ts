import Database from 'better-sqlite3';
import path from 'path';

// ── Types ──────────────────────────────────────────────────────────────────────

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
  date: string; // YYYY-MM-DD, Asia/Singapore
  name: string;
}

export interface CalendarDay {
  date: string;         // YYYY-MM-DD
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isWeekend: boolean;
}

// ── DB singleton ───────────────────────────────────────────────────────────────

const DB_PATH = path.join(process.cwd(), 'todos.db');

// Survive Next.js hot-reload in dev without re-opening the file each request
const g = globalThis as typeof globalThis & { _db?: Database.Database };

function getDb(): Database.Database {
  if (g._db) return g._db;
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  g._db = db;
  return db;
}

function initSchema(db: Database.Database): void {
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
}

// ── Row mappers ────────────────────────────────────────────────────────────────

type RawRow = Record<string, unknown>;

function mapTodo(row: RawRow): Todo {
  return {
    ...(row as unknown as Todo),
    completed: Boolean(row.completed),
    is_recurring: Boolean(row.is_recurring),
  };
}

function mapSubtask(row: RawRow): Subtask {
  return { ...(row as unknown as Subtask), completed: Boolean(row.completed) };
}

// ── userDB ─────────────────────────────────────────────────────────────────────

export const userDB = {
  findByUsername(username: string): User | null {
    return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username) as User | null;
  },
  findById(id: number): User | null {
    return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as User | null;
  },
  create(username: string): User {
    const info = getDb().prepare('INSERT INTO users (username) VALUES (?)').run(username);
    return getDb().prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid) as User;
  },
};

// ── authenticatorDB ────────────────────────────────────────────────────────────

export const authenticatorDB = {
  findByCredentialId(credentialId: string): Authenticator | null {
    return getDb()
      .prepare('SELECT * FROM authenticators WHERE credential_id = ?')
      .get(credentialId) as Authenticator | null;
  },
  findByUserId(userId: number): Authenticator[] {
    return getDb()
      .prepare('SELECT * FROM authenticators WHERE user_id = ?')
      .all(userId) as Authenticator[];
  },
  create(data: Omit<Authenticator, 'id' | 'created_at'>): Authenticator {
    const info = getDb()
      .prepare(
        'INSERT INTO authenticators (user_id, credential_id, credential_public_key, counter) VALUES (?, ?, ?, ?)'
      )
      .run(data.user_id, data.credential_id, data.credential_public_key, data.counter);
    return getDb()
      .prepare('SELECT * FROM authenticators WHERE id = ?')
      .get(info.lastInsertRowid) as Authenticator;
  },
  updateCounter(id: number, counter: number): void {
    getDb().prepare('UPDATE authenticators SET counter = ? WHERE id = ?').run(counter, id);
  },
};

// ── todoDB ─────────────────────────────────────────────────────────────────────

export const todoDB = {
  findByUserId(userId: number): Todo[] {
    const rows = getDb()
      .prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as RawRow[];
    return rows.map(mapTodo);
  },
  findById(id: number, userId: number): Todo | null {
    const row = getDb()
      .prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?')
      .get(id, userId) as RawRow | null;
    return row ? mapTodo(row) : null;
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
    const info = getDb()
      .prepare(
        `INSERT INTO todos (user_id, title, due_date, priority, is_recurring, recurrence_pattern, reminder_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.user_id,
        data.title,
        data.due_date ?? null,
        data.priority ?? 'medium',
        data.is_recurring ? 1 : 0,
        data.recurrence_pattern ?? null,
        data.reminder_minutes ?? null
      );
    return todoDB.findById(info.lastInsertRowid as number, data.user_id)!;
  },
  update(
    id: number,
    userId: number,
    data: Partial<
      Pick<
        Todo,
        | 'title'
        | 'completed'
        | 'due_date'
        | 'priority'
        | 'is_recurring'
        | 'recurrence_pattern'
        | 'reminder_minutes'
        | 'last_notification_sent'
      >
    >
  ): Todo | null {
    const fields: string[] = [];
    const params: unknown[] = [];
    const mapping: Record<string, unknown> = data as Record<string, unknown>;

    for (const key of Object.keys(mapping)) {
      fields.push(`${key} = ?`);
      const v = mapping[key];
      params.push(key === 'completed' || key === 'is_recurring' ? (v ? 1 : 0) : v);
    }
    if (fields.length === 0) return todoDB.findById(id, userId);

    fields.push("updated_at = datetime('now')");
    params.push(id, userId);
    getDb()
      .prepare(`UPDATE todos SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`)
      .run(...params);
    return todoDB.findById(id, userId);
  },
  delete(id: number, userId: number): void {
    getDb().prepare('DELETE FROM todos WHERE id = ? AND user_id = ?').run(id, userId);
  },
};

// ── subtaskDB ──────────────────────────────────────────────────────────────────

export const subtaskDB = {
  findByTodoId(todoId: number): Subtask[] {
    return (
      getDb()
        .prepare('SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position ASC')
        .all(todoId) as RawRow[]
    ).map(mapSubtask);
  },
  findById(id: number): Subtask | null {
    const row = getDb().prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as RawRow | null;
    return row ? mapSubtask(row) : null;
  },
  maxPosition(todoId: number): number {
    const r = getDb()
      .prepare('SELECT MAX(position) as p FROM subtasks WHERE todo_id = ?')
      .get(todoId) as { p: number | null };
    return r.p ?? -1;
  },
  create(todoId: number, title: string, position: number): Subtask {
    const info = getDb()
      .prepare('INSERT INTO subtasks (todo_id, title, position) VALUES (?, ?, ?)')
      .run(todoId, title, position);
    return subtaskDB.findById(info.lastInsertRowid as number)!;
  },
  update(id: number, data: Partial<Pick<Subtask, 'title' | 'completed'>>): Subtask | null {
    const fields: string[] = [];
    const params: unknown[] = [];
    if ('title' in data) { fields.push('title = ?'); params.push(data.title); }
    if ('completed' in data) { fields.push('completed = ?'); params.push(data.completed ? 1 : 0); }
    if (fields.length === 0) return subtaskDB.findById(id);
    params.push(id);
    getDb().prepare(`UPDATE subtasks SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return subtaskDB.findById(id);
  },
  delete(id: number): void {
    getDb().prepare('DELETE FROM subtasks WHERE id = ?').run(id);
  },
};

// ── tagDB ──────────────────────────────────────────────────────────────────────

export const tagDB = {
  findByUserId(userId: number): Tag[] {
    return getDb()
      .prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC')
      .all(userId) as Tag[];
  },
  findById(id: number, userId: number): Tag | null {
    return getDb()
      .prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?')
      .get(id, userId) as Tag | null;
  },
  findByNameCaseInsensitive(userId: number, name: string): Tag | null {
    return getDb()
      .prepare('SELECT * FROM tags WHERE user_id = ? AND lower(name) = lower(?)')
      .get(userId, name) as Tag | null;
  },
  findByTodoId(todoId: number): Tag[] {
    return getDb()
      .prepare(
        `SELECT tags.* FROM tags
         JOIN todo_tags ON tags.id = todo_tags.tag_id
         WHERE todo_tags.todo_id = ?`
      )
      .all(todoId) as Tag[];
  },
  create(userId: number, name: string, color: string): Tag {
    const info = getDb()
      .prepare('INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)')
      .run(userId, name, color);
    return getDb()
      .prepare('SELECT * FROM tags WHERE id = ?')
      .get(info.lastInsertRowid) as Tag;
  },
  update(id: number, userId: number, data: Partial<Pick<Tag, 'name' | 'color'>>): Tag | null {
    const fields: string[] = [];
    const params: unknown[] = [];
    if ('name' in data) { fields.push('name = ?'); params.push(data.name); }
    if ('color' in data) { fields.push('color = ?'); params.push(data.color); }
    if (fields.length === 0) return tagDB.findById(id, userId);
    params.push(id, userId);
    getDb()
      .prepare(`UPDATE tags SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`)
      .run(...params);
    return tagDB.findById(id, userId);
  },
  delete(id: number, userId: number): void {
    getDb().prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').run(id, userId);
  },
  attach(todoId: number, tagId: number): void {
    getDb()
      .prepare('INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)')
      .run(todoId, tagId);
  },
  detach(todoId: number, tagId: number): void {
    getDb()
      .prepare('DELETE FROM todo_tags WHERE todo_id = ? AND tag_id = ?')
      .run(todoId, tagId);
  },
};

// ── templateDB ─────────────────────────────────────────────────────────────────

export const templateDB = {
  findByUserId(userId: number): Template[] {
    return getDb()
      .prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY name ASC')
      .all(userId) as Template[];
  },
  findById(id: number, userId: number): Template | null {
    return getDb()
      .prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?')
      .get(id, userId) as Template | null;
  },
  create(data: Omit<Template, 'id' | 'created_at'>): Template {
    const info = getDb()
      .prepare(
        `INSERT INTO templates
           (user_id, name, description, category, title_template, priority,
            is_recurring, recurrence_pattern, reminder_minutes,
            due_date_offset_minutes, subtasks_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.user_id,
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
    return templateDB.findById(info.lastInsertRowid as number, data.user_id)!;
  },
  update(
    id: number,
    userId: number,
    data: Partial<Omit<Template, 'id' | 'user_id' | 'created_at'>>
  ): Template | null {
    const fields: string[] = [];
    const params: unknown[] = [];
    const map = data as Record<string, unknown>;
    for (const key of Object.keys(map)) {
      fields.push(`${key} = ?`);
      params.push(key === 'is_recurring' ? (map[key] ? 1 : 0) : map[key]);
    }
    if (fields.length === 0) return templateDB.findById(id, userId);
    params.push(id, userId);
    getDb()
      .prepare(`UPDATE templates SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`)
      .run(...params);
    return templateDB.findById(id, userId);
  },
  delete(id: number, userId: number): void {
    getDb().prepare('DELETE FROM templates WHERE id = ? AND user_id = ?').run(id, userId);
  },
};

// ── holidayDB ──────────────────────────────────────────────────────────────────

export const holidayDB = {
  findAll(): Holiday[] {
    return getDb()
      .prepare('SELECT * FROM holidays ORDER BY date ASC')
      .all() as Holiday[];
  },
  /**
   * Returns holidays in the visible calendar range for the given month,
   * including ~7 days padding on each side for leading/trailing grid cells.
   */
  findByMonth(year: number, month: number): Holiday[] {
    const pm = month === 1 ? 12 : month - 1;
    const py = month === 1 ? year - 1 : year;
    const nm = month === 12 ? 1 : month + 1;
    const ny = month === 12 ? year + 1 : year;

    const from = `${py}-${String(pm).padStart(2, '0')}-24`;
    const to   = `${ny}-${String(nm).padStart(2, '0')}-07`;

    return getDb()
      .prepare('SELECT * FROM holidays WHERE date >= ? AND date <= ? ORDER BY date ASC')
      .all(from, to) as Holiday[];
  },
  upsert(date: string, name: string): void {
    getDb()
      .prepare('INSERT OR REPLACE INTO holidays (date, name) VALUES (?, ?)')
      .run(date, name);
  },
};
