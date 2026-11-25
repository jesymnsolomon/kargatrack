import { memo, useEffect, useState } from 'react';
import {
  BarChart3, Calendar, Camera, Check, ChevronLeft, ChevronRight, Download, House, Image as ImageIcon, List, Minus,
  Package, Pencil, Phone, Plus, RefreshCw, Search, Settings, Trash2, Trophy, Truck, Undo2, Upload, User, Users,
  Wallet, WifiOff, X,
} from 'lucide-react';
import { itemImage } from '../lib/itemImages.js';
import { go, back } from '../lib/router.js';
import { calcTx, dayLabel, fmtTime, initials, peso, pesoShort } from '../lib/utils.js';

// ---------- Icons (lucide-react; only the icons listed here are bundled) ----------
const ICONS = {
  home: House, list: List, plus: Plus, minus: Minus, chart: BarChart3, gear: Settings,
  back: ChevronLeft, left: ChevronLeft, right: ChevronRight, check: Check, x: X, trash: Trash2,
  edit: Pencil, undo: Undo2, calendar: Calendar, box: Package, wallet: Wallet, download: Download,
  upload: Upload, user: User, users: Users, search: Search, truck: Truck, camera: Camera,
  image: ImageIcon, phone: Phone, trophy: Trophy, sync: RefreshCw, wifiOff: WifiOff,
};

export const Icon = memo(function Icon({ name, className = 'size-6', stroke = 2.2 }) {
  const C = ICONS[name] ?? Package;
  return <C className={className} strokeWidth={stroke} aria-hidden="true" />;
});

// ---------- Link (uses our router so Back works properly) ----------
export function Link({ to, replace, className = '', children, ...rest }) {
  return (
    <a
      href={to}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        go(to, { replace });
      }}
      className={className}
      {...rest}
    >
      {children}
    </a>
  );
}

