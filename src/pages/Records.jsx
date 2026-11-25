import { useMemo } from 'react';
import { useStore } from '../lib/store.js';
import { go } from '../lib/router.js';
import { Button, Card, Empty, Icon, Link, Tabs } from '../components/ui.jsx';
import { calcTx, dayLabel, fmtDateLong, fmtMonthYear, peso } from '../lib/utils.js';

export default function Records({ groupId }) {
  const s = useStore();
  const groups = s.groups.filter((g) => !g.archived);
  const gid = groupId && s.groups.some((g) => g.id === groupId) ? groupId : groups[0]?.id;
  const group = s.groups.find((g) => g.id === gid);

  const months = useMemo(() => {
    const days = new Map();
    for (const t of s.transactions) {
      if (t.groupId !== gid) continue;
      let d = days.get(t.date);
      if (!d) { d = { date: t.date, count: 0, owed: 0, out: 0, unpaid: 0, vendors: new Set() }; days.set(t.date, d); }
      d.count++;
      d.vendors.add(t.vendorId);
      if (t.status === 'out') d.out++;
      else {
        d.owed += calcTx(t).owed;
        if (!t.paid) d.unpaid++;
      }
    }
    const sorted = [...days.values()].sort((a, b) => b.date.localeCompare(a.date));
    const byMonth = [];
    for (const d of sorted) {
      const key = d.date.slice(0, 7);
      let m = byMonth[byMonth.length - 1];
      if (!m || m.key !== key) { m = { key, label: fmtMonthYear(d.date), days: [], total: 0 }; byMonth.push(m); }
      m.days.push(d);
      m.total += d.owed;
    }
    return byMonth;
  }, [s.transactions, gid]);

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-3xl font-extrabold">Records</h1>
        <p className="text-lg text-neutral-600">Choose a group, then a day.</p>
      </header>

      <Tabs
        options={groups.map((g) => ({ value: g.id, label: `${g.emoji} ${g.name}` }))}
        value={gid}
        onChange={(v) => go(`#/records/${v}`, { replace: true })}
      />

      {group && (
        <Button className="mb-5 w-full" icon="plus" onClick={() => go(`#/new?group=${gid}`)}>
          New {group.name} record
        </Button>
      )}

      {!group ? (
        <Empty title="No groups yet" text="Add a group in Setup first." />
      ) : months.length === 0 ? (
        <Empty icon="list" title={`No ${group.name} records yet`} text="Records you add will show here, sorted by day." />
      ) : (
        months.map((m) => (
          <section key={m.key} className="mb-6">
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h2 className="text-xl font-bold">{m.label}</h2>
              <span className="text-base text-neutral-600">Sales <b className="text-neutral-900">{peso(m.total)}</b></span>
            </div>
            <div className="space-y-3">
              {m.days.map((d) => (
                <Link key={d.date} to={`#/day/${gid}/${d.date}`} className="block">
                  <Card className="flex items-center gap-4 !p-4 active:scale-[0.99]">
                    <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-brand-100 text-center leading-none">
                      <div>
                        <div className="text-2xl font-extrabold">{d.date.slice(8)}</div>
                        <div className="mt-1 text-xs font-bold uppercase text-brand-700">
                          {new Date(d.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xl font-bold">
                        {['Today', 'Yesterday'].includes(dayLabel(d.date))
                          ? dayLabel(d.date)
                          : new Date(d.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'long' })}
                      </div>
                      <div className="truncate text-base text-neutral-600" title={fmtDateLong(d.date)}>
                        {d.vendors.size} vendor{d.vendors.size === 1 ? '' : 's'}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {d.out > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-bold text-amber-800">{d.out} out</span>}
                        {d.unpaid > 0 && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-sm font-bold text-red-700">{d.unpaid} not paid</span>}
                        {d.out === 0 && d.unpaid === 0 && <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-sm font-bold text-brand-700">✓ All done</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-extrabold">{peso(d.owed)}</div>
                      <Icon name="right" className="ml-auto mt-1 size-6 text-neutral-400" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
