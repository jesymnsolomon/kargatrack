import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.js';
import { Card, Empty, Icon, Link, Ring, SectionTitle, TxCard } from '../components/ui.jsx';
import {
  addDays, byId, calcTx, dayLabel, fmtMonthYear, greeting, isUnpaid, parseDate, peso, startOfWeek, todayStr,
} from '../lib/utils.js';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function Home() {
  const s = useStore();
  const today = todayStr();
  const [selDay, setSelDay] = useState(today);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));

  const vendors = useMemo(() => byId(s.vendors), [s.vendors]);
  const groups = useMemo(() => byId(s.groups), [s.groups]);
  const activeGroups = s.groups.filter((g) => !g.archived);

  const summary = useMemo(() => {
    let todayOwed = 0, todayReturned = 0, todayTotal = 0, out = 0, unpaid = 0, unpaidCount = 0;
    const daysWithTx = new Set();
    for (const t of s.transactions) {
      daysWithTx.add(t.date);
      if (t.status === 'out') out++;
      if (isUnpaid(t)) { unpaid += calcTx(t).owed; unpaidCount++; }
      if (t.date === today) {
        todayTotal++;
        if (t.status === 'returned') { todayReturned++; todayOwed += calcTx(t).owed; }
      }
    }
    return { todayOwed, todayReturned, todayTotal, out, unpaid, unpaidCount, daysWithTx };
  }, [s.transactions, today]);

  const dayTx = useMemo(
    () => s.transactions.filter((t) => t.date === selDay).sort((a, b) => b.time.localeCompare(a.time)),
    [s.transactions, selDay]
  );

  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div>
      {/* Header */}
      <header className="mb-5 flex items-center gap-3">
        <div className="grid size-14 place-items-center rounded-full bg-brand-400 text-2xl">🛒</div>
        <div className="min-w-0 flex-1">
          <p className="text-base text-neutral-600">{greeting()}</p>
          <h1 className="text-2xl font-extrabold">KargaTrack</h1>
        </div>
        <Link to="#/setup" className="flex h-14 items-center gap-2 rounded-full bg-white px-4 shadow-sm" aria-label="Setup: items, prices and account">
          <Icon name="gear" className="size-6" />
          <span className="text-base font-bold">Setup</span>
        </Link>
      </header>

      {/* Hero card */}
      <Card className="flex items-center gap-4 !bg-brand-200">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-base font-semibold text-neutral-700">
            <span className="grid size-8 place-items-center rounded-full bg-white/70">
              <Icon name="wallet" className="size-5" />
            </span>
            Today's sales
          </p>
          <p className="mt-2 text-4xl font-extrabold tracking-tight">{peso(summary.todayOwed)}</p>
          <p className="mt-1 text-base text-neutral-700">From vendors who already returned</p>
        </div>
        <Ring value={summary.todayReturned} total={summary.todayTotal} label="returned" />
      </Card>

      {/* Two stat cards */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Link to="#/records" className="block">
          <Card className="h-full">
            <div className="flex items-start justify-between gap-2">
              <p className="text-lg font-semibold leading-tight">Still out<br />selling</p>
              <span className="grid size-11 place-items-center rounded-full bg-amber-100 text-amber-700">
                <Icon name="truck" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold">
              {summary.out} <span className="text-lg font-medium text-neutral-600">vendor{summary.out === 1 ? '' : 's'}</span>
            </p>
          </Card>
        </Link>
        <Link to="#/unpaid" className="block">
          <Card className="h-full">
            <div className="flex items-start justify-between gap-2">
              <p className="text-lg font-semibold leading-tight">Not yet<br />paid</p>
              <span className="grid size-11 place-items-center rounded-full bg-red-100 text-red-700">
                <Icon name="wallet" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold">{peso(summary.unpaid)}</p>
            <p className="text-base text-neutral-600">{summary.unpaidCount} record{summary.unpaidCount === 1 ? '' : 's'}</p>
          </Card>
        </Link>
      </div>

      {/* Quick add per group */}
      <SectionTitle>Add a new record</SectionTitle>
      <div className="grid grid-cols-3 gap-3">
        {activeGroups.map((g) => (
          <Link
            key={g.id}
            to={`#/new?group=${g.id}&date=${selDay}`}
            className="flex flex-col items-center gap-1 rounded-3xl bg-white px-2 py-4 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-[0.98]"
          >
            <span className="text-4xl">{g.emoji}</span>
            <span className="text-lg font-bold leading-tight">{g.name}</span>
            <span className="mt-1 grid size-9 place-items-center rounded-full bg-brand-300">
              <Icon name="plus" className="size-5" stroke={3} />
            </span>
          </Link>
        ))}
      </div>

      {/* Week calendar */}
      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{fmtMonthYear(addDays(weekStart, 3))}</h2>
          <div className="flex gap-2">
            <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="grid size-12 place-items-center rounded-full bg-neutral-100" aria-label="Previous week">
              <Icon name="left" />
            </button>
            <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="grid size-12 place-items-center rounded-full bg-neutral-100" aria-label="Next week">
              <Icon name="right" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {week.map((d, i) => {
            const on = d === selDay;
            const isToday = d === today;
            return (
              <button
                key={d}
                onClick={() => setSelDay(d)}
                className={`flex flex-col items-center gap-1 rounded-full py-2.5 transition ${on ? 'bg-brand-300' : ''}`}
                aria-label={dayLabel(d)}
                aria-pressed={on}
              >
                <span className={`text-sm font-semibold ${on ? 'text-neutral-900' : 'text-neutral-500'}`}>{DOW[i]}</span>
                <span className={`text-xl ${on || isToday ? 'font-extrabold' : 'font-medium'} ${isToday && !on ? 'text-brand-700' : ''}`}>
                  {String(parseDate(d).getDate()).padStart(2, '0')}
                </span>
                <span className={`size-1.5 rounded-full ${summary.daysWithTx.has(d) ? 'bg-brand-600' : 'bg-transparent'}`} />
              </button>
            );
          })}
        </div>
        {selDay !== today && (
          <button
            onClick={() => { setSelDay(today); setWeekStart(startOfWeek(today)); }}
            className="mt-3 w-full rounded-2xl bg-neutral-100 py-3 text-lg font-semibold"
          >
            Back to today
          </button>
        )}
      </Card>

      {/* Day's records */}
      <SectionTitle>{dayLabel(selDay)}'s records</SectionTitle>
      {dayTx.length === 0 ? (
        <Empty
          icon="list"
          title="No records for this day"
          text="Tap a group above, or the green + button below, to add one."
        />
      ) : (
        <div className="space-y-3">
          {dayTx.map((t) => (
            <TxCard key={t.id} tx={t} vendor={vendors[t.vendorId]} group={groups[t.groupId]} showGroup />
          ))}
        </div>
      )}
    </div>
  );
}
