import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.js';
import { go } from '../lib/router.js';
import { Avatar, BarChart, Button, Card, Empty, Icon, PageHeader, SectionTitle, TxCard } from '../components/ui.jsx';
import { VendorModal } from '../components/forms.jsx';
import { addMonths, byId, monthRange, peso, todayStr, vendorStats } from '../lib/utils.js';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function Stat({ label, value, sub, cls = '' }) {
  return (
    <div className={`rounded-2xl bg-neutral-100 p-3 ${cls}`}>
      <p className="text-base text-neutral-600">{label}</p>
      <p className="text-2xl font-extrabold">{value}</p>
      {sub && <p className="text-sm text-neutral-600">{sub}</p>}
    </div>
  );
}

export default function VendorProfile({ id }) {
  const s = useStore();
  const [edit, setEdit] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const vendor = s.vendors.find((v) => v.id === id);
  const groups = useMemo(() => byId(s.groups), [s.groups]);
  const thisMonth = todayStr().slice(0, 7);

  const mine = useMemo(
    () => s.transactions.filter((t) => t.vendorId === id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
    [s.transactions, id]
  );
  const month = useMemo(() => vendorStats(mine, ...monthRange(thisMonth)).get(id), [mine, id, thisMonth]);
  const all = useMemo(() => vendorStats(mine).get(id), [mine, id]);

  // Rank this month among all vendors
  const rank = useMemo(() => {
    const list = [...vendorStats(s.transactions, ...monthRange(thisMonth)).entries()].sort((a, b) => b[1].sales - a[1].sales);
    const i = list.findIndex(([vid]) => vid === id);
    return i >= 0 ? { pos: i + 1, of: list.length } : null;
  }, [s.transactions, id, thisMonth]);

  const chart = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const ym = addMonths(thisMonth, i - 5);
    const v = vendorStats(mine, ...monthRange(ym)).get(id);
    return { label: MON[Number(ym.slice(5)) - 1], value: v?.sales || 0, active: ym === thisMonth, full: ym, extra: v ? `sold ${v.times} times` : '' };
  }), [mine, id, thisMonth]);

  if (!vendor) {
    return (
      <div>
        <PageHeader title="Vendor" backTo="#/vendors" />
        <Empty title="Vendor not found" />
      </div>
    );
  }

  const outNow = mine.filter((t) => t.status === 'out').length;
  const shown = showAll ? mine : mine.slice(0, 10);

  return (
    <div>
      <PageHeader
        title="Vendor"
        backTo="#/vendors"
        right={
          <button onClick={() => setEdit(true)} className="grid size-14 place-items-center rounded-full bg-white shadow-sm" aria-label="Edit vendor">
            <Icon name="edit" />
          </button>
        }
      />

      <Card className="flex flex-col items-center text-center">
        <Avatar name={vendor.name} src={vendor.photoUrl} className="size-32 text-5xl" />
        <h2 className="mt-3 text-3xl font-extrabold">{vendor.name}</h2>
        {vendor.archived && <p className="text-base font-semibold text-red-700">Removed vendor</p>}
        {vendor.phone && (
          <a href={`tel:${vendor.phone.replace(/\s/g, '')}`} className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-neutral-100 px-4 text-lg font-semibold">
            <Icon name="phone" /> {vendor.phone}
          </a>
        )}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {rank && rank.pos === 1 && <span className="rounded-full bg-brand-300 px-3 py-1 text-base font-bold"><Icon name="trophy" className="mr-1 inline size-5 align-[-3px]" />#1 this month</span>}
          {rank && rank.pos > 1 && <span className="rounded-full bg-neutral-100 px-3 py-1 text-base font-bold">#{rank.pos} of {rank.of} this month</span>}
          {outNow > 0 && <span className="rounded-full bg-amber-100 px-3 py-1 text-base font-bold text-amber-800">Out selling now</span>}
        </div>
      </Card>

      {!vendor.archived && (
        <Button className="mt-4 w-full" icon="plus" onClick={() => go(`#/new?vendor=${vendor.id}`)}>
          New record for {vendor.name}
        </Button>
      )}

      <SectionTitle>This month</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Times sold" value={month?.times || 0} sub={`${month?.units || 0} pcs sold`} cls="!bg-white" />
        <Stat label="Sales" value={peso(month?.sales || 0)} sub="owed to you" cls="!bg-brand-200" />
        <Stat label="Vendor earned" value={peso(month?.earn || 0)} cls="!bg-white" />
        <Stat
          label="Not yet paid"
          value={peso(all?.unpaid || 0)}
          sub="all unpaid records"
          cls={(all?.unpaid || 0) > 0 ? '!bg-red-50 text-red-800' : '!bg-white'}
        />
      </div>

      <SectionTitle>All time</SectionTitle>
      <Card className="grid grid-cols-3 gap-2 text-center !p-4">
        <div><p className="text-sm text-neutral-600">Times sold</p><p className="text-xl font-extrabold">{all?.times || 0}</p></div>
        <div><p className="text-sm text-neutral-600">Pieces</p><p className="text-xl font-extrabold">{all?.units || 0}</p></div>
        <div><p className="text-sm text-neutral-600">Sales</p><p className="text-xl font-extrabold">{peso(all?.sales || 0)}</p></div>
      </Card>

      <SectionTitle>Sales (last 6 months)</SectionTitle>
      <Card>
        <BarChart data={chart} height={180} />
      </Card>

      <SectionTitle>Records ({mine.length})</SectionTitle>
      {mine.length === 0 ? (
        <Empty icon="list" title="No records yet" />
      ) : (
        <div className="space-y-3">
          {shown.map((t) => (
            <TxCard key={t.id} tx={t} vendor={vendor} group={groups[t.groupId]} showGroup showDate />
          ))}
          {!showAll && mine.length > 10 && (
            <Button variant="light" className="w-full" onClick={() => setShowAll(true)}>Show all {mine.length} records</Button>
          )}
        </div>
      )}

      <VendorModal open={edit} onClose={() => setEdit(false)} vendor={vendor} />
    </div>
  );
}
