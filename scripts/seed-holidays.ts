#!/usr/bin/env tsx
// scripts/seed-holidays.ts
// Seeds Singapore public holidays into the local todos.db.
// Run: npx tsx scripts/seed-holidays.ts

import path from 'path';
import Database from 'better-sqlite3';

const DB_PATH = path.join(process.cwd(), 'todos.db');
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
`);

const upsert = db.prepare('INSERT OR REPLACE INTO holidays (date, name) VALUES (?, ?)');

const HOLIDAYS: [string, string][] = [
  // ── 2025 ──────────────────────────────────────────────────────────────────
  ['2025-01-01', "New Year's Day"],
  ['2025-01-29', 'Chinese New Year (Day 1)'],
  ['2025-01-30', 'Chinese New Year (Day 2)'],
  ['2025-03-31', 'Hari Raya Puasa'],
  ['2025-04-18', 'Good Friday'],
  ['2025-05-01', 'Labour Day'],
  ['2025-05-12', 'Vesak Day'],
  ['2025-06-06', 'Hari Raya Haji'],
  ['2025-08-09', 'National Day'],
  ['2025-10-20', 'Deepavali'],
  ['2025-12-25', 'Christmas Day'],

  // ── 2026 ──────────────────────────────────────────────────────────────────
  ['2026-01-01', "New Year's Day"],
  ['2026-02-17', 'Chinese New Year (Day 1)'],
  ['2026-02-18', 'Chinese New Year (Day 2)'],
  ['2026-03-20', 'Hari Raya Puasa'],
  ['2026-04-03', 'Good Friday'],
  ['2026-05-01', 'Labour Day'],
  ['2026-05-27', 'Hari Raya Haji'],
  ['2026-05-30', 'Vesak Day'],
  ['2026-08-10', 'National Day'],
  ['2026-11-09', 'Deepavali'],
  ['2026-12-25', 'Christmas Day'],

  // ── 2027 ──────────────────────────────────────────────────────────────────
  ['2027-01-01', "New Year's Day"],
  ['2027-02-06', 'Chinese New Year (Day 1)'],
  ['2027-02-08', 'Chinese New Year (Day 2)'],
  ['2027-03-09', 'Hari Raya Puasa'],
  ['2027-03-26', 'Good Friday'],
  ['2027-05-01', 'Labour Day'],
  ['2027-05-17', 'Hari Raya Haji'],
  ['2027-05-19', 'Vesak Day'],
  ['2027-08-09', 'National Day'],
  ['2027-10-29', 'Deepavali'],
  ['2027-12-25', 'Christmas Day'],
];

const insertAll = db.transaction(() => {
  for (const [date, name] of HOLIDAYS) {
    upsert.run(date, name);
  }
});

insertAll();
console.log(`✓ Seeded ${HOLIDAYS.length} Singapore public holidays (2025–2027).`);
db.close();
