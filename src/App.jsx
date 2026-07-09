import React, { useState, useEffect } from 'react';
import { Notifications } from './components/common/Notifications';
import { LandingPage } from './components/pages/LandingPage';
import { LoginPage } from './components/pages/LoginPage';
import { SignupPage } from './components/pages/SignupPage';
import { OnboardingPage } from './components/pages/OnboardingPage';
import { PublicProfile } from './components/pages/PublicProfile';
import { BookingFlow } from './components/pages/BookingFlow';
import { ExpertsDirectory } from './components/pages/ExpertsDirectory';
import { LandingBoard } from './components/pages/LandingBoard';
import { ExpertDashboard } from './components/dashboards/expert/ExpertDashboard';
import { AdminDashboard } from './components/dashboards/admin/AdminDashboard';
import { AffiliateDashboard } from './components/dashboards/affiliate/AffiliateDashboard';
import { ClientDashboard } from './components/dashboards/client/ClientDashboard';
import { Users, ShoppingCart, Link as LinkIcon, ShieldCheck, ChevronRight } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { db } from './config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { captureReferralCode } from './services/affiliateService';
import { RESERVED_HANDLES, normalizeHandle } from './services/handleService';

import './styles/globals.css';
import './styles/utilities.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';

const SHOWCASE_EXPERTS = [
  { id: 'showcase-amir', name: 'Amir Anzur', role: 'CMO - PSEB', image: '/images/amiranzur.png', expertise: ['Strategy', 'Teaching', 'Authorship'], tags: ['Strategist', 'Teacher', 'Author'], category: 'Business', isShowcase: true },
  { id: 'showcase-moe', name: 'Moe Mhanna', role: 'CPA · MBA in Business Administration & Accounting', image: '/images/moemohana.png', expertise: ['Strategic Consulting', 'Auditing', 'Authorship'], tags: ['Strategic Consultant', 'Author', 'Auditor'], category: 'Finance', isShowcase: true },
  { id: 'showcase-chris', name: 'Chris Tibbetts', role: 'Serial Entrepreneur & Business Growth Expert', image: '/images/Chris-Tibbetts.png', expertise: ['Entrepreneurship', 'Growth Strategy', 'Leadership'], tags: ['Entrepreneurship', 'Growth', 'Leadership'], category: 'Business', isShowcase: true },
];

const IMAGE_OVERRIDES = {
  'Amir Anzur': '/images/amiranzur.png',
  'Moe Mhanna': '/images/moemohana.png',
  'Chris Tibbetts': '/images/Chris-Tibbetts.png',
};

