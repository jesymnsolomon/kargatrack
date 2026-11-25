import { useSyncExternalStore } from 'react';

/**
 * Minimal hash router. Keeps its own history index so the in-app Back button
 * knows whether there is a previous screen; otherwise it goes to a fallback.
 * The phone's own Back button also works.
 */
let idx = 0;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  idx = history.state?.idx ?? 0;
  if (history.state?.idx == null) history.replaceState({ idx: 0 }, '');
  window.addEventListener('popstate', (e) => {
    idx = e.state?.idx ?? 0;
    emit();
    window.scrollTo(0, 0);
  });
  window.addEventListener('hashchange', emit);
}

export function go(path, { replace = false } = {}) {
  if (replace) history.replaceState({ idx }, '', path);
  else {
    idx += 1;
    history.pushState({ idx }, '', path);
  }
  emit();
  window.scrollTo(0, 0);
}

export function back(fallback = '#/') {
  if (idx > 0) history.back();
  else go(fallback, { replace: true });
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getHash = () => location.hash || '#/';

export function useRoute() {
  const hash = useSyncExternalStore(subscribe, getHash);
  const [path, qs = ''] = hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const query = Object.fromEntries(new URLSearchParams(qs));
  return { parts, query, hash };
}
