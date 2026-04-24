import { useState } from 'react';
import { supabase } from '../utils/supabase';

export default function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [confirmedEmail, setConfirmedEmail] = useState(null); // set after signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setConfirmedEmail(email); // show confirmation screen
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Success — App's onAuthStateChange fires and re-renders with session
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Post-signup confirmation screen ────────────────────────────────────────
  if (confirmedEmail) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="auth-brand__mark">✍</div>
            <h1 className="auth-brand__name">Cutting Edge Scripts</h1>
            <p className="auth-brand__tagline">Professional Screenwriting</p>
          </div>

          <div className="auth-confirm">
            <div className="auth-confirm__icon">✉️</div>
            <h2 className="auth-confirm__heading">Check your inbox</h2>
            <p className="auth-confirm__body">
              A confirmation email has been sent to{' '}
              <strong className="auth-confirm__email">{confirmedEmail}</strong>.
              Please verify your email before logging in.
            </p>
            <p className="auth-confirm__hint">
              Once you've clicked the link in the email, come back here and sign in.
            </p>
          </div>

          <button
            type="button"
            className="auth-submit"
            onClick={() => {
              setConfirmedEmail(null);
              switchMode('login');
            }}
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  // ── Login / signup form ────────────────────────────────────────────────────
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand__mark">✍</div>
          <h1 className="auth-brand__name">Cutting Edge Scripts</h1>
          <p className="auth-brand__tagline">Professional Screenwriting</p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab${mode === 'login' ? ' auth-tab--active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab${mode === 'signup' ? ' auth-tab--active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            Create Account
          </button>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">
            Email
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              autoComplete="email"
            />
          </label>

          <label className="auth-label">
            Password
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Min. 6 characters' : ''}
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </label>

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            className="auth-footer__link"
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
