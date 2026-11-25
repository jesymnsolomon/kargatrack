import { useMemo } from 'react';
import { useStore } from '../lib/store.js';
import { go } from '../lib/router.js';
import { Button, Card, Empty, PageHeader, TxCard } from '../components/ui.jsx';
import { byId, calcTx, parseDate, peso } from '../lib/utils.js';

export default function DayView({ groupId, date }) {
  const s = useStore();
  const group = s.groups.find((g) => g.id === groupId);
  const vendors = useMemo(() => byId(s.vendors), [s.vendors]);

  const { list, t } = useMemo(() => {
    const list = s.transactions
      .filter((x) => x.groupId === groupId && x.date === date)
      .sort((a, b) => a.time.localeCompare(b.time));
    const t = { owed: 0, paid: 0, unpaid: 0, vsales: 0, earn: 0, out: 0 };
    for (const x of list) {
      if (x.status !== 'returned') { t.out++; continue; }
      const c = calcTx(x);
      t.owed += c.owed; t.vsales += c.vsales; t.earn += c.earn;
      if (x.paid) t.paid += c.owed; else t.unpaid += c.owed;
    }
    return { list, t };
  }, [s.transactions, groupId, date]);

  if (!date) return null;

  return (
    <div>
      <PageHeader title={`${group?.emoji ?? ''} ${group?.name ?? 'Records'}`} subtitle={parseDate(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} backTo={`#/records/${groupId}`} />

      <Card className="!bg-brand-200">
        <p className="text-lg font-semibold text-neutral-700">Total sales this day</p>
        <p className="text-4xl font-extrabold">{peso(t.owed)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/70 p-3">
            <p className="text-base text-neutral-700">Paid</p>
            <p className="text-2xl font-bold text-brand-700">{peso(t.paid)}</p>
          </div>
          <div className="rounded-2xl bg-white/70 p-3">
            <p className="text-base text-neutral-700">Not yet paid</p>
            <p className="text-2xl font-bold text-red-700">{peso(t.unpaid)}</p>
          </div>
        </div>
        <p className="mt-3 text-base text-neutral-700">
          Vendors earned <b>{peso(t.earn)}</b> in total
          {t.out > 0 && <> · <b>{t.out}</b> still out</>}
        </p>
      </Card>

      <Button className="my-5 w-full" icon="plus" onClick={() => go(`#/new?group=${groupId}&date=${date}`)}>
        Add record for this day
      </Button>

      <h2 className="mb-3 text-xl font-bold">Vendors ({list.length})</h2>
      {list.length === 0 ? (
        <Empty icon="user" title="No vendors on this day" />
      ) : (
        <div className="space-y-3">
          {list.map((x) => (
            <TxCard key={x.id} tx={x} vendor={vendors[x.vendorId]} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