function LoginSelectorModal({ onClose, onSelect }) {
  const roles = [
    { role: 'expert', icon: Users, title: 'Expert / Creator', sub: 'Access your profile, bookings & earnings' },
    { role: 'client', icon: ShoppingCart, title: 'Client / Buyer', sub: 'View bookings, subscriptions & purchases' },
    { role: 'affiliate', icon: LinkIcon, title: 'Affiliate Partner', sub: 'View referrals, commissions & payouts' },
    { role: 'admin', icon: ShieldCheck, title: 'Administrator', sub: 'Platform management & oversight' },
  ];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="slabel">Access Your Account</div>
        <h2 className="stitle" style={{ fontSize: '1.6rem' }}>Who are you logging in as?</h2>
        <p style={{ fontSize: '.875rem', color: 'var(--sl)', marginTop: 8 }}>mindGigs has separate portals for experts, affiliates, and administrators.</p>
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
  const [page, setPage] = useState(() => window.history.state?.page || 'landingboard');
  const [showLoginSelector, setShowLoginSelector] = useState(false);
  const [loginRole, setLoginRole] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [experts, setExperts] = useState([]);
  const [activeExpert, setActiveExpert] = useState(null);
  const [activeExpertId, setActiveExpertId] = useState(() => window.history.state?.expertId || null);
  const [activeSession, setActiveSession] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [signupRole, setSignupRole] = useState('expert');
  const [loginEmailHint, setLoginEmailHint] = useState('');
  const [preLoginPage, setPreLoginPage] = useState('landingboard');
  // A bare path like mindgigs.com/username may be an expert's vanity URL —
  // held here until the experts list loads and we can resolve it by handle.
  const [pendingSlug, setPendingSlug] = useState(() => {
    const slug = normalizeHandle(window.location.pathname.replace(/^\/+|\/+$/g, ''));
    return slug && !RESERVED_HANDLES.has(slug) ? slug : null;
  });

  // Capture referral code from URL on first load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) captureReferralCode(ref);
  }, []);

  // Handle Stripe redirect return (?payment=success or ?payment=cancelled)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'success') {
      notify('Payment confirmed! Your session is booked.', 'success');
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
      window.history.replaceState({ page: 'landingboard', expertId: null, category: null, loginRole: null, signupRole: 'expert', activeSession: null, showLoginSelector: false }, '', window.location.href);
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
      if (s.category !== undefined) setActiveCategory(s.category);
      if (s.activeSession !== undefined) setActiveSession(s.activeSession);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [experts]);

  // Fetch live experts from Firestore, merge with showcase
  useEffect(() => {
    async function fetchExperts() {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'expert'), where('onboardingComplete', '==', true));
        const snap = await getDocs(q);
        const live = snap.docs.map(d => {
          const e = { ...d.data(), id: d.id, isLive: true };
          const hasRealImage = e.image && !e.image.includes('placeholder') && !e.image.includes('ui-avatars.com');
          if (hasRealImage) return e;
          const override = IMAGE_OVERRIDES[e.name] || IMAGE_OVERRIDES[e.handle];
          if (override) return { ...e, image: override };
          return { ...e, image: null };
        });
        const liveNames = new Set(live.map(e => (e.name || '').toLowerCase()));
        const toAdd = SHOWCASE_EXPERTS.filter(se => !liveNames.has(se.name.toLowerCase()));
        setExperts([...live, ...toAdd]);

        // Resolve a pending vanity-URL slug against the freshly-loaded expert
        // list. Only runs once — cleared below regardless of outcome, so a
        // later re-fetch (e.g. after login) can't re-trigger vanity routing
        // after the user has already navigated elsewhere.
        if (pendingSlug) {
          const match = live.find(e => e.handle === pendingSlug);
          if (match) {
            captureReferralCode(pendingSlug);
            setActiveExpert(match);
            setActiveExpertId(match.id);
            setPage('public-profile');
            window.history.replaceState(
              { page: 'public-profile', expertId: match.id, category: null, loginRole: null, signupRole: 'expert', activeSession: null },
              '',
              '/' + pendingSlug
            );
          }
          setPendingSlug(null);
        }
      } catch (err) {
        console.error('Error fetching experts:', err);
        setExperts(SHOWCASE_EXPERTS);
      }
    }
    fetchExperts();
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
    const routes = { admin: 'admin-dashboard', affiliate: 'affiliate-dashboard', client: 'client-dashboard' };
    const dest = routes[userData.role];
    if (dest) { setPage(dest); notify('Welcome back!'); }
  }, [userData, page, loginRole, preLoginPage]);

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
    window.history.pushState({ page, expertId: activeExpertId, category: activeCategory, loginRole, signupRole, activeSession, showLoginSelector: true }, '', window.location.href);
  };

  const nav = (p, ctx) => {
    if (p === 'login' && page !== 'login') setPreLoginPage(page);
    const newExpertId = ctx?.expertId !== undefined ? ctx.expertId : (p === 'public-profile' ? activeExpertId : null);
    // Resolved once and reused below for both the active-expert state and the
    // address-bar path, so the two can never disagree on which expert this is.
    const resolvedForNav = ctx?.expertId !== undefined
      ? (ctx.expert || experts.find(e => String(e.id) === String(ctx.expertId)))
      : (p === 'public-profile' ? (activeExpert || experts.find(e => String(e.id) === String(newExpertId))) : null);
    if (ctx?.expertId !== undefined) {
      setActiveExpertId(ctx.expertId);
      if (resolvedForNav) setActiveExpert(resolvedForNav);
    }
    if (p === 'login' && ctx?.role) setLoginRole(ctx.role);
    if (p === 'login' && ctx?.emailHint !== undefined) setLoginEmailHint(ctx.emailHint || '');
    else if (p !== 'login') setLoginEmailHint('');
    if (p === 'signup') setSignupRole(ctx?.role || 'expert');
    if (ctx?.category !== undefined) setActiveCategory(ctx.category);
    else if (p !== 'experts') setActiveCategory(null);
    if (ctx?.session !== undefined) setActiveSession(ctx.session);
    else if (p !== 'booking') setActiveSession(null);

    // Give an expert's public profile a real, shareable address-bar path.
    // Every other page keeps today's behavior (URL left untouched) to avoid
    // disturbing existing back/forward navigation for the rest of the app.
    // Navigating to/from a profile always resets the path (even with no
    // resolvable handle) so the address bar never shows a stale expert's URL.
    let urlPath = window.location.href;
    if (p === 'public-profile') {
      urlPath = resolvedForNav?.handle ? '/' + resolvedForNav.handle : '/';
    } else if (page === 'public-profile') {
      urlPath = '/';
    }

    window.history.pushState({
      page: p,
      expertId: newExpertId,
      category: ctx?.category ?? activeCategory ?? null,
      loginRole: p === 'login' ? (ctx?.role || loginRole) : loginRole,
      signupRole: p === 'signup' ? (ctx?.role || signupRole) : signupRole,
      activeSession: p === 'booking' ? (ctx?.session || activeSession) : null,
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
      {page === 'home' && <LandingPage nav={nav} onLogin={openLoginSelector} />}
      {page === 'landingboard' && <LandingBoard nav={nav} onLogin={openLoginSelector} experts={experts} />}
      {page === 'login' && <LoginPage role={loginRole} nav={nav} onSwitchRole={openLoginSelector} notify={notify} emailHint={loginEmailHint} />}
      {page === 'signup' && <SignupPage nav={nav} notify={notify} role={signupRole} />}
      {page === 'onboarding' && <OnboardingPage nav={nav} notify={notify} addExpert={e => setExperts(prev => [...prev, e])} />}
      {page === 'experts' && <ExpertsDirectory nav={nav} notify={notify} onLogin={openLoginSelector} experts={experts} selectedCategory={activeCategory} />}
      {page === 'public-profile' && <PublicProfile nav={nav} notify={notify} expert={resolvedExpert} />}
      {page === 'booking' && <BookingFlow nav={nav} notify={notify} expert={resolvedExpert} session={activeSession} />}
      {page === 'expert-dashboard' && userData?.role === 'expert' && <ExpertDashboard user={userData} nav={nav} logout={logout} notify={notify} />}
      {page === 'admin-dashboard' && userData?.role === 'admin' && <AdminDashboard user={userData} nav={nav} logout={logout} notify={notify} />}
      {page === 'affiliate-dashboard' && userData?.role === 'affiliate' && <AffiliateDashboard user={userData} nav={nav} logout={logout} notify={notify} />}
      {page === 'client-dashboard' && userData?.role === 'client' && <ClientDashboard user={userData} nav={nav} logout={logout} notify={notify} />}
    </>
  );
}
