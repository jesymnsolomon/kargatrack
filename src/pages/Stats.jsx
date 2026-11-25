import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.js';
import { Avatar, BarChart, Card, Icon, ItemThumb, Link, SectionTitle, Tabs } from '../components/ui.jsx';
import {
  addDays, bestVendor, byId, calcTx, vendorStats, fmtDateLong, fmtShortDate, parseDate, peso, startOfWeek, todayStr,
} from '../lib/utils.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function NavRow({ label, onPrev, onNext, nextDisabled }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <button onClick={onPrev} className="grid size-12 place-items-center rounded-full bg-neutral-100" aria-label="Previous">
        <Icon name="left" />
      </button>
      <span className="text-center text-lg font-semibold">{label}</span>
      <button onClick={onNext} disabled={nextDisabled} className="grid size-12 place-items-center rounded-full bg-neutral-100 disabled:opacity-30" aria-label="Next">
        <Icon name="right" />
      </button>
    </div>
  );
}

function Kpi({ label, value, sub, accent }) {
  return (
    <Card className={`!p-4 ${accent ? '!bg-brand-200' : ''}`}>
      <p className="text-base font-semibold text-neutral-600">{label}</p>
      <p className="mt-1 text-2xl font-extrabold sm:text-3xl">{peso(value)}</p>
      {sub && <p className="text-base text-neutral-600">{sub}</p>}
    </Card>
  );
}

