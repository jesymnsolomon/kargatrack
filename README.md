# KargaTrack

Track the items you give to vendors each day (Ice Cream, Balot, Puto…), what they return, how much they owe, and whether they paid.

## Run it

```bash
npm install
npm run dev        # open the URL it prints (use --host to open on your phone over Wi-Fi)
npm run build      # production build in dist/
```

## How it works

- **Setup** → add vendors, items per group, and two prices per item: *your price* (what the vendor pays you) and *vendor's price* (what they sell it for).
- **New (+)** → pick group, vendor, time, and quantities.
- **Vendor returned** (one button on the record) → enter unsold pieces per item.
  Owed = (taken − returned) × your price. Vendor's earnings = sold × (vendor's price − your price).
- Then tap **Yes, paid** or **Not yet**.
- **Records** → by group → by day → list of vendors.
- **Vendors** → monthly dashboard: best vendor this month and of all time, times sold, sales, unpaid balance; tap a vendor for their profile (photo, call button, 6-month chart, records).
- **Item pictures** → pick one per item in Setup → Items & Prices (from `public/items/thumbs`, cut from the source art in `public/items`).
- **Sales** → today / week / month / year-to-date, per-day bar chart, last 8 weeks, monthly, top vendors and items.

## Supabase (online saving + vendor photos)

Without Supabase keys the app runs in **local-only mode** (data stays in that browser).
To save online and use it on several phones:

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   This creates the tables, Row Level Security (each account sees only its own data), and the `vendor-photos` storage bucket.
3. Copy `.env.example` to `.env` and fill in **Project URL** and **anon / publishable key**
   (Project Settings → API).
4. Restart `npm run dev`, create an account in the app, and sign in.
   - Optional: **Authentication → Sign In / Providers → Email** → turn off *Confirm email* so new accounts can sign in right away.
   - Set **Authentication → URL Configuration → Site URL** to where the app is hosted (used by confirm / reset-password emails).

How sync works:
- Every change is saved on the phone first (instant), then uploaded in the background.
  With no internet, changes wait in an outbox and upload automatically later (a yellow banner shows how many are waiting).
- Latest data is downloaded on sign-in and whenever the app is opened again.
- On a brand-new account, any data already in that browser from local-only mode is uploaded automatically.
- Vendor photos are cropped to a 400×400 JPEG on the phone (~30 KB) before upload. Adding a photo needs internet.
  The bucket is public-read with random file names; only the owner can upload or delete.

Several people can share the same records by signing in with the same account.

**Setup → Account** shows who is signed in, sync status, *Sync now*, *Sign out*, and backup / restore.
