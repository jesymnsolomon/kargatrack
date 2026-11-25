import { useEffect, useRef, useState } from 'react';
import { Avatar, Button, Confirm, Field, Modal, inputCls } from './ui.jsx';
import {
  addGroup, addItem, addVendor, deleteGroup, deleteItem, deleteVendor,
  uid, updateGroup, updateItem, updateVendor,
} from '../lib/store.js';
import { deleteVendorPhoto, uploadVendorPhoto } from '../lib/sync.js';
import { squarePhoto } from '../lib/image.js';
import { ITEM_IMAGES, itemImage } from '../lib/itemImages.js';
import { peso } from '../lib/utils.js';

/** vendor: existing vendor to edit, or null for a new one */
export function VendorModal({ open, onClose, vendor, onSaved }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState(null); // { blob, preview } newly picked
  const [removePhoto, setRemovePhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [askDelete, setAskDelete] = useState(false);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  useEffect(() => {
    if (open) {
      setName(vendor?.name ?? '');
      setPhone(vendor?.phone ?? '');
      setPhoto(null);
      setRemovePhoto(false);
      setError('');
      setBusy(false);
    }
  }, [open, vendor]);

  // Free the preview image memory
  useEffect(() => () => photo && URL.revokeObjectURL(photo.preview), [photo]);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try {
      const blob = await squarePhoto(file);
      setPhoto({ blob, preview: URL.createObjectURL(blob) });
      setRemovePhoto(false);
    } catch {
      setError('Could not use that photo. Please try another one.');
    }
  };

  const currentPhoto = photo?.preview ?? (removePhoto ? null : vendor?.photoUrl);

  const save = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const id = vendor?.id ?? uid();
      let photoUrl; // undefined = leave as is
      if (photo) photoUrl = await uploadVendorPhoto(id, photo.blob);
      else if (removePhoto) photoUrl = null;

      if (vendor) {
        updateVendor(vendor.id, { name, phone, photoUrl });
        if (photoUrl !== undefined && vendor.photoUrl) deleteVendorPhoto(vendor.photoUrl);
      } else {
        addVendor({ id, name, phone, photoUrl: photoUrl ?? null });
        onSaved?.(id);
      }
      onClose();
    } catch (err) {
      console.warn(err);
      setError(navigator.onLine ? 'Could not upload the photo. Please try again.' : 'Adding a photo needs internet. Connect and try again, or save without a photo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal open={open && !askDelete} onClose={onClose} title={vendor ? 'Edit vendor' : 'New vendor'}>
        <form onSubmit={save} className="space-y-5">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <Avatar name={name} src={currentPhoto} className="size-28 text-4xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Button type="button" variant="soft" className="!min-h-12 !text-base" icon="camera" onClick={() => cameraRef.current?.click()}>
                Take photo
              </Button>
              <Button type="button" variant="soft" className="!min-h-12 !text-base" icon="image" onClick={() => galleryRef.current?.click()}>
                Choose photo
              </Button>
              {currentPhoto && (
                <button
                  type="button"
                  className="min-h-10 text-base font-semibold text-red-700 underline"
                  onClick={() => { setPhoto(null); setRemovePhoto(true); }}
                >
                  Remove photo
                </button>
              )}
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
            <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
          </div>

          <Field label="Vendor's name">
            <input autoFocus={!vendor} className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mang Jose" />
          </Field>
          <Field label="Phone number (optional)">
            <input className={inputCls} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xx xxx xxxx" />
          </Field>
          {error && <p className="rounded-2xl bg-red-50 p-3 text-lg text-red-800">{error}</p>}
          <Button type="submit" className="w-full" disabled={!name.trim() || busy} icon={busy ? undefined : 'check'}>
            {busy ? (photo ? 'Uploading photo…' : 'Saving…') : 'Save vendor'}
          </Button>
          {vendor && (
            <Button type="button" variant="dangerSoft" className="w-full" icon="trash" onClick={() => setAskDelete(true)}>
              Remove vendor
            </Button>
          )}
        </form>
      </Modal>
      <Confirm
        open={askDelete}
        title="Remove this vendor?"
        message={`${vendor?.name} will no longer appear when adding new records. Old records are kept.`}
        confirmLabel="Yes, remove"
        danger
        onConfirm={() => { deleteVendor(vendor.id); onClose(); }}
        onClose={() => setAskDelete(false)}
      />
    </>
  );
}

