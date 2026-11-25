import { useSyncExternalStore } from 'react';
import {
  LEGACY_KEY, TABLES, emptyData, getState, normalize, readJSON, replaceAll, seedData, setSyncHook, switchStorage,
} from './store.js';

/**
 * Cloud sync with Supabase.
 *
 * - Changes are applied to the phone immediately (fast), then put in an "outbox"
 *   saved on the phone and uploaded in the background. No internet? They wait and
 *   upload automatically when the connection is back.
 * - On sign-in and whenever the app is reopened, the latest data is downloaded.
 * - If VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set, the app runs in
 *   local-only mode exactly like before.
 */

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const cloudEnabled = Boolean(SB_URL && SB_KEY);

const LAST_USER_KEY = 'kargatrack-last-user';
const cacheKey = (userId) => `kargatrack-cache-${userId}`;
const outboxKey = (userId) => `kargatrack-outbox-${userId}`;
export const PHOTO_BUCKET = 'vendor-photos';

// Supabase library is loaded lazily so the app's first paint stays fast.
let clientPromise = null;
export function getClient() {
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    );
  }
  return clientPromise;
}

// ---------- Cloud status store (for the UI) ----------
// status: 'local' | 'loading' | 'out' | 'in'
// sync:   'idle' | 'saving' | 'offline' | 'error'
let cloud = {
  status: cloudEnabled ? 'loading' : 'local',
  user: null,
  sync: 'idle',
  pending: 0,
  lastSynced: null,
  error: null,
};
const listeners = new Set();
function setCloud(patch) {
  cloud = { ...cloud, ...patch };
  listeners.forEach((l) => l());
}
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export function useCloud() {
  return useSyncExternalStore(subscribe, () => cloud);
}

// ---------- Row mapping (app camelCase ↔ database snake_case) ----------
const FIELDS = {
  groups: ['id', 'name', 'emoji', 'archived', 'createdAt'],
  items: ['id', 'groupId', 'name', 'price', 'srp', 'image', 'archived', 'createdAt'],
  vendors: ['id', 'name', 'phone', 'photoUrl', 'archived', 'createdAt'],
  transactions: ['id', 'groupId', 'vendorId', 'date', 'time', 'lines', 'status', 'returnedAt', 'paid', 'paidAt', 'createdAt'],
};
const snake = (k) => k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());

function toDb(table, row, userId) {
  const out = { user_id: userId };
  for (const f of FIELDS[table]) {
    let v = row[f];
    if (f === 'archived') v = Boolean(v);
    else if (f === 'createdAt') v = v || Date.now();
    else if (v === undefined) v = null;
    out[snake(f)] = v;
  }
  return out;
}

function fromDb(table, r) {
  const out = {};
  for (const f of FIELDS[table]) {
    const v = r[snake(f)];
    if (f === 'archived') { if (v) out.archived = true; continue; }
    if (f === 'price' || f === 'srp') { out[f] = Number(v) || 0; continue; }
    if (f === 'phone') { out[f] = v ?? ''; continue; }
    out[f] = v;
  }
  return out;
}

// ---------- Outbox ----------
let outbox = [];
const saveOutbox = () => {
  if (!cloud.user) return;
  try { localStorage.setItem(outboxKey(cloud.user.id), JSON.stringify(outbox)); } catch { /* ignore */ }
  setCloud({ pending: outbox.length });
};

function enqueue(op, table, row) {
  if (!cloud.user) return;
  // Only the latest change per row matters
  outbox = outbox.filter((o) => !(o.table === table && o.id === row.id));
  outbox.push({ op, table, id: row.id, row: op === 'upsert' ? row : undefined });
  saveOutbox();
  scheduleFlush();
}

let flushTimer = null;
function scheduleFlush(delay = 250) {
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, delay);
}

let flushing = null;
export function flush() {
  if (!cloud.user) return Promise.resolve();
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      const sb = await getClient();
      while (outbox.length && cloud.user) {
        setCloud({ sync: 'saving' });
        const first = outbox[0];
        // Send many rows of the same kind in one request
        const batch = outbox.filter((o) => o.table === first.table && o.op === first.op).slice(0, 500);
        const res =
          first.op === 'upsert'
            ? await sb.from(first.table).upsert(batch.map((o) => toDb(first.table, o.row, cloud.user.id)), { onConflict: 'user_id,id' })
            : await sb.from(first.table).delete().in('id', batch.map((o) => o.id));
        if (res.error) throw res.error;
        const done = new Set(batch);
        outbox = outbox.filter((o) => !done.has(o));
        saveOutbox();
      }
      setCloud({ sync: 'idle', error: null, lastSynced: Date.now() });
    } catch (e) {
      console.warn('[sync] upload failed', e);
      setCloud({ sync: navigator.onLine ? 'error' : 'offline', error: e?.message || String(e) });
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

// ---------- Download ----------
async function fetchTable(sb, table) {
  const rows = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await sb.from(table).select('*').order('created_at').range(from, from + page - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < page) break;
  }
  return rows.map((r) => fromDb(table, r));
}

