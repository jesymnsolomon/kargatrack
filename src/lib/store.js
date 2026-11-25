import { useSyncExternalStore } from 'react';

/**
 * In-memory store, cached in localStorage so the app opens instantly and works offline.
 * When Supabase is configured, every change is also handed to the sync layer
 * (see sync.js), which uploads it in the background.
 *
 * Shape:
 *  groups:       { id, name, emoji, archived?, createdAt }
 *  items:        { id, groupId, name, price (your price to vendor), srp (vendor's selling price), image?, archived?, createdAt }
 *  vendors:      { id, name, phone, photoUrl?, archived?, createdAt }
 *  transactions: { id, groupId, vendorId, date, time, createdAt,
 *                  lines: [{ itemId, name, price, srp, qty, returned }],
 *                  status: 'out' | 'returned', returnedAt, paid: null|true|false, paidAt }
 */

export const LEGACY_KEY = 'kargatrack-data-v1';
export const TABLES = ['groups', 'items', 'vendors', 'transactions'];

export const uid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36));

export function seedData() {
  const ice = 'g-icecream', balot = 'g-balot', puto = 'g-puto';
  const t = Date.now();
  return {
    groups: [
      { id: ice, name: 'Ice Cream', emoji: '🍦', createdAt: t },
      { id: balot, name: 'Balot', emoji: '🥚', createdAt: t + 1 },
      { id: puto, name: 'Puto', emoji: '🧁', createdAt: t + 2 },
    ],
    items: [
      { id: uid(), groupId: ice, name: 'Pinipig', price: 10, srp: 15, image: '/items/thumbs/choco-crunch-popsicle.webp', createdAt: t },
      { id: uid(), groupId: ice, name: 'Ice Cream', price: 10, srp: 15, image: '/items/thumbs/swirl-popsicle.webp', createdAt: t + 1 },
      { id: uid(), groupId: ice, name: 'Ice Cream Cone', price: 10, srp: 15, image: '/items/thumbs/choco-chip-cone.webp', createdAt: t + 2 },
      { id: uid(), groupId: ice, name: 'Buko Salad', price: 10, srp: 15, image: '/items/thumbs/white-popsicle.webp', createdAt: t + 3 },
      { id: uid(), groupId: balot, name: 'Balot', price: 17, srp: 22, image: '/items/thumbs/egg.webp', createdAt: t + 4 },
      { id: uid(), groupId: balot, name: 'Chicharon', price: 15, srp: 20, image: '/items/thumbs/chicharon.webp', createdAt: t + 5 },
      { id: uid(), groupId: puto, name: 'White Puto', price: 5, srp: 7, image: '/items/thumbs/puto-white.webp', createdAt: t + 6 },
      { id: uid(), groupId: puto, name: 'Maja', price: 10, srp: 15, image: '/items/thumbs/maja-purple.webp', createdAt: t + 7 },
    ],
    vendors: [],
    transactions: [],
  };
}

export const emptyData = () => ({ groups: [], items: [], vendors: [], transactions: [] });

export function normalize(d) {
  const out = {};
  for (const t of TABLES) {
    const arr = Array.isArray(d?.[t]) ? d[t] : [];
    // give old rows a createdAt so ordering is stable in the cloud
    out[t] = arr.map((r, i) => (r.createdAt ? r : { ...r, createdAt: i + 1 }));
  }
  return out;
}

export function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let storageKey = LEGACY_KEY;
let state = normalize(readJSON(LEGACY_KEY) ?? seedData());
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

function persist() {
  if (!storageKey) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    alert('Could not save data on this device. Storage may be full.');
  }
}

// ---------- Sync hook (set by sync.js when cloud is on) ----------
let syncHook = null;
export const setSyncHook = (fn) => { syncHook = fn; };
const track = (table, row) => syncHook?.('upsert', table, row);
const trackDelete = (table, id) => syncHook?.('delete', table, { id });

function setState(patch) {
  state = { ...state, ...patch };
  persist();
  emit();
}

/** Switch which localStorage cache backs the store (one per signed-in user). */
export function switchStorage(key, fallback = emptyData) {
  storageKey = key;
  state = normalize((key && readJSON(key)) ?? fallback());
  persist();
  emit();
}

/** Replace everything (e.g. after downloading from the cloud). Does NOT trigger uploads. */
export function replaceAll(data) {
  state = normalize(data);
  persist();
  emit();
}

/** Replace everything AND queue the differences for upload (restore backup, erase all). */
function replaceAndTrack(next) {
  next = normalize(next);
  for (const t of TABLES) {
    const oldById = new Map(state[t].map((r) => [r.id, r]));
    const newIds = new Set(next[t].map((r) => r.id));
    for (const r of state[t]) if (!newIds.has(r.id)) trackDelete(t, r.id);
    for (const r of next[t]) {
      const o = oldById.get(r.id);
      if (!o || JSON.stringify(o) !== JSON.stringify(r)) track(t, r);
    }
  }
  replaceAll(next);
}