// ---------- Layout ----------
export function Card({ className = '', children, ...rest }) {
  return (
    <div className={`rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, onBack, backTo = '#/', right }) {
  return (
    <header className="mb-5 flex items-center gap-3">
      <button
        onClick={onBack || (() => back(backTo))}
        className="grid size-14 shrink-0 place-items-center rounded-full bg-white shadow-sm active:scale-95"
        aria-label="Go back"
      >
        <Icon name="back" className="size-7" />
      </button>
      <div className="min-w-0 flex-1 text-center">
        <h1 className="truncate text-2xl font-bold">{title}</h1>
        {subtitle && <p className="truncate text-base text-neutral-600">{subtitle}</p>}
      </div>
      <div className="flex size-14 shrink-0 items-center justify-center">{right}</div>
    </header>
  );
}

export function SectionTitle({ children, right }) {
  return (
    <div className="mb-3 mt-7 flex items-center justify-between gap-3">
      <h2 className="text-xl font-bold">{children}</h2>
      {right}
    </div>
  );
}

const BTN = {
  primary: 'bg-brand-400 text-neutral-900 hover:bg-brand-300',
  dark: 'bg-neutral-900 text-white hover:bg-neutral-800',
  light: 'bg-white text-neutral-900 border-2 border-neutral-200 hover:bg-neutral-50',
  soft: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  dangerSoft: 'bg-red-50 text-red-700 hover:bg-red-100',
};

export function Button({ variant = 'primary', className = '', icon, children, ...rest }) {
  return (
    <button
      className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 text-lg font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${BTN[variant]} ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-lg font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-base text-neutral-600">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'h-14 w-full rounded-2xl border-2 border-neutral-200 bg-white px-4 text-xl outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-200';

// ---------- Number stepper (big − / + buttons) ----------
export function Stepper({ value, onChange, min = 0, max = 99999, label = '' }) {
  const [draft, setDraft] = useState(null); // text while typing, so the box can be empty
  const set = (v) => { setDraft(null); onChange(Math.max(min, Math.min(max, v))); };
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => set(value - 1)}
        disabled={value <= min}
        aria-label={`Less ${label}`}
        className="grid size-14 place-items-center rounded-2xl bg-neutral-100 active:scale-95 disabled:opacity-30"
      >
        <Icon name="minus" className="size-7" stroke={3} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label={label}
        value={draft ?? String(value)}
        onFocus={(e) => e.target.select()}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, '').slice(0, 5);
          const v = Math.max(min, Math.min(max, d === '' ? 0 : parseInt(d, 10)));
          setDraft(d === '' ? '' : String(v));
          onChange(v);
        }}
        className="h-14 w-20 rounded-2xl border-2 border-neutral-200 bg-white text-center text-2xl font-bold outline-none focus:border-brand-500"
      />
      <button
        type="button"
        onClick={() => set(value + 1)}
        disabled={value >= max}
        aria-label={`More ${label}`}
        className="grid size-14 place-items-center rounded-2xl bg-brand-300 active:scale-95 disabled:opacity-30"
      >
        <Icon name="plus" className="size-7" stroke={3} />
      </button>
    </div>
  );
}

// ---------- Modal / bottom sheet ----------
export function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-3xl"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button onClick={onClose} className="grid size-12 place-items-center rounded-full bg-neutral-100" aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Confirm({ open, title, message, confirmLabel = 'Yes', danger, onConfirm, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mb-6 text-lg text-neutral-700">{message}</p>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="soft" onClick={onClose}>No, go back</Button>
        <Button variant={danger ? 'danger' : 'dark'} onClick={() => { onConfirm(); onClose(); }}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

// ---------- Small pieces ----------
/** Item picture, or the group's emoji when the item has none. */
export function ItemThumb({ item, fallback = '📦', className = 'size-14' }) {
  const src = itemImage(item);
  return src ? (
    <img src={src} alt="" loading="lazy" decoding="async" width="56" height="56" className={`shrink-0 rounded-2xl bg-white object-contain ${className}`} />
  ) : (
    <span className={`grid shrink-0 place-items-center rounded-2xl bg-neutral-100 text-2xl ${className}`}>{fallback}</span>
  );
}

export function Avatar({ name, src, className = 'size-14 text-xl' }) {
  const [failed, setFailed] = useState(null);
  if (src && failed !== src) {
    return (
      <img
        src={src}
        alt={name ? `Photo of ${name}` : ''}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(src)}
        className={`shrink-0 rounded-full bg-neutral-100 object-cover ${className}`}
      />
    );
  }
  return (
    <div className={`grid shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-700 ${className}`}>
      {initials(name)}
    </div>
  );
}

export function StatusPill({ tx, big }) {
  const size = big ? 'px-4 py-2 text-lg' : 'px-3 py-1 text-base';
  if (tx.status !== 'returned')
    return <span className={`shrink-0 rounded-full bg-amber-100 font-bold text-amber-800 ${size}`}>Out selling</span>;
  if (tx.paid) return <span className={`shrink-0 rounded-full bg-brand-100 font-bold text-brand-700 ${size}`}>✓ Paid</span>;
  return <span className={`shrink-0 rounded-full bg-red-100 font-bold text-red-700 ${size}`}>Not paid</span>;
}

export function Empty({ icon = 'box', title, text, children }) {
  return (
    <Card className="flex flex-col items-center py-10 text-center">
      <div className="mb-3 grid size-16 place-items-center rounded-full bg-neutral-100 text-neutral-500">
        <Icon name={icon} className="size-8" />
      </div>
      <p className="text-xl font-bold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-lg text-neutral-600">{text}</p>}
      {children && <div className="mt-5">{children}</div>}
    </Card>
  );
}

export function Tabs({ options, value, onChange }) {
  return (
    <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-12 shrink-0 rounded-full px-5 text-lg font-bold transition ${
            value === o.value ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-800'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Transaction card ----------
export const TxCard = memo(function TxCard({ tx, vendor, group, showGroup, showDate }) {
  const c = calcTx(tx);
  return (
    <Link to={`#/tx/${tx.id}`} className="block rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition active:scale-[0.99]">
      <div className="flex items-center gap-3">
        <Avatar name={vendor?.name} src={vendor?.photoUrl} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xl font-bold">{vendor?.name ?? 'Unknown vendor'}</div>
          <div className="truncate text-base text-neutral-600">
            {showGroup && group && `${group.emoji} ${group.name} · `}
            {showDate && `${dayLabel(tx.date)} · `}
            {fmtTime(tx.time)}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {c.lines.map((l) => (
          <span key={l.itemId} className="rounded-xl bg-neutral-100 px-2.5 py-1 text-base">
            {l.name} <b>{c.isReturned ? `${l.sold}/${l.qty}` : l.qty}</b>
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-end justify-between border-t border-neutral-100 pt-3">
        <span className="flex flex-col items-start gap-1">
          <StatusPill tx={tx} />
          <span className="text-base text-neutral-600">
            {c.took} taken{c.isReturned && ` · ${c.ret} returned`}
          </span>
        </span>
        {c.isReturned ? (
          <span className="text-right">
            <span className="block text-sm text-neutral-500">{tx.paid ? 'Paid' : 'Owes you'}</span>
            <span className="text-2xl font-extrabold">{peso(c.owed)}</span>
          </span>
        ) : (
          <span className="text-base font-semibold text-amber-700">Waiting for return</span>
        )}
      </div>
    </Link>
  );
});

// ---------- Bar chart (pure CSS, no chart library) ----------
export function BarChart({ data, height = 220, format = pesoShort, highlightMax = true, emptyText = 'No sales yet' }) {
  const [sel, setSel] = useState(null);
  const max = Math.max(0, ...data.map((d) => d.value));
  const bestIdx = max > 0 && highlightMax ? data.findIndex((d) => d.value === max) : -1;
  const dense = data.length > 7;

  return (
    <div>
      <div className="relative flex items-end gap-1 sm:gap-2" style={{ height }}>
        {max === 0 && (
          <div className="absolute inset-0 z-10 grid place-items-center">
            <span className="rounded-full bg-white/90 px-4 py-2 text-base font-semibold text-neutral-500">{emptyText}</span>
          </div>
        )}
        {data.map((d, i) => {
          const pct = max ? (d.value / max) * 100 : 0;
          const best = i === bestIdx;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSel(sel === i ? null : i)}
              aria-label={`${d.full ?? d.label}: ${peso(d.value)}`}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
            >
              <span
                className={`mb-1 h-5 whitespace-nowrap font-semibold ${dense ? 'text-xs' : 'text-xs sm:text-sm'} ${
                  best || sel === i ? 'text-neutral-900' : 'text-neutral-500'
                }`}
              >
                {d.value > 0 && (!dense || best || sel === i) ? format(d.value) : ''}
              </span>
              <span className="relative flex w-full flex-1 items-end justify-center">
                <span className={`stripes absolute inset-y-0 rounded-full ${dense ? 'w-[70%]' : 'w-[62%]'}`} />
                <span
                  className={`relative rounded-full transition-[height] duration-300 ${dense ? 'w-[70%]' : 'w-[62%]'} ${
                    best ? 'bg-brand-500' : 'bg-brand-200'
                  } ${sel === i ? 'ring-4 ring-neutral-900/25' : ''}`}
                  style={{ height: `${d.value > 0 ? Math.max(pct, 3) : 0}%` }}
                />
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1 sm:gap-2">
        {data.map((d, i) => (
          <span
            key={i}
            className={`min-w-0 flex-1 text-center leading-tight ${dense ? 'text-[11px] tracking-tight sm:text-sm' : 'text-sm sm:text-base'} ${
              d.active || i === sel ? 'font-bold text-neutral-900' : 'text-neutral-500'
            }`}
          >
            {d.label}
            {d.label2 && <span className="block">{d.label2}</span>}
          </span>
        ))}
      </div>
      {sel != null && data[sel] && (
        <div className="mt-4 rounded-2xl bg-neutral-100 p-3 text-center text-lg">
          <b>{data[sel].full ?? data[sel].label}</b>: {peso(data[sel].value)}
          {data[sel].extra && <span className="text-neutral-600"> · {data[sel].extra}</span>}
        </div>
      )}
    </div>
  );
}

// ---------- Progress ring ----------
export function Ring({ value, total, label }) {
  const r = 34, c = 2 * Math.PI * r;
  const pct = total ? value / total : 0;
  return (
    <div className="relative grid size-28 shrink-0 place-items-center">
      <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="9" />
        <circle
          cx="40" cy="40" r={r} fill="none" stroke="#6fa52a" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="grid size-[4.2rem] place-items-center rounded-full bg-brand-100 text-center leading-tight">
        <div>
          <div className="text-2xl font-extrabold">{value}/{total}</div>
          <div className="text-xs font-semibold text-neutral-700">{label}</div>
        </div>
      </div>
    </div>
  );
}
