'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Main todo page — stub placeholder.
 * Full implementation is Person 2's scope (Features 01, 02, 03).
 */
export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.push('/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setUsername(data.username);
      });
  }, [router]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (!username) return null;

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Todo App</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Hi, {username}</span>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
      <p className="text-gray-500">Todos will appear here. (Person 2 implements this.)</p>
    </main>
  );
}
