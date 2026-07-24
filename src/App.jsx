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
import { useAuth } from './context/AuthContext';
import { db } from './config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { RESERVED_HANDLES, normalizeHandle } from './services/handleService';
import { captureReferralFromUrl } from './services/referralService';
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

export default function App() {
  const { currentUser, userData, logout: firebaseLogout } = useAuth();
  const [page, setPage] = useState(() => window.history.state?.page || (getPendingPathFromLocation() ? 'resolving-handle' : 'landingboard'));
  const [notifs, setNotifs] = useState([]);
  const [experts, setExperts] = useState([]);
  // Signed-up-but-not-yet-published experts, shown only in the experts directory.
  const [pendingExperts, setPendingExperts] = useState([]);
  const [activeExpert, setActiveExpert] = useState(null);
  const [activeExpertId, setActiveExpertId] = useState(() => window.history.state?.expertId || null);
  const [activeSession, setActiveSession] = useState(null);
  const [activeBook, setActiveBook] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  // null until the visitor picks Expert or Client on the signup role chooser —
  // an explicit "Join as an Expert"-style CTA sets it directly via nav().
  const [signupRole, setSignupRole] = useState(() => window.history.state?.signupRole ?? null);
  // Path A referral tracking: which expert's profile link a signup came
  // from. Always set explicitly by nav('signup', ctx) below — never
  // inherited from activeExpertId, so visiting an expert profile and later
  // clicking an unrelated "Sign Up" link can't wrongly attribute a referral.
  const [signupExpertId, setSignupExpertId] = useState(() => window.history.state?.signupExpertId ?? null);
  const [loginEmailHint, setLoginEmailHint] = useState('');
  // Carried over when a failed sign-in turns into "create an account" — saves
  // retyping the address they just entered on the login form.
  const [signupEmailHint, setSignupEmailHint] = useState('');
  const [preLoginPage, setPreLoginPage] = useState('landingboard');
  // A bare path like mindgigs.com/username is an expert's vanity URL, and
  // mindgigs.com/username/book-slug is a shareable link to one of their
  // books — held here until the experts list loads and we can resolve it.
  const [pendingPath, setPendingPath] = useState(getPendingPathFromLocation);

  // Capture an affiliate's referral link (?ref=CODE) before anything else
  // touches the URL. Stored for 30 days and pre-filled into the signup form, so
  // a referred visitor never has to type the code by hand. Runs on every load,
  // including a vanity URL like /their-handle?ref=their-handle.
  useEffect(() => {
    const captured = captureReferralFromUrl();
    if (!captured) return;
    // Strip ?ref= so the address bar (and anything the visitor copies out of
    // it) stops carrying someone else's referral around. The code lives in
    // localStorage from here on.
    const params = new URLSearchParams(window.location.search);
    params.delete('ref');
    const qs = params.toString();
    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname + (qs ? `?${qs}` : '')
    );
  }, []);

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
      window.history.replaceState({ page: 'landingboard', expertId: null, category: null, signupRole: null, signupExpertId: null, activeSession: null, activeBook: null }, '', window.location.href);
    }
    const handlePopState = (e) => {
      const s = e.state;
      if (!s) return;
      setPage(s.page);
      if (s.expertId !== undefined) {
        setActiveExpertId(s.expertId);
        const found = experts.find(ex => String(ex.id) === String(s.expertId));
        if (found) setActiveExpert(found);
        else if (!s.expertId) setActiveExpert(null);
      }
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
              { page: 'book-detail', expertId: match.id, category: null, signupRole: null, signupExpertId: null, activeSession: null, activeBook: book },
              '',
              `/${pendingPath.handle}/${pendingPath.bookSlug}`
            );
          } else {
            setPage('public-profile');
            window.history.replaceState(
              { page: 'public-profile', expertId: match.id, category: null, signupRole: null, signupExpertId: null, activeSession: null, activeBook: null },
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

  // Experts who've signed up but not yet finished onboarding. Kept as a
  // SEPARATE list from the published `experts` above on purpose: the experts
  // directory shows these (so a referred sign-up appears immediately, even
  // before they publish), but marketing surfaces — LandingBoard's featured
  // carousel, the directory's top-rated fan display — must keep showing only
  // real, finished profiles. Passing this only to ExpertsDirectory keeps the
  // blast radius to that one grid.
  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'expert'), where('onboardingComplete', '==', false));
    const unsubscribe = onSnapshot(q, (snap) => {
      const live = snap.docs.map(d => {
        const e = { ...d.data(), id: d.id, isLive: true, isSettingUp: true };
        const hasRealImage = e.image && !e.image.includes('placeholder') && !e.image.includes('ui-avatars.com');
        return hasRealImage ? e : { ...e, image: null };
      });
      // Same admin off-switch as published experts — a hidden profile stays
      // hidden whether or not onboarding is done.
      setPendingExperts(live.filter(e => e.profileActive !== false));
    }, (err) => {
      // A denied read here (e.g. rules not yet deployed) must not take down the
      // directory — just fall back to showing published experts only.
      console.error('Error fetching setting-up experts:', err);
      setPendingExperts([]);
    });
    return () => unsubscribe();
  }, [userData]);

  // Redirect after login. Login is role-agnostic — one form for everyone — so
  // the destination comes purely from the role on the account that just
  // authenticated, with no expected-role to reconcile against.
  useEffect(() => {
    if (!userData || page !== 'login') return;
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
  }, [userData, page, preLoginPage]);

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

  // "Log In" goes straight to one shared login form — there is no portal to
  // pick any more. Whichever role the account turns out to have is what the
  // redirect effect above routes on. Choosing a role only matters at SIGNUP,
  // where SignupPage asks (see its role chooser).
  const goToLogin = () => nav('login');

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
    if (p === 'login' && ctx?.emailHint !== undefined) setLoginEmailHint(ctx.emailHint || '');
    else if (p !== 'login') setLoginEmailHint('');
    if (p === 'signup' && ctx?.emailHint !== undefined) setSignupEmailHint(ctx.emailHint || '');
    else if (p !== 'signup') setSignupEmailHint('');
    // No role default here — nav('signup') with nothing specified means "the
    // visitor hasn't chosen yet", and SignupPage renders its role chooser.
    // Only an explicit ctx.role (e.g. "Join as an Expert") skips that step.
    if (p === 'signup') setSignupRole(ctx?.role || null);
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
      signupRole: p === 'signup' ? (ctx?.role ?? null) : signupRole,
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
      {page === 'home' && <LandingPage nav={nav} onLogin={goToLogin} />}
      {page === 'landingboard' && <LandingBoard nav={nav} onLogin={goToLogin} experts={experts} />}
      {page === 'login' && <LoginPage nav={nav} notify={notify} emailHint={loginEmailHint} />}
      {page === 'signup' && <SignupPage nav={nav} notify={notify} role={signupRole} expertId={signupExpertId} emailHint={signupEmailHint} />}
      {page === 'onboarding' && <OnboardingPage nav={nav} notify={notify} addExpert={e => setExperts(prev => [...prev, e])} />}
      {page === 'experts' && <ExpertsDirectory nav={nav} notify={notify} onLogin={goToLogin} experts={experts} pendingExperts={pendingExperts} selectedCategory={activeCategory} />}
      {page === 'public-profile' && <PublicProfile nav={nav} notify={notify} expert={resolvedExpert} />}
      {page === 'booking' && <BookingFlow nav={nav} notify={notify} expert={resolvedExpert} session={activeSession} />}
      {page === 'book-detail' && <BookDetailPage nav={nav} notify={notify} expert={resolvedExpert} book={activeBook} />}
      {page === 'expert-dashboard' && userData?.role === 'expert' && <ExpertDashboard user={userData} nav={nav} logout={logout} notify={notify} />}
      {page === 'admin-dashboard' && userData?.role === 'admin' && <AdminDashboard user={userData} nav={nav} logout={logout} notify={notify} />}
      {page === 'client-dashboard' && userData?.role === 'client' && <ClientDashboard user={userData} nav={nav} logout={logout} notify={notify} />}
    </>
  );
}
