import { useMemo, useRef, useState } from 'react';
import { exportData, importData, resetData, useStore } from '../lib/store.js';
import { go } from '../lib/router.js';
import { Button, Card, Confirm, Empty, Icon, ItemThumb, SectionTitle, Tabs } from '../components/ui.jsx';
import { GroupModal, ItemModal } from '../components/forms.jsx';
import { peso, todayStr } from '../lib/utils.js';
import { cloudEnabled, refresh, signOut, useCloud } from '../lib/sync.js';

export default function Setup({ tab = 'items' }) {
  return (
    <div>
      <header className="mb-4">
        <h1 className="text-3xl font-extrabold">Setup</h1>
        <p className="text-lg text-neutral-600">Items, prices and your account.</p>
      </header>
      <Tabs
        options={[
          { value: 'items', label: '🏷️ Items & Prices' },
          { value: 'backup', label: cloudEnabled ? '👤 Account' : '💾 Backup' },
        ]}
        value={tab}
        onChange={(v) => go(`#/setup/${v}`, { replace: true })}
      />
      {tab === 'backup' ? <BackupTab /> : <ItemsTab />}
    </div>
  );
}

function ItemsTab() {
  const s = useStore();
  const groups = s.groups.filter((g) => !g.archived);
  const [gid, setGid] = useState(groups[0]?.id);
  const [itemModal, setItemModal] = useState(null);
  const [groupModal, setGroupModal] = useState(null);
  const group = groups.find((g) => g.id === gid) ?? groups[0];
  const items = s.items.filter((i) => i.groupId === group?.id && !i.archived);

  return (
    <>
      <p className="mb-2 text-lg font-semibold">Group</p>
      <Tabs options={groups.map((g) => ({ value: g.id, label: `${g.emoji} ${g.name}` }))} value={group?.id} onChange={setGid} />

      {group && (
        <>
          <Button className="mb-4 w-full" icon="plus" onClick={() => setItemModal('new')}>Add {group.name} item</Button>
          {items.length === 0 ? (
            <Empty title={`No ${group.name} items`} text="Add items with your price and the vendor's selling price." />
          ) : (
            <div className="space-y-3">
              {items.map((i) => (
                <button key={i.id} onClick={() => setItemModal(i)} className="block w-full text-left">
                  <Card className="!p-4">
                    <div className="flex items-center gap-3">
                      <ItemThumb item={i} fallback={group.emoji} />
                      <div className="min-w-0 flex-1 truncate text-xl font-bold">{i.name}</div>
                      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-neutral-100"><Icon name="edit" /></span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-neutral-100 p-2">
                        <div className="text-sm text-neutral-600">Your price</div>
                        <div className="text-lg font-bold">{peso(i.price)}</div>
                      </div>
                      <div className="rounded-xl bg-neutral-100 p-2">
                        <div className="text-sm text-neutral-600">Vendor sells</div>
                        <div className="text-lg font-bold">{peso(i.srp)}</div>
                      </div>
                      <div className="rounded-xl bg-brand-50 p-2">
                        <div className="text-sm text-neutral-600">Vendor earns</div>
                        <div className="text-lg font-bold text-brand-700">{peso(i.srp - i.price)}</div>
                      </div>
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          )}
          <p className="mt-3 text-base text-neutral-600">Changing a price only affects new records. Old records keep the price they were made with.</p>
        </>
      )}

      <SectionTitle right={<Button variant="soft" className="!min-h-12 !text-base" icon="plus" onClick={() => setGroupModal('new')}>New group</Button>}>
        Groups
      </SectionTitle>
      <div className="space-y-2">
        {groups.map((g) => (
          <button key={g.id} onClick={() => setGroupModal(g)} className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left">
            <span className="text-3xl">{g.emoji}</span>
            <span className="flex-1 text-lg font-bold">{g.name}</span>
            <Icon name="edit" className="size-6 text-neutral-500" />
          </button>
        ))}
      </div>

      <ItemModal open={!!itemModal} onClose={() => setItemModal(null)} item={itemModal === 'new' ? null : itemModal} groupId={group?.id} groupName={group?.name} />
      <GroupModal open={!!groupModal} onClose={() => setGroupModal(null)} group={groupModal === 'new' ? null : groupModal} onSaved={setGid} />
    </>
  );
}

function BackupTab() {
  const s = useStore();
  const fileRef = useRef(null);
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [pending, setPending] = useState(null);

  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kargatrack-backup-${todayStr()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg('Backup file saved.');
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setPending(await f.text());
    setConfirm('restore');
  };

  return (
    <div className="space-y-4">
      {cloudEnabled && <AccountCard />}
      <Card>
        {cloudEnabled ? (
          <p className="text-lg">Your data is saved online. You can also keep a backup file on this device.</p>
        ) : (
          <p className="text-lg">Your data is saved <b>on this device only</b>. Make a backup from time to time so you don't lose it.</p>
        )}
        <p className="mt-2 text-base text-neutral-600">
          {s.transactions.length} records · {s.vendors.filter((v) => !v.archived).length} vendors · {s.items.filter((i) => !i.archived).length} items
        </p>
      </Card>
      <Button className="w-full" icon="download" onClick={download}>Save a backup file</Button>
      <Button className="w-full" variant="light" icon="upload" onClick={() => fileRef.current?.click()}>Restore from backup file</Button>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
      {msg && <p className="rounded-2xl bg-brand-50 p-3 text-center text-lg font-semibold">{msg}</p>}
      <Button className="mt-6 w-full" variant="dangerSoft" icon="trash" onClick={() => setConfirm('reset')}>Erase all data</Button>

      <Confirm
        open={confirm === 'restore'}
        title="Restore this backup?"
        message="Everything on this device will be replaced by the backup file."
        confirmLabel="Yes, restore"
        onConfirm={() => {
          try { importData(pending); setMsg('Backup restored.'); } catch (err) { setMsg('That file is not a KargaTrack backup.'); }
        }}
        onClose={() => setConfirm(null)}
      />
      <Confirm
        open={confirm === 'reset'}
        title="Erase everything?"
        message="All records, vendors and items will be deleted. This cannot be undone. Save a backup first if you're unsure."
        confirmLabel="Yes, erase"
        danger
        onConfirm={() => { resetData(); setMsg('All data erased.'); }}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

function AccountCard() {
  const cloud = useCloud();
  const [ask, setAsk] = useState(false);
  const status =
    cloud.sync === 'saving' ? { text: 'Saving…', cls: 'bg-amber-100 text-amber-800' }
    : cloud.pending > 0 ? { text: `${cloud.pending} change${cloud.pending === 1 ? '' : 's'} waiting to upload`, cls: 'bg-amber-100 text-amber-800' }
    : { text: '✓ All saved online', cls: 'bg-brand-100 text-brand-700' };
  return (
    <Card>
      <p className="text-base text-neutral-600">Signed in as</p>
      <p className="break-all text-xl font-bold">{cloud.user?.email}</p>
      <p className={`mt-3 inline-block rounded-full px-3 py-1 text-base font-bold ${status.cls}`}>{status.text}</p>
      {cloud.lastSynced && (
        <p className="mt-2 text-base text-neutral-600">
          Last synced {new Date(cloud.lastSynced).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button variant="soft" icon="undo" onClick={() => refresh()}>Sync now</Button>
        <Button variant="light" onClick={() => setAsk(true)}>Sign out</Button>
      </div>
      <Confirm
        open={ask}
        title="Sign out?"
        message={cloud.pending > 0
          ? `${cloud.pending} change(s) have not been uploaded yet and will be LOST if you sign out now. Connect to the internet first.`
          : 'Your records stay saved online. Sign in again to see them.'}
        confirmLabel="Yes, sign out"
        danger={cloud.pending > 0}
        onConfirm={() => signOut()}
        onClose={() => setAsk(false)}
      />
    </Card>
  );
}
