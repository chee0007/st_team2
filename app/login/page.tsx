'use client';

import { useState } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    const name = username.trim();
    if (!name) { setError('Username is required'); return; }
    setLoading(true);
    setError('');
    try {
      const optRes = await fetch('/api/auth/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name }),
      });
      if (!optRes.ok) {
        const d = await optRes.json();
        setError(d.error ?? 'Failed to start registration');
        return;
      }
      const options = await optRes.json();
      const attResp = await startRegistration({ optionsJSON: options });

      const verRes = await fetch('/api/auth/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, response: attResp }),
      });
      const verData = await verRes.json();
      if (verData.verified) {
        router.push('/');
      } else {
        setError(verData.error ?? 'Registration failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    const name = username.trim();
    if (!name) { setError('Username is required'); return; }
    setLoading(true);
    setError('');
    try {
      const optRes = await fetch('/api/auth/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name }),
      });
      if (!optRes.ok) {
        const d = await optRes.json();
        setError(d.error ?? 'Failed to start login');
        return;
      }
      const options = await optRes.json();
      const assResp = await startAuthentication({ optionsJSON: options });

      const verRes = await fetch('/api/auth/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, response: assResp }),
      });
      const verData = await verRes.json();
      if (verData.verified) {
        router.push('/');
      } else {
        setError(verData.error ?? 'Login failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-sm w-full mx-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          Todo App
        </h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <input
              data-testid="username-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Enter username"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         text-gray-900 dark:text-white bg-white dark:bg-gray-700
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm" role="alert">{error}</p>
          )}

          <button
            data-testid="register-button"
            onClick={handleRegister}
            disabled={loading}
            className="w-full py-2 px-4 bg-green-500 text-white rounded-lg font-medium
                       hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Working…' : 'Register (New User)'}
          </button>

          <button
            data-testid="login-button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-medium
                       hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Working…' : 'Login (Existing User)'}
          </button>
        </div>
      </div>
    </div>
  );
}
