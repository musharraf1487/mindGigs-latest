import React, { useState, useEffect } from 'react';
import { Notifications } from './components/common/Notifications';
import { LandingPage } from './components/pages/LandingPage';
import { LoginPage } from './components/pages/LoginPage';
import { SignupPage } from './components/pages/SignupPage';
import { OnboardingPage } from './components/pages/OnboardingPage';
import { PublicProfile } from './components/pages/PublicProfile';
import { BookingFlow } from './components/pages/BookingFlow';
import { BookDetailPage } from './components/pages/BookDetailPage';
import { ExpertsDirectory } from './components/pages/ExpertsDirectory';
import { LandingBoard } from './components/pages/LandingBoard';
import { ExpertDashboard } from './components/dashboards/expert/ExpertDashboard';
import { AdminDashboard } from './components/dashboards/admin/AdminDashboard';
import { ClientDashboard } from './components/dashboards/client/ClientDashboard';
import { Users, ShoppingCart, ShieldCheck, ChevronRight } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { db } from './config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { RESERVED_HANDLES, normalizeHandle } from './services/handleService';
import { getBooking } from './services/bookingService';
import { slugify } from './utils/slug';

import './styles/globals.css';
import './styles/utilities.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';

// A bare path like mindgigs.com/username is an expert's vanity URL, and
// mindgigs.com/username/book-slug is a shareable link to one of their books.
// Shared by the `page` and `pendingPath` initializers below so the initial
// render can go straight to a loading state instead of flashing the landing
// page while the expert list loads.
function getPendingPathFromLocation() {
  const parts = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (parts.length === 0) return null;
  const handle = normalizeHandle(parts[0]);
  if (!handle || RESERVED_HANDLES.has(handle)) return null;
  return { handle, bookSlug: parts[1] ? parts[1].toLowerCase() : null };
}

