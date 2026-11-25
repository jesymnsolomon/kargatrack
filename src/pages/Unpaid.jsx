import { useMemo } from 'react';
import { useStore } from '../lib/store.js';
import { Card, Empty, PageHeader, TxCard } from '../components/ui.jsx';
import { byId, calcTx, isUnpaid, peso } from '../lib/utils.js';

export default function Unpaid() {
  const s = useStore();
  const vendors = useMemo(() => byId(s.vendors), [s.vendors]);
  const groups = useMemo(() => byId(s.groups), [s.groups]);

  const { list, total, perVendor } = useMemo(() => {
    const list = s.transactions.filter(isUnpaid).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    let total = 0;
    const pv = new Map();
    for (const t of list) {
      const o = calcTx(t).owed;
      total += o;
      pv.set(t.vendorId, (pv.get(t.vendorId) || 0) + o);
    }
    const perVendor = [...pv.entries()].sort((a, b) => b[1] - a[1]);
    return { list, total, perVendor };
  }, [s.transactions]);

  return (
    <div>
      <PageHeader title="Not yet paid" subtitle="Vendors who still owe you" />
      <Card className="!bg-red-50">
        <p className="text-lg font-semibold text-red-900">Total still owed</p>
        <p className="text-4xl font-extrabold text-red-700">{peso(total)}</p>
        {perVendor.length > 0 && (
          <ul className="mt-3 divide-y divide-red-100">
            {perVendor.map(([vid, amt]) => (
              <li key={vid} className="flex justify-between py-2 text-lg">
                <span>{vendors[vid]?.name ?? 'Unknown'}</span>
                <b>{peso(amt)}</b>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <h2 className="mb-3 mt-6 text-xl font-bold">Records ({list.length})</h2>
      {list.length === 0 ? (
        <Empty icon="check" title="Everyone has paid!" />
      ) : (
        <div className="space-y-3">
          {list.map((t) => (
            <TxCard key={t.id} tx={t} vendor={vendors[t.vendorId]} group={groups[t.groupId]} showGroup showDate />
          ))}
        </div>
      )}
    </div>
  );
}