export default function Stats() {
  const s = useStore();
  const [gid, setGid] = useState('all');
  const today = todayStr();
  const thisWeek = startOfWeek(today);
  const [weekStart, setWeekStart] = useState(thisWeek);
  const [year, setYear] = useState(() => parseDate(today).getFullYear());

  const vendors = useMemo(() => byId(s.vendors), [s.vendors]);

  // One pass over returned records → totals per day. Everything else reads from this.
  const { daily, out, returnedTx } = useMemo(() => {
    const daily = new Map();
    let out = 0;
    const returnedTx = [];
    for (const t of s.transactions) {
      if (gid !== 'all' && t.groupId !== gid) continue;
      if (t.status !== 'returned') { out++; continue; }
      returnedTx.push(t);
      const c = calcTx(t);
      let d = daily.get(t.date);
      if (!d) { d = { sales: 0, units: 0, earn: 0, paid: 0, unpaid: 0, count: 0 }; daily.set(t.date, d); }
      d.sales += c.owed; d.units += c.sold; d.earn += c.earn; d.count++;
      if (t.paid) d.paid += c.owed; else d.unpaid += c.owed;
    }
    return { daily, out, returnedTx };
  }, [s.transactions, gid]);

  const sumRange = (from, to) => {
    const r = { sales: 0, units: 0, earn: 0, paid: 0, unpaid: 0, count: 0 };
    for (const [date, d] of daily) {
      if (date >= from && date <= to) {
        r.sales += d.sales; r.units += d.units; r.earn += d.earn; r.paid += d.paid; r.unpaid += d.unpaid; r.count += d.count;
      }
    }
    return r;
  };

  const yStr = today.slice(0, 4);
  const monthStart = today.slice(0, 8) + '01';
  const k = useMemo(() => ({
    today: sumRange(today, today),
    week: sumRange(thisWeek, today),
    month: sumRange(monthStart, today),
    year: sumRange(`${yStr}-01-01`, today),
    all: sumRange('0000', '9999'),
  }), [daily, today]); // eslint-disable-line react-hooks/exhaustive-deps

  // This-week chart (one bar per day)
  const weekData = useMemo(() => DOW.map((label, i) => {
    const d = addDays(weekStart, i);
    const v = daily.get(d);
    return { label, value: v?.sales || 0, active: d === today, full: fmtDateLong(d), extra: v ? `${v.units} pcs sold` : '' };
  }), [daily, weekStart, today]);
  const weekTotal = weekData.reduce((a, d) => a + d.value, 0);
  const bestDay = weekTotal > 0 ? weekData.reduce((b, d) => (d.value > b.value ? d : b)) : null;

  // Weekly chart: last 8 weeks
  const weeksData = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const ws = addDays(thisWeek, -7 * (7 - i));
    const r = sumRange(ws, addDays(ws, 6));
    const wd = parseDate(ws);
    return { label: wd.toLocaleDateString('en-US', { month: 'short' }), label2: String(wd.getDate()), value: r.sales, active: ws === thisWeek, full: `Week of ${fmtShortDate(ws)}`, extra: `${r.units} pcs sold` };
  }), [daily, thisWeek]); // eslint-disable-line react-hooks/exhaustive-deps

  // Monthly chart for selected year
  const monthsData = useMemo(() => MONTHS.map((label, m) => {
    const mm = String(m + 1).padStart(2, '0');
    const r = sumRange(`${year}-${mm}-01`, `${year}-${mm}-31`);
    return { label: label.slice(0, 3), value: r.sales, active: `${year}-${mm}` === today.slice(0, 7), full: `${label} ${year}`, extra: `${r.units} pcs sold` };
  }), [daily, year, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const yearTotal = monthsData.reduce((a, d) => a + d.value, 0);

  // Top vendors and items this month
  const { topVendors, topItems } = useMemo(() => {
    const v = new Map(), it = new Map();
    for (const t of returnedTx) {
      if (t.date < monthStart || t.date > today) continue;
      const c = calcTx(t);
      v.set(t.vendorId, (v.get(t.vendorId) || 0) + c.owed);
      for (const l of c.lines) {
        const cur = it.get(l.name) || { units: 0, sales: 0 };
        cur.units += l.sold; cur.sales += l.owed;
        it.set(l.name, cur);
      }
    }
    return {
      topVendors: [...v.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
      topItems: [...it.entries()].sort((a, b) => b[1].units - a[1].units).slice(0, 5),
    };
  }, [returnedTx, monthStart, today]);
  const maxVendor = topVendors[0]?.[1] || 1;
  const maxItem = topItems[0]?.[1].units || 1;

  const best = useMemo(() => bestVendor(vendorStats(s.transactions, '0000', '9999', gid)), [s.transactions, gid]);
  const bestV = best && vendors[best[0]];

  const groups = s.groups.filter((g) => !g.archived);
  const monthName = parseDate(today).toLocaleDateString('en-US', { month: 'long' });

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-3xl font-extrabold">Sales</h1>
        <p className="text-lg text-neutral-600">Sales = what vendors owe you for items they sold.</p>
      </header>

      <Tabs
        options={[{ value: 'all', label: 'All' }, ...groups.map((g) => ({ value: g.id, label: `${g.emoji} ${g.name}` }))]}
        value={gid}
        onChange={setGid}
      />

      <div className="grid grid-cols-2 gap-3">
        <Kpi label="Today" value={k.today.sales} sub={`${k.today.units} pcs sold`} accent />
        <Kpi label="This week" value={k.week.sales} sub={`${k.week.units} pcs sold`} />
        <Kpi label={`This month (${monthName})`} value={k.month.sales} sub={`${k.month.units} pcs sold`} />
        <Kpi label={`Year to date (${yStr})`} value={k.year.sales} sub={`${k.year.units} pcs sold`} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Card className="!p-4">
          <p className="text-base font-semibold text-neutral-600">Collected (all time)</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-700">{peso(k.all.paid)}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-base font-semibold text-neutral-600">Not yet paid</p>
          <p className="mt-1 text-2xl font-extrabold text-red-700">{peso(k.all.unpaid)}</p>
        </Card>
      </div>
      {out > 0 && (
        <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-base text-amber-900">
          {out} record{out === 1 ? ' is' : 's are'} still out selling and not counted yet.
        </p>
      )}

      {/* Best vendor so far */}
      {best && (
        <Link to={`#/vendor/${best[0]}`} className="mt-3 block">
          <Card className="!bg-brand-200">
            <p className="flex items-center gap-2 text-lg font-semibold text-neutral-700"><Icon name="trophy" className="size-6 text-amber-600" /> Best vendor so far</p>
            <div className="mt-3 flex items-center gap-4">
              <Avatar name={bestV?.name} src={bestV?.photoUrl} className="size-16 text-2xl ring-4 ring-white" />
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-extrabold leading-tight break-words">{bestV?.name ?? 'Unknown'}</p>
                <p className="text-2xl font-extrabold">{peso(best[1].sales)}</p>
                <p className="text-base text-neutral-700">Sold {best[1].times} time{best[1].times === 1 ? '' : 's'} · {best[1].units} pcs</p>
              </div>
              <Icon name="right" className="size-7 shrink-0 text-neutral-600" />
            </div>
          </Card>
        </Link>
      )}

      {/* Week by day */}
      <SectionTitle>Sales per day</SectionTitle>
      <Card>
        <NavRow
          label={weekStart === thisWeek ? 'This week' : `${fmtShortDate(weekStart)} – ${fmtShortDate(addDays(weekStart, 6))}`}
          onPrev={() => setWeekStart(addDays(weekStart, -7))}
          onNext={() => setWeekStart(addDays(weekStart, 7))}
          nextDisabled={weekStart >= thisWeek}
        />
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-base text-neutral-600">Week total</p>
            <p className="text-3xl font-extrabold">{peso(weekTotal)}</p>
          </div>
          {bestDay && (
            <div className="text-right">
              <p className="text-base text-neutral-600">Best day</p>
              <p className="text-lg font-bold text-brand-700">{bestDay.label} · {peso(bestDay.value)}</p>
            </div>
          )}
        </div>
        <BarChart key={weekStart + gid} data={weekData} />
        <p className="mt-3 text-center text-base text-neutral-500">Tap a bar to see the exact amount.</p>
      </Card>

      {/* Weekly */}
      <SectionTitle>Weekly sales (last 8 weeks)</SectionTitle>
      <Card>
        <BarChart key={'w' + gid} data={weeksData} height={200} />
        <p className="mt-3 text-center text-base text-neutral-500">Each bar is one week (Monday to Sunday).</p>
      </Card>

      {/* Monthly */}
      <SectionTitle>Monthly sales</SectionTitle>
      <Card>
        <NavRow label={String(year)} onPrev={() => setYear(year - 1)} onNext={() => setYear(year + 1)} nextDisabled={year >= Number(yStr)} />
        <p className="text-base text-neutral-600">Year total</p>
        <p className="mb-4 text-3xl font-extrabold">{peso(yearTotal)}</p>
        <BarChart key={year + gid} data={monthsData} height={200} />
      </Card>

      {/* Top lists */}
      <SectionTitle>Top vendors this month</SectionTitle>
      <Card>
        {topVendors.length === 0 ? (
          <p className="text-lg text-neutral-500">No sales yet this month.</p>
        ) : (
          <ol className="space-y-3">
            {topVendors.map(([vid, amt], i) => (
              <li key={vid}>
                <Link to={`#/vendor/${vid}`} className="mb-1 flex items-center justify-between gap-2 text-lg">
                  <span className="flex min-w-0 items-center gap-2">
                    <b>{i + 1}.</b>
                    <Avatar name={vendors[vid]?.name} src={vendors[vid]?.photoUrl} className="size-9 text-sm" />
                    <span className="truncate">{vendors[vid]?.name ?? 'Unknown'}</span>
                  </span>
                  <b className="shrink-0">{peso(amt)}</b>
                </Link>
                <div className="h-3 rounded-full bg-neutral-100">
                  <div className="h-3 rounded-full bg-brand-400" style={{ width: `${(amt / maxVendor) * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <SectionTitle>Best-selling items this month</SectionTitle>
      <Card>
        {topItems.length === 0 ? (
          <p className="text-lg text-neutral-500">No sales yet this month.</p>
        ) : (
          <ol className="space-y-3">
            {topItems.map(([name, v], i) => (
              <li key={name}>
                <div className="mb-1 flex justify-between text-lg">
                  <span className="flex min-w-0 items-center gap-2">
                    <b>{i + 1}.</b>
                    <ItemThumb item={s.items.find((x) => x.name === name) ?? { name }} className="size-10 text-base" />
                    <span className="truncate">{name}</span>
                  </span>
                  <span><b>{v.units}</b> pcs · {peso(v.sales)}</span>
                </div>
                <div className="h-3 rounded-full bg-neutral-100">
                  <div className="h-3 rounded-full bg-brand-500" style={{ width: `${(v.units / maxItem) * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card className="mt-6 !bg-brand-50">
        <p className="text-base text-neutral-700">
          This month, vendors earned <b>{peso(k.month.earn)}</b> from selling your items.
        </p>
      </Card>
    </div>
  );
}
