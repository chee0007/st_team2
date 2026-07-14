import { type Priority, type RecurrencePattern, type Tag } from "@/lib/db";

const PRIORITY_STYLES: Record<Priority, string> = {
  high: "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5] dark:bg-[#7F1D1D]/40 dark:text-[#F87171] dark:border-[#B91C1C]",
  medium:
    "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D] dark:bg-[#78350F]/40 dark:text-[#FBBF24] dark:border-[#B45309]",
  low: "bg-[#DBEAFE] text-[#1E3A8A] border-[#93C5FD] dark:bg-[#1E3A8A]/40 dark:text-[#60A5FA] dark:border-[#1D4ED8]",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const RECURRENCE_LABELS: Record<RecurrencePattern, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

function formatReminder(minutes: number): string {
  if (minutes % 10080 === 0) {
    return `${minutes / 10080}w`;
  }
  if (minutes % 1440 === 0) {
    return `${minutes / 1440}d`;
  }
  if (minutes % 60 === 0) {
    return `${minutes / 60}h`;
  }
  return `${minutes}m`;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[priority]}`}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function RecurrenceBadge({
  isRecurring,
  recurrencePattern,
}: {
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern | null;
}) {
  if (!isRecurring || !recurrencePattern) {
    return null;
  }

  return (
    <span className="inline-flex items-center rounded-full border border-violet-300 bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 dark:border-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
      {`Recurs: ${RECURRENCE_LABELS[recurrencePattern]}`}
    </span>
  );
}

export function ReminderBadge({ minutes }: { minutes: number | null }) {
  if (!minutes) {
    return null;
  }

  return (
    <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
      {`Reminder: ${formatReminder(minutes)}`}
    </span>
  );
}

export function TagBadge({ tag }: { tag: Pick<Tag, "name" | "color"> }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-xs font-medium dark:bg-slate-800"
      style={{ borderColor: tag.color, color: tag.color }}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: tag.color }}
      />
      {tag.name}
    </span>
  );
}
