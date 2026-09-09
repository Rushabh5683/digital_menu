import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { Alert, Button } from '../../shared/ui/index.js';
import { normalizeEmail, validateEmailField } from '../../shared/lib/validation.js';
import { getPostLoginPath, useAuth } from './AuthContext.jsx';
import { RedirectIfAuthenticated } from './ProtectedRoute.jsx';

function fieldError(error, field) {
  return error?.body?.details?.fields?.[field] || null;
}

export function LoginPage() {
  return (
    <RedirectIfAuthenticated>
      <LoginForm />
    </RedirectIfAuthenticated>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [touched, setTouched] = useState({ email: false, password: false });

  const clientErrors = useMemo(() => {
    const next = {};
    if (touched.email) {
      const emailError = validateEmailField(email, { required: true, label: 'Email' });
      if (emailError) next.email = emailError;
    }
    if (touched.password) {
      if (!password) next.password = 'Password is required';
      else if (password.length < 8) next.password = 'Password must be at least 8 characters';
    }
    return next;
  }, [email, password, touched]);

  async function handleSubmit(event) {
    event.preventDefault();
    setTouched({ email: true, password: true });
    setFormError(null);

    const emailError = validateEmailField(email, { required: true, label: 'Email' });
    if (emailError || !password || password.length < 8) {
      return;
    }

    setSubmitting(true);
    try {
      const user = await login({ email: normalizeEmail(email), password });
      const intended = location.state?.from;
      const fallback = getPostLoginPath(user);
      navigate(intended && intended.startsWith('/') ? intended : fallback, { replace: true });
    } catch (err) {
      setFormError(err);
    } finally {
      setSubmitting(false);
    }
  }

  const emailErr = clientErrors.email || fieldError(formError, 'email');
  const passwordErr = clientErrors.password || fieldError(formError, 'password');
  const bannerMessage =
    formError && !emailErr && !passwordErr
      ? formError.message || 'Unable to sign in'
      : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--ink)] text-[var(--surface-elevated)]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 70% 50% at 10% 20%, rgba(201,162,39,0.28), transparent 55%), radial-gradient(ellipse 55% 45% at 90% 10%, rgba(244,246,242,0.12), transparent 50%), radial-gradient(ellipse 60% 40% at 70% 90%, rgba(31,74,69,0.55), transparent 55%)',
        }}
      />

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <section className="menu-fade-up hidden lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
            Digital Menu
          </p>
          <h1
            className="mt-5 max-w-xl text-5xl leading-[1.05] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Attention intelligence for modern dining rooms.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/70">
            Sign in to manage restaurants, menus, and live customer attention insights — secured
            with role-based access for platform and restaurant teams.
          </p>
          <div className="mt-10 flex items-center gap-3 text-sm text-white/55">
            <span className="h-px w-8 bg-[var(--accent)]" />
            Staff console · HTTP-only session · No customer accounts
          </div>
        </section>

        <section className="menu-fade-up mx-auto w-full max-w-md">
          <div className="rounded-[1.75rem] border border-white/10 bg-[var(--surface-elevated)] p-6 text-[var(--ink)] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.7)] sm:p-8">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--teal)]">
                Staff sign in
              </p>
              <h2
                className="mt-2 text-3xl tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Welcome back
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Use your platform, restaurant admin, or captain credentials.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              {bannerMessage ? <Alert tone="error">{bannerMessage}</Alert> : null}

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Email
                </span>
                <div
                  className={[
                    'flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 transition',
                    emailErr
                      ? 'border-red-300 ring-2 ring-red-100'
                      : 'border-[var(--line)] focus-within:border-[var(--teal)] focus-within:ring-2 focus-within:ring-[var(--teal)]/15',
                  ].join(' ')}
                >
                  <Mail size={16} className="shrink-0 text-[var(--muted)]" />
                  <input
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]/70"
                    placeholder="you@restaurant.com"
                    disabled={submitting}
                  />
                </div>
                {emailErr ? <p className="text-xs text-[var(--danger)]">{emailErr}</p> : null}
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Password
                </span>
                <div
                  className={[
                    'flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 transition',
                    passwordErr
                      ? 'border-red-300 ring-2 ring-red-100'
                      : 'border-[var(--line)] focus-within:border-[var(--teal)] focus-within:ring-2 focus-within:ring-[var(--teal)]/15',
                  ].join(' ')}
                >
                  <LockKeyhole size={16} className="shrink-0 text-[var(--muted)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]/70"
                    placeholder="••••••••"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="rounded-lg p-1 text-[var(--muted)] hover:bg-black/5 hover:text-[var(--ink)]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordErr ? <p className="text-xs text-[var(--danger)]">{passwordErr}</p> : null}
              </label>

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight size={16} />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-[var(--muted)]">
              Guests do not need an account.{' '}
              <Link to="/menu/saffron-court" className="font-semibold text-[var(--teal)] hover:underline">
                Open customer menu
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
