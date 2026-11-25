import { useMemo, useState } from 'react';
import { Avatar, Icon, Modal, inputCls } from './ui.jsx';

/**
 * Big "Choose vendor" button that opens a searchable list.
 * Vendors used most recently are listed first.
 */
export default function VendorPicker({ vendors, value, onChange, recentIds = [], onNewVendor }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const selected = vendors.find((v) => v.id === value);

  const list = useMemo(() => {
    const rank = new Map(recentIds.map((id, i) => [id, i]));
    const query = q.trim().toLowerCase();
    return vendors
      .filter((v) => !query || v.name.toLowerCase().includes(query) || (v.phone || '').replace(/\s/g, '').includes(query.replace(/\s/g, '')))
      .sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9) || a.name.localeCompare(b.name));
  }, [vendors, recentIds, q]);

  const close = () => { setOpen(false); setQ(''); };
  const pick = (id) => { onChange(id); close(); };

  return (
    <>
      {selected ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-4 rounded-3xl bg-brand-200 p-4 text-left ring-4 ring-brand-400"
        >
          <Avatar name={selected.name} src={selected.photoUrl} className="size-16 text-2xl" />
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-extrabold leading-tight break-words">{selected.name}</div>
            <div className="mt-1 text-base font-semibold text-brand-900 underline">Tap to change</div>
          </div>
          <Icon name="right" className="size-7 shrink-0 text-neutral-600" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-20 w-full items-center gap-4 rounded-3xl border-2 border-dashed border-neutral-300 bg-white p-4 text-left"
        >
          <span className="grid size-14 place-items-center rounded-full bg-brand-300">
            <Icon name="search" className="size-7" />
          </span>
          <span className="flex-1">
            <span className="block text-xl font-bold">Tap to choose vendor</span>
            <span className="block text-base text-neutral-600">Search or pick from the list</span>
          </span>
          <Icon name="right" className="size-7 text-neutral-400" />
        </button>
      )}

      <Modal open={open} onClose={close} title="Choose vendor">
        <div className="relative mb-3">
          <Icon name="search" className="absolute left-4 top-1/2 size-6 -translate-y-1/2 text-neutral-400" />
          <input
            className={`${inputCls} pl-12`}
            placeholder="Type a name to search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus={vendors.length > 8}
            enterKeyHint="search"
          />
        </div>

        <button
          type="button"
          onClick={() => { close(); onNewVendor?.(); }}
          className="mb-3 flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 border-dashed border-neutral-300 px-4 text-lg font-bold"
        >
          <span className="grid size-12 place-items-center rounded-full bg-brand-300"><Icon name="plus" stroke={3} /></span>
          Add a new vendor
        </button>

        {list.length === 0 ? (
          <p className="py-6 text-center text-lg text-neutral-600">
            {vendors.length === 0 ? 'No vendors yet. Add one above.' : `No vendor named "${q}".`}
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {list.map((v) => {
              const on = v.id === value;
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => pick(v.id)}
                    className={`flex min-h-20 w-full items-center gap-4 rounded-2xl px-2 text-left ${on ? 'bg-brand-100' : 'active:bg-neutral-100'}`}
                  >
                    <Avatar name={v.name} src={v.photoUrl} className="size-14 text-xl" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xl font-bold">{v.name}</span>
                      {v.phone && <span className="block text-base text-neutral-600">{v.phone}</span>}
                    </span>
                    {on && <Icon name="check" className="size-7 text-brand-700" stroke={3} />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </>
  );
}
