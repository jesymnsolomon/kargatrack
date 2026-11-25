import { useState } from 'react';
import { closeRecovery, updatePassword } from '../lib/sync.js';
import { Button, Field, Modal, inputCls } from './ui.jsx';

/** Shown after the user opens a "reset password" email link. */
export default function NewPassword() {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await updatePassword(pw); } catch (err) { setError(err?.message || 'Could not save.'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={closeRecovery} title="Set a new password">
      <form onSubmit={save} className="space-y-5">
        <Field label="New password" hint="At least 6 characters">
          <input className={inputCls} type="text" autoComplete="new-password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} />
        </Field>
        {error && <p className="rounded-2xl bg-red-50 p-3 text-lg text-red-800">{error}</p>}
        <Button type="submit" variant="dark" className="w-full" disabled={busy || pw.length < 6}>Save new password</Button>
      </form>
    </Modal>
  );
}
