import { useState } from 'react';
import { markReturned, useStore } from '../lib/store.js';
import { back } from '../lib/router.js';
import { Button, Card, Empty, ItemThumb, PageHeader, Stepper } from '../components/ui.jsx';
import { peso } from '../lib/utils.js';
import { flags } from './TxDetail.jsx';

export default function ReturnForm({ id }) {
  const s = useStore();
  const tx = s.transactions.find((t) => t.id === id);
  const [ret, setRet] = useState(() =>
    Object.fromEntries((tx?.lines ?? []).map((l) => [l.itemId, tx.status === 'returned' ? l.returned || 0 : 0]))
  );

  if (!tx) return (<div><PageHeader title="Returned items" /><Empty title="Record not found" /></div>);

  const vendor = s.vendors.find((v) => v.id === tx.vendorId);
  let owed = 0, sold = 0;
  for (const l of tx.lines) {
    const n = l.qty - (ret[l.itemId] || 0);
    sold += n;
    owed += n * l.price;
  }

  const submit = () => {
    markReturned(tx.id, ret);
    flags.justReturned = tx.id;
    back(`#/tx/${tx.id}`);
  };

  return (
    <div>
      <PageHeader title="Returned items" subtitle={vendor?.name} backTo={`#/tx/${tx.id}`} />

      <p className="mb-4 rounded-2xl bg-amber-50 p-4 text-lg text-amber-900">
        How many pieces did <b>{vendor?.name ?? 'the vendor'}</b> bring back <b>unsold</b>? Put <b>0</b> if all were sold.
      </p>

      <div className="space-y-3">
        {tx.lines.map((l) => {
          const r = ret[l.itemId] || 0;
          const n = l.qty - r;
          return (
            <Card key={l.itemId} className="!p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <ItemThumb item={s.items.find((x) => x.id === l.itemId) ?? l} />
                <div className="min-w-0 flex-1">
                  <div className="text-xl font-bold">{l.name}</div>
                  <div className="text-base text-neutral-600">Took <b className="text-neutral-900">{l.qty}</b> pcs</div>
                </div>
                <Stepper value={r} max={l.qty} onChange={(v) => setRet((x) => ({ ...x, [l.itemId]: v }))} label={`${l.name} returned`} />
              </div>
              <div className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-lg text-neutral-700">
                {l.qty} − {r} = <b className="text-neutral-900">{n} sold</b> × {peso(l.price)} = <b className="text-neutral-900">{peso(n * l.price)}</b>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-lg text-neutral-700">{sold} sold · Vendor owes</span>
            <span className="text-3xl font-extrabold">{peso(owed)}</span>
          </div>
          <Button className="w-full" variant="dark" icon="check" onClick={submit}>
            Save & compute
          </Button>
        </div>
      </div>
    </div>
  );
}