let refreshing = null;
/** Upload pending changes, then download the latest copy from the cloud. */
export function refresh() {
  if (!cloud.user) return Promise.resolve();
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      await flush();
      if (outbox.length) return; // still offline — keep what's on the phone
      const sb = await getClient();
      const lists = await Promise.all(TABLES.map((t) => fetchTable(sb, t)));
      const data = Object.fromEntries(TABLES.map((t, i) => [t, lists[i]]));
      if (outbox.length) return; // user changed something while downloading; next refresh will catch up

      if (TABLES.every((t) => data[t].length === 0)) {
        // Brand-new account: bring over data from before cloud sync, or start with the default groups/items
        const legacy = readJSON(LEGACY_KEY);
        const start = legacy && Array.isArray(legacy.transactions) ? normalize(legacy) : seedData();
        replaceAll(start);
        for (const t of TABLES) for (const r of start[t]) enqueue('upsert', t, r);
        if (legacy) localStorage.setItem(LEGACY_KEY + '-moved-to-cloud', JSON.stringify(legacy));
        localStorage.removeItem(LEGACY_KEY);
        await flush();
      } else {
        replaceAll(data);
        setCloud({ sync: 'idle', error: null, lastSynced: Date.now() });
      }
    } catch (e) {
      console.warn('[sync] download failed', e);
      setCloud({ sync: navigator.onLine ? 'error' : 'offline', error: e?.message || String(e) });
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

// ---------- Sign in / out ----------
function activateUser(user) {
  if (cloud.user?.id === user.id && cloud.status === 'in') return;
  localStorage.setItem(LAST_USER_KEY, JSON.stringify(user));
  switchStorage(cacheKey(user.id), emptyData);
  outbox = readJSON(outboxKey(user.id)) ?? [];
  setCloud({ status: 'in', user, pending: outbox.length });
}

function clearLocalUser() {
  if (cloud.user) {
    localStorage.removeItem(cacheKey(cloud.user.id));
    localStorage.removeItem(outboxKey(cloud.user.id));
  }
  localStorage.removeItem(LAST_USER_KEY);
  outbox = [];
  switchStorage(null, emptyData);
  setCloud({ status: 'out', user: null, pending: 0, sync: 'idle', error: null, lastSynced: null });
}

export async function signIn(email, password) {
  const sb = await getClient();
  const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  activateUser({ id: data.user.id, email: data.user.email });
  refresh();
}

export async function signUp(email, password) {
  const sb = await getClient();
  const { data, error } = await sb.auth.signUp({ email: email.trim(), password });
  if (error) throw error;
  if (data.session) {
    activateUser({ id: data.user.id, email: data.user.email });
    refresh();
    return { needsConfirm: false };
  }
  return { needsConfirm: true };
}

export async function signOut() {
  const sb = await getClient();
  await sb.auth.signOut().catch(() => {});
  clearLocalUser();
}

export async function sendPasswordReset(email) {
  const sb = await getClient();
  const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin });
  if (error) throw error;
}

export async function updatePassword(password) {
  const sb = await getClient();
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw error;
  setCloud({ recovery: false });
}
export const closeRecovery = () => setCloud({ recovery: false });

// ---------- Vendor photos ----------
const blobToDataUrl = (blob) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });

/** Uploads a (already resized) photo and returns the URL to save on the vendor. */
export async function uploadVendorPhoto(vendorId, blob) {
  if (!cloudEnabled) return blobToDataUrl(blob); // local-only mode: keep it on the phone
  if (!cloud.user) throw new Error('Not signed in');
  const sb = await getClient();
  const path = `${cloud.user.id}/${vendorId}-${Date.now()}.jpg`;
  const { error } = await sb.storage.from(PHOTO_BUCKET).upload(path, blob, {
    contentType: 'image/jpeg', cacheControl: '31536000', upsert: false,
  });
  if (error) throw error;
  return sb.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Best-effort removal of an old photo file. */
export async function deleteVendorPhoto(url) {
  if (!cloudEnabled || !url || url.startsWith('data:')) return;
  const path = url.split(`/${PHOTO_BUCKET}/`)[1];
  if (!path) return;
  try {
    const sb = await getClient();
    await sb.storage.from(PHOTO_BUCKET).remove([decodeURIComponent(path.split('?')[0])]);
  } catch { /* ignore */ }
}

// ---------- Start-up ----------
export async function initCloud() {
  if (!cloudEnabled) return;
  setSyncHook(enqueue);

  // Open instantly with the last user's cached data; verify the session in the background.
  const last = readJSON(LAST_USER_KEY);
  if (last?.id) activateUser(last);

  try {
    const sb = await getClient();
    const { data, error } = await sb.auth.getSession();
    const user = data?.session?.user;
    if (user) {
      activateUser({ id: user.id, email: user.email });
      refresh();
    } else if (!error && navigator.onLine) {
      // Truly signed out (not just offline)
      if (cloud.user) clearLocalUser();
      else setCloud({ status: 'out' });
    } else if (!cloud.user) {
      setCloud({ status: 'out' });
    }

    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setCloud({ recovery: true });
      if (event === 'SIGNED_OUT') {
        if (cloud.user) clearLocalUser();
      } else if (session?.user && session.user.id !== cloud.user?.id) {
        activateUser({ id: session.user.id, email: session.user.email });
        refresh();
      }
    });
  } catch (e) {
    console.warn('[sync] could not start', e);
    if (!cloud.user) setCloud({ status: 'out', error: 'Could not connect. Check your internet.' });
  }

  window.addEventListener('online', () => refresh());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh();
  });
  setInterval(() => {
    if (outbox.length && navigator.onLine) flush();
  }, 20000);
}

export const debugState = () => ({ cloud, outbox, state: getState() });