/** item: existing item to edit, or null for new (needs groupId) */
export function ItemModal({ open, onClose, item, groupId, groupName }) {
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [pickOpen, setPickOpen] = useState(false);
  const [price, setPrice] = useState('');
  const [srp, setSrp] = useState('');
  const [askDelete, setAskDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setName(item?.name ?? '');
      setPrice(item ? String(item.price) : '');
      setSrp(item ? String(item.srp) : '');
      setImage(item ? itemImage(item) ?? '' : '');
      setPickOpen(false);
    }
  }, [open, item]);

  const p = Number(price) || 0, s = Number(srp) || 0;
  const valid = name.trim() && price !== '';

  const save = (e) => {
    e.preventDefault();
    if (!valid) return;
    if (item) updateItem(item.id, { name, price: p, srp: s || p, image });
    else addItem({ groupId, name, price: p, srp: s || p, image });
    onClose();
  };

  return (
    <>
      <Modal open={open && !askDelete} onClose={onClose} title={item ? 'Edit item' : `New ${groupName ?? ''} item`}>
        <form onSubmit={save} className="space-y-5">
          <Field label="Item name">
            <input autoFocus={!item} className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pinipig" />
          </Field>
          <div>
            <span className="mb-1.5 block text-lg font-semibold">Picture</span>
            <button type="button" onClick={() => setPickOpen(!pickOpen)} className="flex w-full items-center gap-4 rounded-2xl border-2 border-neutral-200 p-3 text-left">
              {image ? (
                <img src={image} alt="" className="size-16 rounded-xl object-contain" />
              ) : (
                <span className="grid size-16 place-items-center rounded-xl bg-neutral-100 text-sm text-neutral-500">None</span>
              )}
              <span className="flex-1 text-lg font-semibold">{pickOpen ? 'Pick a picture below' : 'Tap to choose a picture'}</span>
            </button>
            {pickOpen && (
              <div className="mt-3 max-h-80 space-y-4 overflow-y-auto rounded-2xl bg-neutral-50 p-3">
                {[...ITEM_IMAGES].sort((a, b) => (b.group === groupName) - (a.group === groupName)).map((g) => (
                  <div key={g.group}>
                    <p className="mb-2 text-base font-bold text-neutral-600">{g.group}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {g.list.map((im) => (
                        <button
                          type="button" key={im.src} title={im.label} aria-label={im.label}
                          onClick={() => { setImage(im.src); setPickOpen(false); }}
                          className={`aspect-square rounded-2xl bg-white p-1 ${image === im.src ? 'ring-4 ring-brand-500' : 'ring-1 ring-neutral-200'}`}
                        >
                          <img src={im.src} alt="" loading="lazy" className="size-full object-contain" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => { setImage(''); setPickOpen(false); }} className="min-h-12 w-full rounded-2xl bg-white text-lg font-semibold ring-1 ring-neutral-200">
                  No picture
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Your price" hint="What vendor pays you">
              <input className={inputCls} inputMode="decimal" type="number" min="0" step="any" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="₱10" />
            </Field>
            <Field label="Vendor's price" hint="What vendor sells it for">
              <input className={inputCls} inputMode="decimal" type="number" min="0" step="any" value={srp} onChange={(e) => setSrp(e.target.value)} placeholder="₱15" />
            </Field>
          </div>
          {price !== '' && (
            <p className="rounded-2xl bg-brand-50 p-3 text-lg">
              Vendor earns <b>{peso(Math.max(0, (s || p) - p))}</b> for each one sold.
            </p>
          )}
          <Button type="submit" className="w-full" disabled={!valid} icon="check">
            Save item
          </Button>
          {item && (
            <Button type="button" variant="dangerSoft" className="w-full" icon="trash" onClick={() => setAskDelete(true)}>
              Remove item
            </Button>
          )}
        </form>
      </Modal>
      <Confirm
        open={askDelete}
        title="Remove this item?"
        message={`${item?.name} will no longer appear in new records. Old records are kept.`}
        confirmLabel="Yes, remove"
        danger
        onConfirm={() => { deleteItem(item.id); onClose(); }}
        onClose={() => setAskDelete(false)}
      />
    </>
  );
}

const EMOJIS = ['🍦', '🥚', '🧁', '🍡', '🍢', '🍞', '🥤', '🍌', '🌽', '🥜', '🍬', '📦'];

export function GroupModal({ open, onClose, group, onSaved }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📦');
  const [askDelete, setAskDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setName(group?.name ?? '');
      setEmoji(group?.emoji ?? '📦');
    }
  }, [open, group]);

  const save = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (group) updateGroup(group.id, { name, emoji });
    else onSaved?.(addGroup({ name, emoji }));
    onClose();
  };

  return (
    <>
      <Modal open={open && !askDelete} onClose={onClose} title={group ? 'Edit group' : 'New group'}>
        <form onSubmit={save} className="space-y-5">
          <Field label="Group name">
            <input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Taho" />
          </Field>
          <div>
            <span className="mb-2 block text-lg font-semibold">Picture</span>
            <div className="grid grid-cols-6 gap-2">
              {EMOJIS.map((em) => (
                <button
                  type="button"
                  key={em}
                  onClick={() => setEmoji(em)}
                  className={`grid aspect-square place-items-center rounded-2xl text-3xl ${emoji === em ? 'bg-brand-300 ring-4 ring-brand-500' : 'bg-neutral-100'}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={!name.trim()} icon="check">
            Save group
          </Button>
          {group && (
            <Button type="button" variant="dangerSoft" className="w-full" icon="trash" onClick={() => setAskDelete(true)}>
              Remove group
            </Button>
          )}
        </form>
      </Modal>
      <Confirm
        open={askDelete}
        title="Remove this group?"
        message={`${group?.name} will be hidden. Old records are kept.`}
        confirmLabel="Yes, remove"
        danger
        onConfirm={() => { deleteGroup(group.id); onClose(); }}
        onClose={() => setAskDelete(false)}
      />
    </>
  );
}
