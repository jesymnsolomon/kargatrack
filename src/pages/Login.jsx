import { useState } from 'react';
import { sendPasswordReset, signIn, signUp, useCloud } from '../lib/sync.js';
import { Button, Card, Field, inputCls } from '../components/ui.jsx';

function friendly(e) {
  const m = (e?.message || '').toLowerCase();
  if (m.includes('invalid login')) return 'Wrong email or password. Please try again.';
  if (m.includes('email not confirmed')) return 'Please open the email we sent you and tap the link first.';
  if (m.includes('already registered')) return 'This email already has an account. Tap "I already have an account".';
  if (m.includes('password should be')) return 'Password must be at least 6 characters.';
  if (m.includes('fetch') || m.includes('network')) return 'No internet connection. Please check and try again.';
  return e?.message || 'Something went wrong. Please try again.';
}

export default function Login() {
  const cloud = useCloud();
  const [mode, setMode] = useState('in'); // 'in' | 'up' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(cloud.error || '');
  const [info, setInfo] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'in') await signIn(email, password);
      else if (mode === 'up') {
        const r = await signUp(email, password);
        if (r.needsConfirm) {
          setInfo('Account created! Open the email we sent you, tap the link, then come back and sign in.');
          setMode('in');
        }
      } else {
        await sendPasswordReset(email);
        setInfo('We sent you an email with a link to set a new password.');
        setMode('in');
      }
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : 'Forgot password';

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 grid size-20 place-items-center rounded-full bg-brand-400 text-4xl">🛒</div>
        <h1 className="text-3xl font-extrabold">KargaTrack</h1>
        <p className="text-lg text-neutral-600">Your records are saved safely online.</p>
      </div>

      <Card>
        <h2 className="mb-5 text-2xl font-bold">{title}</h2>
        <form onSubmit={submit} className="space-y-5">
          <Field label="Email">
            <input
              className={inputCls} type="email" inputMode="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com"
            />
          </Field>
          {mode !== 'reset' && (
            <Field label="Password" hint={mode === 'up' ? 'At least 6 characters' : undefined}>
              <div className="relative">
                <input
                  className={`${inputCls} pr-24`} type={show ? 'text' : 'password'} required minLength={6}
                  autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button" onClick={() => setShow(!show)}
                  className="absolute right-2 top-1/2 h-10 -translate-y-1/2 rounded-xl bg-neutral-100 px-3 text-base font-semibold"
                >
                  {show ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>
          )}

          {error && <p className="rounded-2xl bg-red-50 p-3 text-lg text-red-800">{error}</p>}
          {info && <p className="rounded-2xl bg-brand-50 p-3 text-lg text-brand-900">{info}</p>}

          <Button type="submit" variant="dark" className="w-full" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : 'Send reset link'}
          </Button>
        </form>

        <div className="mt-5 space-y-2 text-center">
          {mode === 'in' ? (
            <>
              <button onClick={() => { setMode('up'); setError(''); }} className="min-h-12 w-full rounded-2xl bg-neutral-100 text-lg font-semibold">
                New here? Create an account
              </button>
              <button onClick={() => { setMode('reset'); setError(''); }} className="min-h-12 w-full text-lg text-neutral-600 underline">
                Forgot password?
              </button>
            </>
          ) : (
            <button onClick={() => { setMode('in'); setError(''); }} className="min-h-12 w-full rounded-2xl bg-neutral-100 text-lg font-semibold">
              I already have an account
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
