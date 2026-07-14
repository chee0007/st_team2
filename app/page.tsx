'use client';

// app/page.tsx — todo list shell (PRP 01 slice will implement the full UI)
export default function HomePage() {
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Todos</h1>
          <a
            href="/calendar"
            className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors"
          >
            Calendar
          </a>
        </div>
        <p className="text-gray-400 text-sm text-center mt-20">
          Todo list coming soon — see <a href="/calendar" className="text-purple-500 underline">Calendar View</a>
        </p>
      </div>
    </div>
  );
}