function LoginSelectorModal({ onClose, onSelect }) {
  // No affiliate entry — that portal was merged into the client one, which now
  // carries referrals, commissions and payouts alongside bookings.
  const roles = [
    { role: 'expert', icon: Users, title: 'Expert / Creator', sub: 'Access your profile, bookings & earnings' },
    { role: 'client', icon: ShoppingCart, title: 'Client / Buyer', sub: 'Bookings, purchases, referrals & commissions' },
    { role: 'admin', icon: ShieldCheck, title: 'Administrator', sub: 'Platform management & oversight' },
  ];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="slabel">Access Your Account</div>
        <h2 className="stitle" style={{ fontSize: '1.6rem' }}>Who are you logging in as?</h2>
        <p style={{ fontSize: '.875rem', color: 'var(--sl)', marginTop: 8 }}>mindGigs has separate portals for experts, buyers, and administrators.</p>
        <div className="login-selector">
          {roles.map(o => (
            <div key={o.role} className="login-option" onClick={() => onSelect(o.role)} style={{ padding: '12px 16px', gap: 12 }}>
              <div className="lp-icon-box" style={{ width: 44, height: 44, borderRadius: 10 }}><o.icon size={20} /></div>
              <div style={{ flex: 1 }}>
                <div className="login-option-title" style={{ fontSize: '0.9rem' }}>{o.title}</div>
                <div className="login-option-sub" style={{ fontSize: '0.75rem' }}>{o.sub}</div>
              </div>
              <ChevronRight size={18} className="login-option-arrow" />
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: '.8rem', color: 'var(--mu)', marginTop: 20 }}>
          New to mindGigs? Choose your role above to sign in or create an account.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const { currentUser, userData, logout: firebaseLogout } = useAuth();
  const [page, setPage] = useState(() => window.history.state?.page || (getPendingPathFromLocation() ? 'resolving-handle' : 'landingboard'));
  const [showLoginSelector, setShowLoginSelector] = useState(false);
  const [loginRole, setLoginRole] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [experts, setExperts] = useState([]);
  const [activeExpert, setActiveExpert] = useState(null);
  const [activeExpertId, setActiveExpertId] = useState(() => window.history.state?.expertId || null);
  const [activeSession, setActiveSession] = useState(null);
  const [activeBook, setActiveBook] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [signupRole, setSignupRole] = useState('expert');
  // Path A referral tracking: which expert's profile link a signup came
  // from. Always set explicitly by nav('signup', ctx) below — never
  // inherited from activeExpertId, so visiting an expert profile and later
  // clicking an unrelated "Sign Up" link can't wrongly attribute a referral.
  const [signupExpertId, setSignupExpertId] = useState(() => window.history.state?.signupExpertId ?? null);
  const [loginEmailHint, setLoginEmailHint] = useState('');
  const [preLoginPage, setPreLoginPage] = useState('landingboard');
  // A bare path like mindgigs.com/username is an expert's vanity URL, and
  // mindgigs.com/username/book-slug is a shareable link to one of their
  // books — held here until the experts list loads and we can resolve it.
  const [pendingPath, setPendingPath] = useState(getPendingPathFromLocation);

  // Handle Stripe redirect return (?payment=success or ?payment=cancelled)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const bookingId = params.get('bookingId');
    if (payment === 'success') {
      // Bank transfer settles 1-2 business days later — Checkout redirects
      // here right after the buyer picks it, before funds actually land, so
      // don't claim the booking is confirmed until we know paymentStatus.
      if (bookingId) {
        getBooking(bookingId)
          .then((booking) => {
            if (booking?.paymentStatus === 'pending_bank_transfer') {
              notify('Bank transfer initiated — your session will be confirmed once funds arrive (1-2 business days).', 'success');
            } else {
              notify('Payment confirmed! Your session is booked.', 'success');
            }
          })
          .catch(() => notify('Payment confirmed! Your session is booked.', 'success'));
      } else {
        notify('Payment confirmed! Your session is booked.', 'success');
      }
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (payment === 'cancelled') {
      notify('Payment was cancelled. Your booking was not confirmed.', 'warn');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // History state init + popstate handler
  useEffect(() => {
    if (!window.history.state?.page) {
      window.history.replaceState({ page: 'landingboard', expertId: null, category: null, loginRole: null, signupRole: 'expert', signupExpertId: null, activeSession: null, activeBook: null, showLoginSelector: false }, '', window.location.href);
    }
    const handlePopState = (e) => {
      const s = e.state;
      if (!s) return;
      setShowLoginSelector(!!s.showLoginSelector);
      setPage(s.page);
      if (s.expertId !== undefined) {
        setActiveExpertId(s.expertId);
        const found = experts.find(ex => String(ex.id) === String(s.expertId));
        if (found) setActiveExpert(found);
        else if (!s.expertId) setActiveExpert(null);
      }
      if (s.loginRole !== undefined) setLoginRole(s.loginRole);
      if (s.signupRole !== undefined) setSignupRole(s.signupRole);
      if (s.signupExpertId !== undefined) setSignupExpertId(s.signupExpertId);
      if (s.category !== undefined) setActiveCategory(s.category);
      if (s.activeSession !== undefined) setActiveSession(s.activeSession);
      if (s.activeBook !== undefined) setActiveBook(s.activeBook);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [experts]);

  // Live-subscribe to published experts from Firestore. This was previously a
  // one-time getDocs() fetch tied to [userData] — a session left open (or any
  // visitor who isn't the expert who just onboarded) would never see a newly
  // published expert without a full page reload, since nothing re-triggered
  // the fetch. onSnapshot keeps every open session in sync automatically.
  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'expert'), where('onboardingComplete', '==', true));
    const unsubscribe = onSnapshot(q, (snap) => {
      const live = snap.docs.map(d => {
        const e = { ...d.data(), id: d.id, isLive: true };
        const hasRealImage = e.image && !e.image.includes('placeholder') && !e.image.includes('ui-avatars.com');
        if (hasRealImage) return e;
        return { ...e, image: null };
      });
      // Admin can toggle a profile off (defaults to on) to pull it from
      // public listings without deleting or otherwise disabling the account
      // — direct vanity-URL links below still resolve against the full list.
      setExperts(live.filter(e => e.profileActive !== false));

      // Resolve a pending vanity-URL path against the freshly-loaded expert
      // list. Only runs once — cleared below regardless of outcome, so a
      // later snapshot update (e.g. after login, or another expert publishing)
      // can't re-trigger vanity routing after the user has already navigated elsewhere.
      if (pendingPath) {
        const match = live.find(e => e.handle === pendingPath.handle);
        if (match) {
          const book = pendingPath.bookSlug
            ? (match.booksList || []).find(b => slugify(b.title) === pendingPath.bookSlug)
            : null;
          setActiveExpert(match);
          setActiveExpertId(match.id);
          if (book) {
            setActiveBook(book);
            setPage('book-detail');
            window.history.replaceState(
              { page: 'book-detail', expertId: match.id, category: null, loginRole: null, signupRole: 'expert', signupExpertId: null, activeSession: null, activeBook: book },
              '',
              `/${pendingPath.handle}/${pendingPath.bookSlug}`
            );
          } else {
            setPage('public-profile');
            window.history.replaceState(
              { page: 'public-profile', expertId: match.id, category: null, loginRole: null, signupRole: 'expert', signupExpertId: null, activeSession: null, activeBook: null },
              '',
              '/' + pendingPath.handle
            );
          }
        } else {
          // No expert has this handle — drop back to the landing page instead
          // of leaving 'resolving-handle' stuck on its loading screen.
          setPage('landingboard');
        }
        setPendingPath(null);
      }
    }, (err) => {
      console.error('Error fetching experts:', err);
      setExperts([]);
    });
    return () => unsubscribe();
  }, [userData]);

  // Redirect after login
  useEffect(() => {
    if (!userData || page !== 'login') return;
    if (loginRole && userData.role !== loginRole) return;
    // Experts logging in from a public/marketing page stay right where they were —
    // the nav just swaps to a "Profile" button. Only an explicit dashboard visit
    // (or another role's portal) actually navigates to a dashboard screen.
    if (userData.role === 'expert') {
      const dest = preLoginPage && !['login', 'signup'].includes(preLoginPage) ? preLoginPage : 'landingboard';
      setPage(dest);
      notify('Welcome back!');
      return;
    }
    // `affiliate` still maps here for any user doc the merge migration missed —
    // AuthContext normalizes those to `client`, but the extra entry is cheap
    // insurance against a stale doc landing on a blank screen.
    const routes = { admin: 'admin-dashboard', affiliate: 'client-dashboard', client: 'client-dashboard' };
    const dest = routes[userData.role];
    if (dest) { setPage(dest); notify('Welcome back!'); }
  }, [userData, page, loginRole, preLoginPage]);

  // The affiliate dashboard was merged into the client one. A bookmark or
  // history entry still pointing at the retired route lands on the client
  // dashboard instead of rendering nothing at all.
  useEffect(() => {
    if (page === 'affiliate-dashboard') setPage('client-dashboard');
  }, [page]);

  const notify = (msg, type = 'success') => {
    const id = Date.now();
    setNotifs(p => [...p, { id, msg, type }]);
    setTimeout(() => setNotifs(p => p.filter(n => n.id !== id)), 3500);
  };

  const logout = async () => {
    await firebaseLogout();
    setPage('landingboard');
    notify('Logged out successfully.');
  };

  const openLoginSelector = () => {
    setShowLoginSelector(true);
    window.history.pushState({ page, expertId: activeExpertId, category: activeCategory, loginRole, signupRole, signupExpertId, activeSession, activeBook, showLoginSelector: true }, '', window.location.href);
  };

  const nav = (p, ctx) => {
    if (p === 'login' && page !== 'login') setPreLoginPage(page);
    const newExpertId = ctx?.expertId !== undefined ? ctx.expertId : (p === 'public-profile' ? activeExpertId : null);
    // Resolved once and reused below for both the active-expert state and the
    // address-bar path, so the two can never disagree on which expert this is.
    //
    // The canonical `experts` list (fully-loaded Firestore docs) always wins
    // over a caller-supplied `ctx.expert` — some entry points (e.g. the
    // LandingBoard "Featured Experts" carousel) keep their own reduced,
    // display-only projection of an expert and used to pass that straight
    // through, causing the same profile to render differently depending on
    // which button led here. `ctx.expert` is now only a fallback for experts
    // not yet present in that list (e.g. still loading, or showcase-only).
    const resolvedForNav = ctx?.expertId !== undefined
      ? (experts.find(e => String(e.id) === String(ctx.expertId)) || ctx.expert)
      : (p === 'public-profile' ? (activeExpert || experts.find(e => String(e.id) === String(newExpertId))) : null);
    if (ctx?.expertId !== undefined) {
      setActiveExpertId(ctx.expertId);
      if (resolvedForNav) setActiveExpert(resolvedForNav);
    }
    if (p === 'login' && ctx?.role) setLoginRole(ctx.role);
    if (p === 'login' && ctx?.emailHint !== undefined) setLoginEmailHint(ctx.emailHint || '');
    else if (p !== 'login') setLoginEmailHint('');
    if (p === 'signup') setSignupRole(ctx?.role || 'expert');
    // Explicit and never inherited from activeExpertId — a signup link only
    // carries a referral if this exact nav() call passed one.
    if (p === 'signup') setSignupExpertId(ctx?.expertId ?? null);
    if (ctx?.category !== undefined) setActiveCategory(ctx.category);
    else if (p !== 'experts') setActiveCategory(null);
    if (ctx?.session !== undefined) setActiveSession(ctx.session);
    else if (p !== 'booking') setActiveSession(null);
    if (ctx?.book !== undefined) setActiveBook(ctx.book);
    else if (p !== 'book-detail') setActiveBook(null);

    // Give an expert's public profile a real, shareable address-bar path.
    // Every other page keeps today's behavior (URL left untouched) to avoid
    // disturbing existing back/forward navigation for the rest of the app.
    // Navigating to/from a profile always resets the path (even with no
    // resolvable handle) so the address bar never shows a stale expert's URL.
    let urlPath = window.location.href;
    if (p === 'public-profile') {
      urlPath = resolvedForNav?.handle ? '/' + resolvedForNav.handle : '/';
    } else if (p === 'book-detail') {
      const bookSlug = ctx?.book?.title ? slugify(ctx.book.title) : '';
      urlPath = resolvedForNav?.handle && bookSlug ? `/${resolvedForNav.handle}/${bookSlug}` : '/';
    } else if (page === 'public-profile' || page === 'book-detail') {
      urlPath = '/';
    }

    window.history.pushState({
      page: p,
      expertId: newExpertId,
      category: ctx?.category ?? activeCategory ?? null,
      loginRole: p === 'login' ? (ctx?.role || loginRole) : loginRole,
      signupRole: p === 'signup' ? (ctx?.role || signupRole) : signupRole,
      signupExpertId: p === 'signup' ? (ctx?.expertId ?? null) : signupExpertId,
      activeSession: p === 'booking' ? (ctx?.session || activeSession) : null,
      activeBook: p === 'book-detail' ? (ctx?.book || activeBook) : null,
    }, '', urlPath);
    setPage(p);
  };

  const resolvedExpert = activeExpert || experts.find(e => String(e.id) === String(activeExpertId)) || experts[0];

  return (
    <>
      <Notifications notifs={notifs} />
      {showLoginSelector && (
        <LoginSelectorModal
          onClose={() => { setShowLoginSelector(false); window.history.back(); }}
          onSelect={role => { setShowLoginSelector(false); setLoginRole(role); nav('login', { role }); }}
        />
      )}
      {page === 'resolving-handle' && (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--cr)',
        }}>
          <span style={{
            fontFamily: 'var(--fb)',
            fontWeight: 700,
            fontSize: '1.1rem',
            color: '#0F172A',
          }}>
            mind<span style={{ color: 'var(--teal)' }}>G</span>igs
          </span>
        </div>
      )}
      {page === 'home' && <LandingPage nav={nav} onLogin={openLoginSelector} />}
      {page === 'landingboard' && <LandingBoard nav={nav} onLogin={openLoginSelector} experts={experts} />}
      {page === 'login' && <LoginPage role={loginRole} nav={nav} onSwitchRole={openLoginSelector} notify={notify} emailHint={loginEmailHint} />}
      {page === 'signup' && <SignupPage nav={nav} notify={notify} role={signupRole} expertId={signupExpertId} />}
      {page === 'onboarding' && <OnboardingPage nav={nav} notify={notify} addExpert={e => setExperts(prev => [...prev, e])} />}
      {page === 'experts' && <ExpertsDirectory nav={nav} notify={notify} onLogin={openLoginSelector} experts={experts} selectedCategory={activeCategory} />}
      {page === 'public-profile' && <PublicProfile nav={nav} notify={notify} expert={resolvedExpert} />}
      {page === 'booking' && <BookingFlow nav={nav} notify={notify} expert={resolvedExpert} session={activeSession} />}
      {page === 'book-detail' && <BookDetailPage nav={nav} notify={notify} expert={resolvedExpert} book={activeBook} />}
      {page === 'expert-dashboard' && userData?.role === 'expert' && <ExpertDashboard user={userData} nav={nav} logout={logout} notify={notify} />}
      {page === 'admin-dashboard' && userData?.role === 'admin' && <AdminDashboard user={userData} nav={nav} logout={logout} notify={notify} />}
      {page === 'client-dashboard' && userData?.role === 'client' && <ClientDashboard user={userData} nav={nav} logout={logout} notify={notify} />}
    </>
  );
}
