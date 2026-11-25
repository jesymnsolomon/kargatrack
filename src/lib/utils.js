// ---------- Money ----------
export function peso(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function pesoShort(n) {
  const v = Number(n) || 0;
  const trim = (x) => x.toFixed(1).replace(/\.0$/, '');
  if (v >= 1e6) return '₱' + trim(v / 1e6) + 'M';
  if (v >= 1000) return '₱' + trim(v / 1000) + 'k';
  return '₱' + Math.round(v);
}

// ---------- Dates (always local time, stored as YYYY-MM-DD) ----------
const pad = (n) => String(n).padStart(2, '0');

export const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => toDateStr(new Date());

export function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s, n) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/** Monday of the week that contains date s */
export function startOfWeek(s) {
  const d = parseDate(s);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toDateStr(d);
}

export function nowTime() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtTime(t) {
  if (!t) return '';
  let [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${pad(m)} ${ap}`;
}

export const fmtDateLong = (s) =>
  parseDate(s).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

export const fmtDateMed = (s) =>
  parseDate(s).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export const fmtMonthYear = (s) =>
  parseDate(s).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export const fmtShortDate = (s) => parseDate(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export function dayLabel(s) {
  const t = todayStr();
  if (s === t) return 'Today';
  if (s === addDays(t, -1)) return 'Yesterday';
  return fmtDateMed(s);
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning!';
  if (h < 18) return 'Good afternoon!';
  return 'Good evening!';
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export const byId = (arr) => {
  const m = {};
  for (const x of arr) m[x.id] = x;
  return m;
};

// ---------- Core computation ----------
/**
 * For each item: sold = taken − returned
 *   vendor owes you = sold × your price
 *   vendor's sales  = sold × vendor's selling price
 *   vendor's earnings = vendor's sales − what he owes you
 * Results are cached per transaction object (objects are immutable in the store).
 */
const calcCache = new WeakMap();
export function calcTx(tx) {
  const hit = calcCache.get(tx);
  if (hit) return hit;
  let owed = 0, vsales = 0, took = 0, sold = 0, ret = 0;
  const isReturned = tx.status === 'returned';
  const lines = tx.lines.map((l) => {
    const r = isReturned ? Math.min(l.returned || 0, l.qty) : 0;
    const s = l.qty - r;
    const o = s * l.price;
    const v = s * l.srp;
    owed += o; vsales += v; took += l.qty; sold += s; ret += r;
    return { ...l, returnedQty: r, sold: s, owed: o, vsales: v, earn: v - o };
  });
  const res = { lines, owed, vsales, earn: vsales - owed, took, sold, ret, isReturned };
  calcCache.set(tx, res);
  return res;
}

export const isUnpaid = (tx) => tx.status === 'returned' && !tx.paid;

/**
 * Per-vendor totals for returned records between two dates (inclusive, YYYY-MM-DD).
 * times = how many records (trips) the vendor sold in that period.
 */
export function vendorStats(transactions, from = '0000', to = '9999', groupId = 'all') {
  const m = new Map();
  for (const t of transactions) {
    if (t.status !== 'returned' || t.date < from || t.date > to) continue;
    if (groupId !== 'all' && t.groupId !== groupId) continue;
    const c = calcTx(t);
    let v = m.get(t.vendorId);
    if (!v) { v = { times: 0, units: 0, sales: 0, earn: 0, unpaid: 0, lastDate: '' }; m.set(t.vendorId, v); }
    v.times++;
    v.units += c.sold;
    v.sales += c.owed;
    v.earn += c.earn;
    if (!t.paid) v.unpaid += c.owed;
    if (t.date > v.lastDate) v.lastDate = t.date;
  }
  return m;
}

/** [vendorId, stats] with the highest sales, or null */
export function bestVendor(statsMap) {
  let best = null;
  for (const e of statsMap) if (e[1].sales > 0 && (!best || e[1].sales > best[1].sales)) best = e;
  return best;
}

export const monthRange = (ym) => [`${ym}-01`, `${ym}-31`];
export function addMonths(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
export const fmtYM = (ym) => new Date(ym + '-01T00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
