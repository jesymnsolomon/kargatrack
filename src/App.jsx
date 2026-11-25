import { useRoute } from './lib/router.js';
import { Icon, Link } from './components/ui.jsx';
import Home from './pages/Home.jsx';
import Records from './pages/Records.jsx';
import DayView from './pages/DayView.jsx';
import TxForm from './pages/TxForm.jsx';
import TxDetail from './pages/TxDetail.jsx';
import ReturnForm from './pages/ReturnForm.jsx';
import Unpaid from './pages/Unpaid.jsx';
import Setup from './pages/Setup.jsx';
import Stats from './pages/Stats.jsx';
import Login from './pages/Login.jsx';
import Vendors from './pages/Vendors.jsx';
import VendorProfile from './pages/VendorProfile.jsx';
import { useCloud, flush } from './lib/sync.js';
import NewPassword from './components/NewPassword.jsx';

export default function App() {
  const cloud = useCloud();
  if (cloud.status === 'loading') return <Splash />;
  if (cloud.status === 'out') return <Login />;
  return <Main cloud={cloud} />;
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-3">
        <div className="grid size-20 animate-pulse place-items-center rounded-full bg-brand-400 text-4xl">🛒</div>
        <p className="text-lg text-neutral-600">Opening KargaTrack…</p>
      </div>
    </div>
  );
}

function SyncBanner({ cloud }) {
  if (cloud.status !== 'in' || !cloud.pending || (cloud.sync !== 'offline' && cloud.sync !== 'error')) return null;
  const offline = cloud.sync === 'offline';
  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl bg-amber-100 p-3 text-amber-900">
      <Icon name={offline ? 'wifiOff' : 'sync'} className="size-7 shrink-0" />
      <p className="flex-1 text-base">
        {offline
          ? <>No internet. <b>{cloud.pending}</b> change{cloud.pending === 1 ? ' is' : 's are'} saved on this phone and will upload automatically.</>
          : <>Could not save online yet ({cloud.pending} waiting).</>}
      </p>
      <button onClick={() => flush()} className="min-h-12 shrink-0 rounded-xl bg-white px-3 text-base font-bold">Retry</button>
    </div>
  );
}

function Main({ cloud }) {
  const { parts, query, hash } = useRoute();
  const [p0, p1, p2, p3] = parts;

  let page, nav = true, active = p0 || 'home';
  switch (p0) {
    case 'records': page = <Records groupId={p1} />; break;
    case 'day': page = <DayView groupId={p1} date={p2} />; active = 'records'; break;
    case 'new': page = <TxForm key={hash} query={query} />; nav = false; break;
    case 'edit': page = <TxForm key={hash} editId={p1} query={query} />; nav = false; break;
    case 'tx':
      if (p2 === 'return') { page = <ReturnForm id={p1} />; nav = false; }
      else page = <TxDetail id={p1} />;
      active = 'records';
      break;
    case 'unpaid': page = <Unpaid />; active = 'home'; break;
    case 'setup': page = <Setup tab={p1} />; active = 'home'; break;
    case 'stats': page = <Stats />; break;
    case 'vendors': page = <Vendors />; break;
    case 'vendor': page = <VendorProfile id={p1} />; active = 'vendors'; break;
    default: page = <Home />; active = 'home';
  }
  void p3;

  return (
    <div className="min-h-dvh">
      <main className={`mx-auto max-w-2xl px-4 pt-[calc(1rem+env(safe-area-inset-top))] ${nav ? 'pb-36' : 'pb-40'}`}>
        <SyncBanner cloud={cloud} />
        {page}
      </main>
      {cloud.recovery && <NewPassword />}
      {nav && <BottomNav active={active} />}
    </div>
  );
}

function NavItem({ to, icon, label, on }) {
  return (
    <Link to={to} replace className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 ${on ? 'text-neutral-900' : 'text-neutral-500'}`}>
      <Icon name={icon} className="size-7" stroke={on ? 2.6 : 2} />
      <span className={`text-sm ${on ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </Link>
  );
}

function BottomNav({ active }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-end px-2">
        <NavItem to="#/" icon="home" label="Home" on={active === 'home'} />
        <NavItem to="#/records" icon="list" label="Records" on={active === 'records'} />
        <div className="flex flex-1 justify-center">
          <Link
            to="#/new"
            className="-mt-7 mb-1 flex flex-col items-center gap-0.5"
            aria-label="Add new record"
          >
            <span className="grid size-[4.2rem] place-items-center rounded-full bg-brand-400 shadow-lg ring-[6px] ring-paper active:scale-95">
              <Icon name="plus" className="size-9" stroke={3} />
            </span>
            <span className="text-sm font-bold">New</span>
          </Link>
        </div>
        <NavItem to="#/stats" icon="chart" label="Sales" on={active === 'stats'} />
        <NavItem to="#/vendors" icon="user" label="Vendors" on={active === 'vendors'} />
      </div>
    </nav>
  );
}