// Keep several open tabs in sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key === storageKey) {
      state = normalize(readJSON(storageKey) ?? emptyData());
      emit();
    }
  });
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;

export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
export const getState = () => state;

const clean = (s) => String(s ?? '').trim();
const num = (n) => Math.max(0, Number(n) || 0);

/** Update one row in a table, persist, and queue it for upload. */
function patchRow(table, id, fn) {
  let changed = null;
  const arr = state[table].map((r) => (r.id === id ? (changed = fn(r)) : r));
  if (!changed) return;
  setState({ [table]: arr });
  track(table, changed);
}
function insertRow(table, row) {
  setState({ [table]: [...state[table], row] });
  track(table, row);
  return row.id;
}
function removeRow(table, id) {
  setState({ [table]: state[table].filter((r) => r.id !== id) });
  trackDelete(table, id);
}

// ---------- Vendors ----------
export function addVendor({ id, name, phone, photoUrl }) {
  return insertRow('vendors', {
    id: id || uid(), name: clean(name), phone: clean(phone), photoUrl: photoUrl || null, createdAt: Date.now(),
  });
}
export function updateVendor(id, { name, phone, photoUrl }) {
  patchRow('vendors', id, (v) => ({
    ...v, name: clean(name), phone: clean(phone), ...(photoUrl !== undefined ? { photoUrl } : {}),
  }));
}
export function deleteVendor(id) {
  if (state.transactions.some((t) => t.vendorId === id)) patchRow('vendors', id, (v) => ({ ...v, archived: true }));
  else removeRow('vendors', id);
}

// ---------- Groups ----------
export function addGroup({ name, emoji }) {
  return insertRow('groups', { id: uid(), name: clean(name), emoji: emoji || '📦', createdAt: Date.now() });
}
export function updateGroup(id, { name, emoji }) {
  patchRow('groups', id, (g) => ({ ...g, name: clean(name), emoji }));
}
export function deleteGroup(id) {
  const used = state.transactions.some((t) => t.groupId === id) || state.items.some((i) => i.groupId === id && !i.archived);
  if (used) patchRow('groups', id, (g) => ({ ...g, archived: true }));
  else removeRow('groups', id);
}

// ---------- Items ----------
export function addItem({ groupId, name, price, srp, image }) {
  return insertRow('items', { id: uid(), groupId, name: clean(name), price: num(price), srp: num(srp), image: image ?? null, createdAt: Date.now() });
}
export function updateItem(id, { name, price, srp, image }) {
  patchRow('items', id, (i) => ({ ...i, name: clean(name), price: num(price), srp: num(srp), ...(image !== undefined ? { image } : {}) }));
}
export function deleteItem(id) {
  if (state.transactions.some((t) => t.lines.some((l) => l.itemId === id))) patchRow('items', id, (i) => ({ ...i, archived: true }));
  else removeRow('items', id);
}

// ---------- Transactions ----------
export function addTransaction({ groupId, vendorId, date, time, lines }) {
  return insertRow('transactions', {
    id: uid(), groupId, vendorId, date, time, lines,
    createdAt: Date.now(), status: 'out', paid: null, returnedAt: null, paidAt: null,
  });
}

export function updateTransaction(id, patch) {
  patchRow('transactions', id, (t) => ({ ...t, ...patch }));
}

/** returnedMap: { [itemId]: number } */
export function markReturned(id, returnedMap) {
  patchRow('transactions', id, (t) => ({
    ...t,
    status: 'returned',
    returnedAt: t.returnedAt || Date.now(),
    lines: t.lines.map((l) => ({ ...l, returned: Math.min(l.qty, num(returnedMap[l.itemId])) })),
  }));
}

export function undoReturn(id) {
  updateTransaction(id, { status: 'out', returnedAt: null, paid: null, paidAt: null });
}

export function setPaid(id, paid) {
  updateTransaction(id, { paid, paidAt: paid ? Date.now() : null });
}

export function deleteTransaction(id) {
  removeRow('transactions', id);
}

// ---------- Backup ----------
export function exportData() {
  return JSON.stringify({ app: 'KargaTrack', exportedAt: new Date().toISOString(), ...state }, null, 2);
}
export function importData(text) {
  const d = JSON.parse(text);
  if (!d || !Array.isArray(d.transactions) || !Array.isArray(d.vendors)) throw new Error('Not a KargaTrack backup file');
  replaceAndTrack(d);
}
export function resetData() {
  replaceAndTrack(seedData());
}
