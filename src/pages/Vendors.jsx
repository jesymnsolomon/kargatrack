import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.js';
import { Avatar, Button, Card, Empty, Icon, Link, Tabs, inputCls } from '../components/ui.jsx';
import { VendorModal } from '../components/forms.jsx';
import { addMonths, bestVendor, dayLabel, fmtYM, monthRange, peso, todayStr, vendorStats } from '../lib/utils.js';

const SORTS = [
  { value: 'sales', label: 'Most sales' },
  { value: 'times', label: 'Most times' },
  { value: 'name', label: 'A–Z' },
];

export default function Vendors() {
  const s = useStore();
  const thisMonth = todayStr().slice(0, 7);
  const [ym, setYm] = useState(thisMonth);
  const [gid, setGid] = useState('all');
  const [sort, setSort] = useState('sales');
  const [q, setQ] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const vendors = useMemo(() => s.vendors.filter((v) => !v.archived), [s.vendors]);
  const byIdMap = useMemo(() => Object.fromEntries(s.vendors.map((v) => [v.id, v])), [s.vendors]);

  const month = useMemo(() => vendorStats(s.transactions, ...monthRange(ym), gid), [s.transactions, ym, gid]);
  const allTime = useMemo(() => vendorStats(s.transactions, '0000', '9999', gid), [s.transactions, gid]);
  const unpaidAll = useMemo(() => vendorStats(s.transactions), [s.transactions]); // unpaid balance across all groups
  const out = useMemo(() => new Set(s.transactions.filter((t) => t.status === 'out').map((t) => t.vendorId)), [s.transactions]);

  const bestMonth = bestVendor(month);
  const bestEver = bestVendor(allTime);

  let monthTotal = 0, monthTimes = 0;
  for (const v of month.values()) { monthTotal += v.sales; monthTimes += v.times; }

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = vendors
      .filter((v) => !query || v.name.toLowerCase().includes(query))
      .map((v) => ({ v, m: month.get(v.id), unpaid: unpaidAll.get(v.id)?.unpaid || 0 }));
    const by = {
      sales: (a, b) => (b.m?.sales || 0) - (a.m?.sales || 0) || a.v.name.localeCompare(b.v.name),
      times: (a, b) => (b.m?.times || 0) - (a.m?.times || 0) || (b.m?.sales || 0) - (a.m?.sales || 0),
      name: (a, b) => a.v.name.localeCompare(b.v.name),
    };
    return list.sort(by[sort]);
  }, [vendors, month, unpaidAll, sort, q]);

  const groups = s.groups.filter((g) => !g.archived);

  return (
    <div>
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Vendors</h1>
          <p className="text-lg text-neutral-600">{vendors.length} vendor{vendors.length === 1 ? '' : 's'}</p>
        </div>
        <Button icon="plus" onClick={() => setAddOpen(true)}>Add</Button>
      </header>

      {/* Month picker */}
      <Card className="mb-4 flex items-center justify-between gap-2 !p-3">
        <button onClick={() => setYm(addMonths(ym, -1))} className="grid size-12 place-items-center rounded-full bg-neutral-100" aria-label="Previous month">
          <Icon name="left" />
        </button>
        <span className="text-center leading-tight">
          {ym === thisMonth && <span className="block text-sm font-semibold text-brand-700">This month</span>}
          <span className="text-xl font-bold">{fmtYM(ym)}</span>
        </span>
        <button onClick={() => setYm(addMonths(ym, 1))} disabled={ym >= thisMonth} className="grid size-12 place-items-center rounded-full bg-neutral-100 disabled:opacity-30" aria-label="Next month">
          <Icon name="right" />
        </button>
      </Card>

      <Tabs
        options={[{ value: 'all', label: 'All' }, ...groups.map((g) => ({ value: g.id, label: `${g.emoji} ${g.name}` }))]}
        value={gid}
        onChange={setGid}
      />

      {/* Best vendor */}
      <Card className="!bg-brand-200">
        <p className="flex items-center gap-2 text-lg font-semibold text-neutral-700"><Icon name="trophy" className="size-6 text-amber-600" /> Best vendor {ym === thisMonth ? 'this month' : `in ${fmtYM(ym).split(' ')[0]}`}</p>
        {bestMonth ? (
          <Link to={`#/vendor/${bestMonth[0]}`} className="mt-3 flex items-center gap-4">
            <Avatar name={byIdMap[bestMonth[0]]?.name} src={byIdMap[bestMonth[0]]?.photoUrl} className="size-20 text-3xl ring-4 ring-white" />
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-extrabold leading-tight break-words">{byIdMap[bestMonth[0]]?.name ?? 'Unknown'}</p>
              <p className="text-3xl font-extrabold">{peso(bestMonth[1].sales)}</p>
              <p className="text-base text-neutral-700">Sold {bestMonth[1].times} time{bestMonth[1].times === 1 ? '' : 's'} · {bestMonth[1].units} pcs</p>
            </div>
          </Link>
        ) : (
          <p className="mt-2 text-lg text-neutral-700">No sales yet for this month.</p>
        )}
        {bestEver && (
          <Link to={`#/vendor/${bestEver[0]}`} className="mt-4 flex items-center gap-3 rounded-2xl bg-white/70 p-3">
            <Avatar name={byIdMap[bestEver[0]]?.name} src={byIdMap[bestEver[0]]?.photoUrl} className="size-12 text-base" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-neutral-600">Best so far (all time)</p>
              <p className="truncate text-lg font-bold">{byIdMap[bestEver[0]]?.name ?? 'Unknown'}</p>
            </div>
            <span className="text-lg font-extrabold">{peso(bestEver[1].sales)}</span>
          </Link>
        )}
      </Card>

      {/* Month summary */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Card className="!p-4">
          <p className="text-base font-semibold text-neutral-600">Total sales</p>
          <p className="text-2xl font-extrabold">{peso(monthTotal)}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-base font-semibold text-neutral-600">Times sold</p>
          <p className="text-2xl font-extrabold">{monthTimes}</p>
        </Card>
      </div>

      {/* List */}
      <div className="mb-3 mt-7 flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold">All vendors</h2>
      </div>
      {vendors.length > 6 && (
        <div className="relative mb-3">
          <Icon name="search" className="absolute left-4 top-1/2 size-6 -translate-y-1/2 text-neutral-400" />
          <input className={`${inputCls} pl-12`} placeholder="Search vendor name" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}
      <Tabs options={SORTS} value={sort} onChange={setSort} />

      {vendors.length === 0 ? (
        <Empty icon="user" title="No vendors yet" text="Add the people who take items from you to sell.">
          <Button icon="plus" onClick={() => setAddOpen(true)}>Add vendor</Button>
        </Empty>
      ) : (
        <div className="space-y-3">
          {rows.map(({ v, m, unpaid }, i) => (
            <Link key={v.id} to={`#/vendor/${v.id}`} className="block">
              <Card className="!p-4 active:scale-[0.99]">
                <div className="flex items-center gap-3">
                  {sort !== 'name' && m && (
                    <span className={`w-6 shrink-0 text-center text-xl font-extrabold ${i === 0 ? 'text-brand-700' : 'text-neutral-400'}`}>{i + 1}</span>
                  )}
                  <Avatar name={v.name} src={v.photoUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xl font-bold">{v.name}</p>
                    <p className="text-base text-neutral-600">
                      {m ? `Sold ${m.times} time${m.times === 1 ? '' : 's'} · ${m.units} pcs` : 'No sales this month'}
                    </p>
                  </div>
                  <Icon name="right" className="size-6 shrink-0 text-neutral-400" />
                </div>
                <div className="mt-3 flex items-end justify-between gap-2 border-t border-neutral-100 pt-3">
                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    {out.has(v.id) && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-bold text-amber-800">Out selling</span>}
                    {unpaid > 0 && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-sm font-bold text-red-700">Owes {peso(unpaid)}</span>}
                    {m?.lastDate && <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-sm text-neutral-700">Last: {dayLabel(m.lastDate)}</span>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm text-neutral-500">Sales</p>
                    <p className="text-2xl font-extrabold">{peso(m?.sales || 0)}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <VendorModal open={addOpen} onClose={() => setAddOpen(false)} vendor={null} />
    </div>
  );
}
