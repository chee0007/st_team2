# Recurring Todos Implementation (PRP-03)

This implements the recurring todos feature as specified in `PRPs/03-recurring-todos.md`.

## What's Implemented

### Core Files

- **`src/lib/timezone.ts`** - Singapore timezone utilities for date parsing/formatting
- **`src/lib/recurrence.ts`** - Core recurrence calculation logic (`calculateNextDueDate`)
- **`tests/recurrence.test.ts`** - Unit tests for all recurrence patterns

### Recurrence Patterns Supported

- **Daily**: adds 1 day
- **Weekly**: adds 7 days  
- **Monthly**: same day next month (clamps to last day if needed, e.g., Jan 31 → Feb 28)
- **Yearly**: same date next year (handles leap year Feb 29 → Feb 28)

### Key Features

✅ Preserves time-of-day across all patterns  
✅ Handles month-end overflow (Jan 31 → Feb 28/29)  
✅ Handles leap year transitions (Feb 29 → Feb 28)  
✅ Singapore timezone-aware (all dates in SGT +08:00)

## Running Tests

```bash
# Install dependencies (without sudo)
npm install

# Run unit tests
npm test

# Watch mode
npm test -- --watch
```

## Test Coverage

All unit tests from PRP-03 specification:

- ✅ Daily: preserves time, adds 1 day
- ✅ Weekly: adds 7 days
- ✅ Monthly normal: same day next month
- ✅ Monthly overflow: Jan 31 → Feb 28
- ✅ Monthly leap year: Jan 31 → Feb 29 (2024)
- ✅ December → January year rollover
- ✅ Yearly normal: same date next year
- ✅ Yearly leap day overflow: Feb 29 → Feb 28

## Usage Example

```typescript
import { calculateNextDueDate } from './src/lib/recurrence';

// Daily recurrence
const next = calculateNextDueDate('2025-11-10T14:00', 'daily');
// → '2025-11-11T14:00:00+08:00'

// Monthly with overflow
const next = calculateNextDueDate('2025-01-31T09:00', 'monthly');
// → '2025-02-28T09:00:00+08:00'

// Yearly leap day
const next = calculateNextDueDate('2024-02-29T09:00', 'yearly');
// → '2025-02-28T09:00:00+08:00'
```

## Integration Points (Not Yet Implemented)

To integrate this into a Next.js app, you'll need:

1. **Database schema** - Add columns to `todos` table:
   ```sql
   is_recurring INTEGER NOT NULL DEFAULT 0
   recurrence_pattern TEXT  -- 'daily'|'weekly'|'monthly'|'yearly'
   ```

2. **API endpoint modification** - Update `PUT /api/todos/[id]` to create next instance on completion:
   ```typescript
   if (justCompleted && todo.is_recurring && todo.recurrence_pattern) {
     const nextDueDate = calculateNextDueDate(todo.due_date, todo.recurrence_pattern);
     // Create new todo with same title, priority, tags, reminder
   }
   ```

3. **UI components** - Add recurrence controls to todo form:
   - Checkbox: "Repeat"
   - Dropdown: Daily/Weekly/Monthly/Yearly
   - Badge: 🔄 pattern

## Dependencies Added

- `vitest` - Fast unit test runner
- `ts-node` - TypeScript execution
- `typescript` - TypeScript compiler

## File Structure

```
st_team2/
├── src/
│   └── lib/
│       ├── timezone.ts       # Singapore timezone helpers
│       └── recurrence.ts     # Recurrence calculation
├── tests/
│   └── recurrence.test.ts    # Unit tests
├── package.json              # Updated with test script
├── tsconfig.json             # TypeScript config
└── README_RECURRENCE.md      # This file
```

## Next Steps

To complete the full PRP-03 implementation:

1. Scaffold the Next.js project structure (if not already done)
2. Add database migrations for `is_recurring` and `recurrence_pattern` columns
3. Implement API endpoint changes in `app/api/todos/[id]/route.ts`
4. Create React components for recurrence UI
5. Add E2E tests with Playwright
6. Integrate with existing todo CRUD, priority, tags, and reminder features

## Notes

- All dates use Singapore timezone (SGT +08:00)
- Recurrence calculation is purely functional (no side effects)
- Month/year overflow is handled by clamping to last valid day
- Time-of-day is always preserved from the original due date
