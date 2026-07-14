/**
 * Reminder constants that are safe to import in both server and client code.
 * Values only — no Node.js dependencies.
 */

export type ReminderMinutes = 15 | 30 | 60 | 120 | 1440 | 2880 | 10080;

/** Human-readable abbreviation for each reminder preset. */
export const REMINDER_LABELS: Record<ReminderMinutes, string> = {
  15:    '15m',
  30:    '30m',
  60:    '1h',
  120:   '2h',
  1440:  '1d',
  2880:  '2d',
  10080: '1w',
};

/** Dropdown options in display order. */
export const REMINDER_OPTIONS: { value: ReminderMinutes; label: string }[] = [
  { value: 15,    label: '15 minutes before' },
  { value: 30,    label: '30 minutes before' },
  { value: 60,    label: '1 hour before' },
  { value: 120,   label: '2 hours before' },
  { value: 1440,  label: '1 day before' },
  { value: 2880,  label: '2 days before' },
  { value: 10080, label: '1 week before' },
];
