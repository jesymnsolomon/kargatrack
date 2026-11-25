import { useEffect, useRef, useState } from 'react';
import { deleteTransaction, setPaid, undoReturn, useStore } from '../lib/store.js';
import { back, go } from '../lib/router.js';
import { Avatar, Button, Card, Confirm, Empty, Icon, ItemThumb, PageHeader, StatusPill } from '../components/ui.jsx';
import { calcTx, fmtDateLong, fmtTime, peso } from '../lib/utils.js';

// Set by the Return form so we can scroll to the "Did vendor pay?" question.
export const flags = { justReturned: null };

export default function TxDetail({ id }) {
  const s = useStore();
  const tx = s.transactions.find((t) => t.id === id);
  const [confirm, setConfirm] = useState(null);
  const payRef = useRef(null);

  useEffect(() => {
    if (flags.justReturned === id && payRef.current) {
      flags.justReturned = null;
      setTimeout(() => payRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    }
  }, [id, tx?.status]);

  if (!tx) {
    return (
      <div>
        <PageHeader title="Record" />
        <Empty title="Record not found" text="It may have been deleted." />
      </div>
    );
  }

  const vendor = s.vendors.find((v) => v.id === tx.vendorId);
  const group = s.groups.find((g) => g.id === tx.groupId);
  const c = calcTx(tx);
  const returned = c.isReturned;

  return (
    <div>
      <PageHeader title="Record" subtitle={`${group?.emoji ?? ''} ${group?.name ?? ''}`} backTo={`#/day/${tx.groupId}/${tx.date}`} />

      {/* Vendor info */}
      <Card className="flex items-center gap-4">
        <Avatar name={vendor?.name} src={vendor?.photoUrl} className="size-20 text-2xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-2xl font-extrabold">{vendor?.name ?? 'Unknown vendor'}</p>
          <p className="text-base text-neutral-600">{fmtDateLong(tx.date)}</p>
          <p className="text-base text-neutral-600">Taken at {fmtTime(tx.time)}</p>
        </div>
      </Card>
      <div className="mt-3 flex justify-center">
        <StatusPill tx={tx} big />
      </div>

      {!returned ? (
        <>
          {/* Items taken */}
          <Card className="mt-4">
            <h2 className="mb-3 text-xl font-bold">Items taken</h2>
            <ul className="divide-y divide-neutral-100">
              {c.lines.map((l) => (
                <li key={l.itemId} className="flex items-center gap-3 py-3 text-xl">
                  <ItemThumb item={s.items.find((x) => x.id === l.itemId) ?? l} fallback={group?.emoji} className="size-12" />
                  <span className="flex-1">{l.name}</span>
                  <span className="font-bold">{l.qty} pcs</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t-2 border-neutral-200 pt-3 text-lg">
              <span className="text-neutral-600">Total pieces</span>
              <b>{c.took} pcs</b>
            </div>
          </Card>

          {/* The one big button */}
          <div className="mt-6">
            <Button className="min-h-20 w-full text-2xl" icon="undo" onClick={() => go(`#/tx/${tx.id}/return`)}>
              Vendor returned
            </Button>
            <p className="mt-2 text-center text-base text-neutral-600">Press this when the vendor comes back with unsold items.</p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <Button variant="light" icon="edit" onClick={() => go(`#/edit/${tx.id}`)}>Edit</Button>
            <Button variant="dangerSoft" icon="trash" onClick={() => setConfirm('delete')}>Delete</Button>
          </div>
        </>
      ) : (
        <>
          {/* Computation */}
          <Card className="mt-4">
            <h2 className="mb-1 text-xl font-bold">Computation</h2>
            <p className="mb-3 text-base text-neutral-600">Taken − Returned = Sold × Price</p>
            <ul className="space-y-3">
              {c.lines.map((l) => (
                <li key={l.itemId} className="rounded-2xl bg-neutral-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-3 text-xl font-bold">
                      <ItemThumb item={s.items.find((x) => x.id === l.itemId) ?? l} fallback={group?.emoji} className="size-12" />
                      {l.name}
                    </span>
                    <span className="text-xl font-extrabold">{peso(l.owed)}</span>
                  </div>
                  <div className="mt-1 text-lg text-neutral-700">
                    {l.qty} − {l.returnedQty} = <b>{l.sold} sold</b> × {peso(l.price)}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-2xl bg-brand-200 p-4">
              <p className="text-lg font-semibold text-neutral-700">Vendor owes you</p>
              <p className="text-4xl font-extrabold">{peso(c.owed)}</p>
              <p className="text-base text-neutral-700">{c.sold} sold · {c.ret} returned</p>
            </div>
          </Card>

          {/* Payment */}
          <div ref={payRef}>
            <Card className={`mt-4 ${tx.paid == null ? 'ring-4 ring-amber-300' : ''}`}>
              <h2 className="text-xl font-bold">Did the vendor pay?</h2>
              <p className="mb-4 text-base text-neutral-600">Amount: <b className="text-neutral-900">{peso(c.owed)}</b></p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaid(tx.id, true)}
                  aria-pressed={tx.paid === true}
                  className={`flex min-h-20 flex-col items-center justify-center rounded-2xl text-xl font-extrabold transition ${
                    tx.paid === true ? 'bg-brand-500 text-white ring-4 ring-brand-300' : 'bg-neutral-100 text-neutral-800'
                  }`}
                >
                  <Icon name="check" className="size-7" stroke={3} />
                  Yes, paid
                </button>
                <button
                  onClick={() => setPaid(tx.id, false)}
                  aria-pressed={tx.paid === false}
                  className={`flex min-h-20 flex-col items-center justify-center rounded-2xl text-xl font-extrabold transition ${
                    tx.paid === false ? 'bg-red-600 text-white ring-4 ring-red-200' : 'bg-neutral-100 text-neutral-800'
                  }`}
                >
                  <Icon name="x" className="size-7" stroke={3} />
                  Not yet
                </button>
              </div>
              {tx.paid && tx.paidAt && (
                <p className="mt-3 text-center text-base text-neutral-600">
                  Marked paid on {new Date(tx.paidAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </p>
              )}
            </Card>
          </div>

          {/* Vendor's side */}
          <Card className="mt-4">
            <h2 className="mb-1 text-xl font-bold">Vendor's side</h2>
            <p className="mb-3 text-base text-neutral-600">What the vendor made from selling</p>
            <ul className="divide-y divide-neutral-100">
              {c.lines.map((l) => (
                <li key={l.itemId} className="flex items-baseline justify-between gap-2 py-2.5 text-lg">
                  <span>
                    {l.name}: {l.sold} × {peso(l.srp - l.price)}
                  </span>
                  <b>{peso(l.earn)}</b>
                </li>
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-neutral-100 p-3">
                <p className="text-base text-neutral-600">Vendor's total sales</p>
                <p className="text-2xl font-bold">{peso(c.vsales)}</p>
              </div>
              <div className="rounded-2xl bg-brand-50 p-3">
                <p className="text-base text-neutral-600">Vendor's earnings</p>
                <p className="text-2xl font-bold text-brand-700">{peso(c.earn)}</p>
              </div>
            </div>
          </Card>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <Button variant="light" icon="edit" onClick={() => go(`#/tx/${tx.id}/return`)}>Fix returns</Button>
            <Button variant="light" icon="undo" onClick={() => setConfirm('undo')}>Undo return</Button>
            <Button variant="dangerSoft" icon="trash" className="col-span-2" onClick={() => setConfirm('delete')}>Delete record</Button>
          </div>
        </>
      )}

      <Confirm
        open={confirm === 'delete'}
        title="Delete this record?"
        message="This cannot be undone."
        confirmLabel="Yes, delete"
        danger
        onConfirm={() => { deleteTransaction(tx.id); back(`#/day/${tx.groupId}/${tx.date}`); }}
        onClose={() => setConfirm(null)}
      />
      <Confirm
        open={confirm === 'undo'}
        title="Undo the return?"
        message="The record will go back to 'Out selling' and the payment status will be cleared."
        confirmLabel="Yes, undo"
        onConfirm={() => undoReturn(tx.id)}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
