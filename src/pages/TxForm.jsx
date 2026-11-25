import { useMemo, useState } from 'react';
import { addTransaction, updateTransaction, useStore } from '../lib/store.js';
import { go } from '../lib/router.js';
import { Button, Card, Empty, ItemThumb, PageHeader, Stepper, inputCls } from '../components/ui.jsx';
import VendorPicker from '../components/VendorPicker.jsx';
import { ItemModal, VendorModal } from '../components/forms.jsx';
import { nowTime, peso, todayStr } from '../lib/utils.js';

function Step({ n, title, children }) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 flex items-center gap-3 text-xl font-bold">
        <span className="grid size-9 place-items-center rounded-full bg-neutral-900 text-base text-white">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function TxForm({ editId, query }) {
  const s = useStore();
  const existing = editId ? s.transactions.find((t) => t.id === editId) : null;
  const activeGroups = s.groups.filter((g) => !g.archived);

  const [groupId, setGroupId] = useState(existing?.groupId ?? query.group ?? activeGroups[0]?.id);
  const [vendorId, setVendorId] = useState(existing?.vendorId ?? query.vendor ?? null);
  const [date, setDate] = useState(existing?.date ?? query.date ?? todayStr());
  const [time, setTime] = useState(existing?.time ?? nowTime());
  const [qty, setQty] = useState(() => (existing ? Object.fromEntries(existing.lines.map((l) => [l.itemId, l.qty])) : {}));
  const [vendorModal, setVendorModal] = useState(false);
  const [itemModal, setItemModal] = useState(false);

  const group = s.groups.find((g) => g.id === groupId);
  const vendors = s.vendors.filter((v) => !v.archived || v.id === vendorId);
  const recentVendorIds = useMemo(() => {
    const seen = new Set();
    const ids = [];
    for (const t of [...s.transactions].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))) {
      if (!seen.has(t.vendorId)) { seen.add(t.vendorId); ids.push(t.vendorId); }
      if (ids.length > 50) break;
    }
    return ids;
  }, [s.transactions]);

  // Items of this group (+ any item already in the record being edited, even if removed since)
  const items = useMemo(() => {
    const inRecord = new Set(existing?.groupId === groupId ? existing.lines.map((l) => l.itemId) : []);
    const list = s.items.filter((i) => i.groupId === groupId && (!i.archived || inRecord.has(i.id)));
    // Keep record's saved price for items already in it
    if (existing) {
      for (const l of existing.lines) {
        const idx = list.findIndex((i) => i.id === l.itemId);
        if (idx >= 0) list[idx] = { ...list[idx], price: l.price, srp: l.srp };
        else if (existing.groupId === groupId) list.push({ id: l.itemId, name: l.name, price: l.price, srp: l.srp, groupId });
      }
    }
    return list;
  }, [s.items, groupId, existing]);

  const units = items.reduce((a, i) => a + (qty[i.id] || 0), 0);
  const total = items.reduce((a, i) => a + (qty[i.id] || 0) * i.price, 0);
  const canSave = groupId && vendorId && units > 0 && date && time;
  const vendor = s.vendors.find((v) => v.id === vendorId);

  const save = () => {
    if (!canSave) return;
    const lines = items
      .filter((i) => qty[i.id] > 0)
      .map((i) => {
        const old = existing?.lines.find((l) => l.itemId === i.id);
        return {
          itemId: i.id, name: i.name, price: i.price, srp: i.srp, qty: qty[i.id],
          ...(old?.returned ? { returned: Math.min(old.returned, qty[i.id]) } : {}),
        };
      });
    if (existing) {
      updateTransaction(existing.id, { groupId, vendorId, date, time, lines });
      go(`#/tx/${existing.id}`, { replace: true });
    } else {
      const id = addTransaction({ groupId, vendorId, date, time, lines });
      go(`#/tx/${id}`, { replace: true });
    }
  };

  return (
    <div>
      <PageHeader title={existing ? 'Edit record' : 'New record'} subtitle="Give items to a vendor" />

      {/* 1. Group */}
      <Step n={1} title="What are you giving?">
        <div className="grid grid-cols-3 gap-3">
          {activeGroups.map((g) => (
            <button
              key={g.id}
              onClick={() => { setGroupId(g.id); if (!existing || existing.groupId !== g.id) setQty({}); }}
              className={`flex flex-col items-center gap-1 rounded-3xl px-2 py-4 transition ${
                g.id === groupId ? 'bg-brand-300 ring-4 ring-brand-500' : 'bg-white'
              }`}
              aria-pressed={g.id === groupId}
            >
              <span className="text-4xl">{g.emoji}</span>
              <span className="text-lg font-bold leading-tight">{g.name}</span>
            </button>
          ))}
        </div>
      </Step>

      {/* 2. Vendor */}
      <Step n={2} title="Which vendor?">
        <VendorPicker
          vendors={vendors}
          value={vendorId}
          onChange={setVendorId}
          recentIds={recentVendorIds}
          onNewVendor={() => setVendorModal(true)}
        />
      </Step>

      {/* 3. Date & time */}
      <Step n={3} title="When?">
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          <label>
            <span className="mb-1 block text-base font-semibold text-neutral-600">Date</span>
            <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-base font-semibold text-neutral-600">Time</span>
            <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>
      </Step>

      {/* 4. Items */}
      <Step n={4} title="How many of each?">
        {items.length === 0 ? (
          <Empty title={`No ${group?.name ?? ''} items yet`} text="Add the items you give to vendors, with their prices.">
            <Button icon="plus" onClick={() => setItemModal(true)}>Add item</Button>
          </Empty>
        ) : (
          <div className="space-y-3">
            {items.map((i) => (
              <Card key={i.id} className="flex flex-wrap items-center justify-between gap-3 !p-4">
                <ItemThumb item={s.items.find((x) => x.id === i.id) ?? i} fallback={group?.emoji} />
                <div className="min-w-0 flex-1">
                  <div className="text-xl font-bold">{i.name}</div>
                  <div className="text-base text-neutral-600">{peso(i.price)} each</div>
                </div>
                <Stepper value={qty[i.id] || 0} onChange={(v) => setQty((q) => ({ ...q, [i.id]: v }))} label={i.name} />
              </Card>
            ))}
            <button onClick={() => setItemModal(true)} className="w-full rounded-2xl border-2 border-dashed border-neutral-300 py-4 text-lg font-bold text-neutral-700">
              + Add another item
            </button>
          </div>
        )}
      </Step>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="mb-2 flex items-baseline justify-between text-lg">
            <span className="truncate text-neutral-700">
              {vendor ? <b className="text-neutral-900">{vendor.name}</b> : 'Pick a vendor'} · {units} pcs
            </span>
            <span className="shrink-0 text-neutral-700">If all sold: <b className="text-neutral-900">{peso(total)}</b></span>
          </div>
          <Button className="w-full" variant="dark" icon="check" disabled={!canSave} onClick={save}>
            {!vendorId ? 'Choose a vendor first' : units === 0 ? 'Add at least 1 item' : 'Save record'}
          </Button>
        </div>
      </div>

      <VendorModal open={vendorModal} onClose={() => setVendorModal(false)} vendor={null} onSaved={setVendorId} />
      <ItemModal open={itemModal} onClose={() => setItemModal(false)} item={null} groupId={groupId} groupName={group?.name} />
    </div>
  );
}
