'use client';

import { useState, useEffect } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    fetch('/api/auth/me').then((res) => {
      if (res.ok) router.replace('/');
    });
  }, [router]);

  async function handleRegister() {
    const trimmed = username.trim();
    if (!trimmed) { setError('Username is required'); return; }

    setError(null);
    setLoading(true);

    try {
      const optionsRes = await fetch('/api/auth/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed }),
      });

      const optionsData = await optionsRes.json();
      if (!optionsRes.ok) {
        setError(optionsData.error ?? 'Registration failed');
        return;
      }

      let attestation;
      try {
        attestation = await startRegistration(optionsData);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'NotAllowedError') {
          setError('Registration cancelled. Try again when ready.');
        } else if (err instanceof Error) {
          setError(err.message.includes('supported')
            ? 'Your browser or device does not support passkeys.'
            : 'Registration failed. Please try again.');
        } else {
          setError('Registration failed. Please try again.');
        }
        return;
      }

      const verifyRes = await fetch('/api/auth/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed, response: attestation }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyData.error ?? 'Verification failed');
        return;
      }

      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    const trimmed = username.trim();
    if (!trimmed) { setError('Username is required'); return; }

    setError(null);
    setLoading(true);

    try {
      const optionsRes = await fetch('/api/auth/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed }),
      });

      const optionsData = await optionsRes.json();
      if (!optionsRes.ok) {
        setError(optionsData.error ?? 'Login failed');
        return;
      }

      let assertion;
      try {
        assertion = await startAuthentication(optionsData);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'NotAllowedError') {
          setError('Login cancelled. Try again when ready.');
        } else if (err instanceof Error) {
          setError(err.message.includes('supported')
            ? 'Your browser or device does not support passkeys.'
            : 'Login failed. Please try again.');
        } else {
          setError('Login failed. Please try again.');
        }
        return;
      }

      const verifyRes = await fetch('/api/auth/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed, response: assertion }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyData.error ?? 'Login failed');
        return;
      }

      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-center">Todo App</h1>
          <p className="text-center text-sm text-gray-500 mt-1">Sign in with your passkey</p>
        </div>

        <div className="space-y-3">
          <label htmlFor="username" className="block text-sm font-medium">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="your-username"
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400 text-center">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium
                       rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading…' : 'Login'}
          </button>
          <button
            onClick={handleRegister}
            disabled={loading}
            className="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300
                       dark:hover:bg-gray-600 font-medium rounded-lg transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading…' : 'Register'}
          </button>
        </div>

        <p className="text-xs text-center text-gray-400">
          Uses passkeys — no passwords needed.
        </p>
      </div>
    </div>
  );
}
