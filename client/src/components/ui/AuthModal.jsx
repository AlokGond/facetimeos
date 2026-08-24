'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * Sign-in gates room creation and joining, but only when there is an auth
 * project to sign in to. So this modal has to cope with Firebase not being
 * configured at all — in that case `login`/`signup`/`loginWithGoogle` throw, and
 * showing the form would just be a dead end. It explains how to enable accounts
 * instead.
 *
 * `onSuccess` receives the freshly signed-in user and fires before `onClose`, so
 * a caller that opened this modal to gate an action can resume that action
 * without waiting for `onAuthStateChanged` to land. `onClose` alone cannot carry
 * that: it is also how the user dismisses the modal.
 */
export default function AuthModal({ isOpen, onClose, onSuccess, reason }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, signup, loginWithGoogle, authAvailable } = useAuth();

  if (!isOpen) return null;

  const readableError = (err) =>
    String(err?.message || err || 'Something went wrong.')
      .replace('Firebase: ', '')
      .replace(/\(auth\/.*\)/, '')
      .trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await login(email, password);
      } else {
        if (!displayName.trim()) {
          throw new Error('Display Name is required');
        }
        result = await signup(email, password, displayName);
      }
      onSuccess?.(result?.user ?? null);
      onClose();
    } catch (err) {
      setError(readableError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      onSuccess?.(result?.user ?? null);
      onClose();
    } catch (err) {
      setError(readableError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md relative rounded-2xl p-8 animate-scale-in"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <h3 className="text-xl font-bold mb-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {!authAvailable ? 'Sign-in needs Firebase keys' : isLogin ? 'Welcome back' : 'Create account'}
        </h3>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          {!authAvailable
            ? 'This build has no auth project wired up, so the requirement is switched off.'
            : reason
              ? reason
              : isLogin
                ? 'Sign in to your FaceTimeOS account.'
                : 'Get started with FaceTimeOS.'}
        </p>

        {!authAvailable ? (
          <>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
              An account is meant to be required before you create or join a room —
              but a requirement nobody can satisfy is just a locked door, so rooms
              keep working here: the server issues your identity when you join. To
              turn the requirement on, copy <code>client/.env.example</code> to{' '}
              <code>client/.env.local</code>, paste your Firebase web config, and restart{' '}
              <code>next dev</code>:
            </p>
            <pre
              className="mb-6 overflow-x-auto rounded-xl p-3 text-[11px] leading-relaxed"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--bg-input-border)',
                color: 'var(--text-secondary)',
              }}
            >
{`NEXT_PUBLIC_FIREBASE_API_KEY=…
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=…
NEXT_PUBLIC_FIREBASE_PROJECT_ID=…
NEXT_PUBLIC_FIREBASE_APP_ID=…`}
            </pre>
            <button
              type="button"
              onClick={onClose}
              className="gradient-btn w-full py-3 rounded-xl font-semibold text-sm text-white"
            >
              Continue without an account
            </button>
          </>
        ) : (
          <>
        {/* Google Sign-In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 mb-4 disabled:opacity-50"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--bg-input-border)',
            color: 'var(--text-primary)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--bg-input-border)',
                  color: 'var(--text-primary)',
                }}
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--bg-input-border)',
                color: 'var(--text-primary)',
              }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--bg-input-border)',
                color: 'var(--text-primary)',
              }}
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="gradient-btn w-full py-3 rounded-xl font-semibold text-sm text-white mt-1 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="font-medium"
            style={{ color: 'var(--accent-primary)' }}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
          </>
        )}
      </div>
    </div>
  );
}
