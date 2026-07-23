import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  Calendar,
  RefreshCw,
  Package,
  Share2,
  BookOpen,
  FileText,
  Clock,
  Check,
  Sparkles,
  Award,
  User,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { initiateSubscriptionPayment, initiateProductPayment, confirmFreeProduct } from '../../services/stripeService';
import { resolveCouponCode } from '../../services/affiliateService';
import { formatOfferPrice } from '../../utils/price';
import { renderFormattedText } from '../../utils/richText';
import { getBookPurchaseFlags } from '../../utils/book';

const BADGE_BG = 'rgba(25, 181, 166, 0.08)';
const BIO_PREVIEW_LENGTH = 300;

function ExpandableBio({ bio }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = bio.length > BIO_PREVIEW_LENGTH;
  const displayText = expanded || !isLong ? bio : `${bio.slice(0, BIO_PREVIEW_LENGTH).trimEnd()}...`;

  return (
    <p style={{ fontSize: '.94rem', color: 'var(--sl)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
      {displayText}
      {isLong && (
        <span
          onClick={() => setExpanded((v) => !v)}
          style={{ color: 'var(--gd)', fontWeight: 600, cursor: 'pointer', marginLeft: 6 }}
        >
          {expanded ? 'less' : 'more'}
        </span>
      )}
    </p>
  );
}

// Custom offering descriptions can run long — clamp to a few lines by default
// so the section doesn't dominate the page, with a toggle to see the rest.
// Whether the toggle shows at all is based on measured overflow (scrollHeight
// vs clientHeight while clamped), not a character-count guess — a short desc
// in a wide card can fit in 3 lines even past a fixed character threshold.
function ExpandableOfferingDesc({ desc }) {
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef(null);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, [desc]);

  return (
    <div>
      <div
        ref={textRef}
        style={
          expanded
            ? undefined
            : {
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
        }
      >
        {renderFormattedText(desc, { fontSize: '.9rem', color: 'var(--sl)' })}
      </div>
      {isOverflowing && (
        <span
          onClick={() => setExpanded((v) => !v)}
          style={{ color: 'var(--teal)', fontWeight: 600, cursor: 'pointer', fontSize: '.82rem', display: 'inline-block', marginTop: 4, textDecoration: 'underline' }}
        >
          {expanded ? 'Read less' : 'Read more'}
        </span>
      )}
    </div>
  );
}

// Optional coupon-code affordance for products/subscriptions/custom offerings
// Confirmation step shown before any non-free purchase redirects to Stripe —
// styled to match the "Order Summary" step BookingFlow.jsx already shows for
// paid sessions, coupon field included. Zero-priced items skip this entirely
// (see isExplicitlyFree call sites) and grant access immediately, same as before.
export function OrderSummaryModal({
  pendingPurchase, expert, onConfirm, onClose, loading,
  couponCode, couponStatus, onCouponChange, onCouponBlur, showCoupon = true,
}) {
  if (!pendingPurchase) return null;
  const { type, item } = pendingPurchase;
  const priceLabel = type === 'subscription'
    ? (item.price ? `${formatOfferPrice(String(item.price).split('/')[0])}/mo` : '$—')
    : formatOfferPrice(item.price);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, padding: 32, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, color: 'var(--gd)', marginBottom: 20 }}>
          Order Summary
        </div>

        <div
          style={{
            background: 'var(--gmt)',
            borderRadius: 'var(--rsm)',
            padding: 20,
            marginBottom: 24,
            border: '1px solid rgba(255,155,81,.12)',
          }}
        >
          <div style={{ display: 'flex', gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(26, 184, 160, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '2px solid rgba(26, 184, 160, 0.2)',
              }}
            >
              <User size={24} color="var(--teal)" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, color: 'var(--gd)' }}>
                {expert?.name || 'this expert'}
              </div>
              <div style={{ fontSize: '.82rem', color: 'var(--sl)', marginTop: 2 }}>
                {item.title}
              </div>
              {type === 'subscription' && (
                <div style={{ fontSize: '.78rem', color: 'var(--gb)', marginTop: 4, fontWeight: 600 }}>
                  Billed monthly
                </div>
              )}
            </div>
            <div
              style={{
                marginLeft: 'auto',
                fontFamily: 'var(--fu)',
                fontSize: '1.3rem',
                fontWeight: 800,
                color: 'var(--gd)',
                whiteSpace: 'nowrap',
              }}
            >
              {priceLabel}
            </div>
          </div>
        </div>

        {showCoupon && (
          <div className="field">
            <label className="label">Coupon Code (optional)</label>
            <input
              className="input"
              placeholder="Have a coupon code?"
              value={couponCode}
              onChange={(e) => onCouponChange(e.target.value)}
              onBlur={onCouponBlur}
            />
            {couponStatus === 'checking' && <div style={{ fontSize: '.75rem', color: 'var(--mu)', marginTop: 6 }}>Checking code…</div>}
            {couponStatus === 'valid' && <div style={{ fontSize: '.75rem', color: 'var(--teal)', marginTop: 6 }}>✓ Code applied</div>}
            {couponStatus === 'invalid' && <div style={{ fontSize: '.75rem', color: '#e84444', marginTop: 6 }}>Invalid code</div>}
          </div>
        )}

        <div
          style={{
            borderTop: '1px solid rgba(255,155,81,.08)',
            paddingTop: 16,
            marginTop: showCoupon ? 4 : 0,
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '1rem', color: 'var(--gd)' }}>
            Total
          </span>
          <span style={{ fontFamily: 'var(--fu)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--gd)' }}>
            {priceLabel}
          </span>
        </div>

        <button
          className="btn w-full btn-lg"
          style={{
            background: loading ? '#8b85ff' : '#635bff',
            color: '#fff',
            fontFamily: 'var(--fu)',
            fontWeight: 700,
            fontSize: '1rem',
            opacity: loading ? 0.8 : 1,
            cursor: loading ? 'wait' : 'pointer',
          }}
          onClick={onConfirm}
          disabled={loading}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {loading ? 'Processing...' : (<><Lock size={16} /> Continue to Payment</>)}
          </div>
        </button>
        <p style={{ textAlign: 'center', fontSize: '.72rem', color: 'var(--mu)', marginTop: 12 }}>
          Secured by Stripe · 256-bit encryption
        </p>
        <button
          className="btn btn-gh w-full"
          style={{ marginTop: 10 }}
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

const ROLE_DASHBOARD_ROUTE = {
  expert: 'expert-dashboard',
  client: 'client-dashboard',
  // Legacy role — the affiliate portal was merged into the client dashboard.
  affiliate: 'client-dashboard',
  admin: 'admin-dashboard',
};

function SectionHeader({ icon, eyebrow, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: BADGE_BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontFamily: 'var(--fu)',
            fontSize: '.68rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'var(--teal)',
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </div>
        <div style={{ fontFamily: 'var(--fu)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--gd)', marginTop: 2 }}>
          {title}
        </div>
      </div>
    </div>
  );
}

const PRODUCT_GRADIENTS = [
  'linear-gradient(135deg, var(--gd), var(--teal))',
  'linear-gradient(135deg, var(--gb), var(--gd))',
  'linear-gradient(135deg, var(--teal), var(--gd))',
];

const BOOK_GRADIENTS = [
  'linear-gradient(160deg, var(--gd), var(--gb))',
  'linear-gradient(160deg, var(--teal), var(--gd))',
  'linear-gradient(160deg, var(--gb), var(--teal))',
];

export function PublicProfile({ nav, notify, expert: expertProp }) {
  const { currentUser, userData } = useAuth();
  const isLoggedIn = !!currentUser && !!userData?.role;
  const dashboardRoute = ROLE_DASHBOARD_ROUTE[userData?.role];
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  // The purchase awaiting confirmation in the Order Summary modal — every
  // non-free product/subscription/book pauses here before actually charging.
  const [pendingPurchase, setPendingPurchase] = useState(null); // { type: 'product'|'subscription', item, couponKey }
  // Coupon entry lives on the modal itself (like BookingFlow's checkout step),
  // not on the card — one active field at a time, reset whenever a new
  // purchase is opened.
  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState(null); // null | 'checking' | 'valid' | 'invalid'

  const handleCouponBlur = async () => {
    const trimmed = couponCode.trim();
    if (!trimmed) { setCouponStatus(null); return; }
    setCouponStatus('checking');
    try {
      const resolved = await resolveCouponCode(trimmed);
      setCouponStatus(resolved ? 'valid' : 'invalid');
    } catch {
      setCouponStatus(null);
    }
  };

  // Different entry points (Featured Experts carousel, ExpertsDirectory,
  // vanity URLs, etc.) have historically passed in different, sometimes
  // reduced, expert objects — causing this "same" page to render differently
  // depending on how you got here. This page is now the single source of
  // truth: it always re-fetches the full, live doc by ID, using whatever was
  // passed in only as an instant-paint placeholder while that load completes.
  const [expert, setExpert] = useState(expertProp);

  useEffect(() => {
    setExpert(expertProp);
    const expertId = expertProp?.id || expertProp?.uid;
    if (!expertId || String(expertId).startsWith('showcase-')) return;
    const unsub = onSnapshot(
      doc(db, 'users', expertId),
      (snap) => {
        if (snap.exists()) setExpert({ ...snap.data(), id: snap.id });
      },
      (err) => console.error('PublicProfile: failed to load live expert data', err)
    );
    return () => unsub();
  }, [expertProp?.id, expertProp?.uid]);

  const parsePriceCents = (priceStr) => {
    const num = parseFloat(String(priceStr ?? '').replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : Math.round(num * 100);
  };

  const goToSignup = () => nav('signup', { role: 'client', expertId: expert?.id || expert?.uid });

  // A blank price (e.g. an unpriced "Custom" offering) is not the same as an
  // explicit "$0" — only the latter should skip checkout and grant free access.
  const isExplicitlyFree = (priceStr) => {
    const trimmed = String(priceStr ?? '').trim();
    return trimmed !== '' && parsePriceCents(trimmed) === 0;
  };

  const handleSubscribe = async (sub) => {
    if (!currentUser) {
      goToSignup();
      return;
    }
    if (!String(sub.price ?? '').trim()) { notify('Invalid subscription price.', 'error'); return; }
    if (isExplicitlyFree(sub.price)) {
      notify("You're subscribed — no payment required!", 'success');
      return;
    }
    // Non-free — pause on the Order Summary modal rather than charging immediately.
    setCouponCode('');
    setCouponStatus(null);
    setPendingPurchase({ type: 'subscription', item: sub });
  };

  const handleBuyNow = async (product) => {
    if (!currentUser) {
      goToSignup();
      return;
    }
    if (!String(product.price ?? '').trim()) { notify('Invalid product price.', 'error'); return; }
    if (isExplicitlyFree(product.price)) {
      const couponKey = `prod-${product.title}`;
      setCheckoutLoading(couponKey);
      try {
        await confirmFreeProduct(
          expert?.id || expert?.uid || '',
          product.title,
          currentUser.email,
          product.deliveryLink || product.fileUrl || null,
          currentUser.uid
        );
        notify('You now have access — check your email for the details.', 'success');
      } catch (err) {
        notify(err.message || 'Failed to complete your free purchase. Please try again.', 'error');
      } finally {
        setCheckoutLoading(null);
      }
      return;
    }
    // Non-free — pause on the Order Summary modal rather than charging immediately.
    // Covers products, custom offerings, and books' internal "Buy Now" alike
    // (they all funnel through this same handler).
    setCouponCode('');
    setCouponStatus(null);
    setPendingPurchase({ type: 'product', item: product });
  };

  // Fires from the Order Summary modal's "Continue to Payment" — the actual
  // Stripe redirect only happens after this explicit confirmation. Mirrors
  // BookingFlow.jsx's handlePayment: blocks only on a confirmed-invalid
  // coupon, otherwise sends whatever's typed (the webhook re-validates).
  const confirmPendingPurchase = async () => {
    if (!pendingPurchase) return;
    if (couponStatus === 'invalid') {
      notify('That coupon code is invalid — fix it or clear it before continuing.', 'warn');
      return;
    }
    const { type, item } = pendingPurchase;
    const appliedCoupon = couponCode.trim() || null;
    const amount = parsePriceCents(item.price);
    const loadingKey = `${type === 'subscription' ? 'sub' : 'prod'}-${item.title}`;
    setCheckoutLoading(loadingKey);
    try {
      if (type === 'subscription') {
        await initiateSubscriptionPayment(
          expert?.id || expert?.uid || '',
          item.title,
          amount,
          currentUser.email,
          currentUser.uid,
          appliedCoupon
        );
      } else {
        await initiateProductPayment(
          expert?.id || expert?.uid || '',
          item.title,
          amount,
          currentUser.email,
          item.deliveryLink || item.fileUrl || null,
          currentUser.uid,
          appliedCoupon
        );
      }
      // On success, initiate*Payment redirects the browser away — nothing left to do here.
    } catch (err) {
      notify(err.message || 'Failed to start checkout. Please try again.', 'error');
      setCheckoutLoading(null);
    }
  };

  const handleBuyBookNow = (book) => handleBuyNow(book);

  const handleBuyBookAmazon = (book) => {
    if (!book.link) return;
    window.open(book.link, '_blank', 'noopener,noreferrer');
  };

  const handleOpenBook = (book) => {
    nav('book-detail', { book, expertId: expert?.id || expert?.uid, expert });
  };

  const handleBookCall = (c) => {
    if (!currentUser) {
      goToSignup();
      return;
    }
    // A free scheduling call — BookingFlow skips checkout entirely for
    // freeCall sessions and confirms the meeting right after date/email entry.
    nav('booking', { session: { title: c.title, duration: c.duration || 'Flexible', freeCall: true } });
  };

  if (!expert) return null;

  const initials = (expert.name || 'E')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const firstName = expert.name?.split(' ')[0] || 'this expert';

  // Each dashboard section (Sessions/Subscriptions/Products/Books/CustomOfferings)
  // has a "Listed for Sale" toggle that writes `active`; only listed items should
  // ever reach the public profile.
  const isListed = (item) => item.active !== false;
  const sessions = (expert.sessionsList || []).filter(isListed);
  const subscriptions = (expert.subscriptionsList || expert.subscriptions || []).filter(isListed);
  const products = (expert.productsList || []).filter(isListed);
  const books = (expert.booksList || []).filter(isListed);
  const customOfferings = (expert.customOfferingsList || []).filter(isListed);
  const highlights = (expert.highlightsList || []).filter(isListed);

  return (
    <div style={{ background: 'var(--cr)', minHeight: '100vh' }}>
      <OrderSummaryModal
        pendingPurchase={pendingPurchase}
        expert={expert}
        couponCode={couponCode}
        couponStatus={couponStatus}
        onCouponChange={(v) => { setCouponCode(v); setCouponStatus(null); }}
        onCouponBlur={handleCouponBlur}
        onConfirm={confirmPendingPurchase}
        onClose={() => setPendingPurchase(null)}
        loading={
          !!pendingPurchase &&
          checkoutLoading === `${pendingPurchase.type === 'subscription' ? 'sub' : 'prod'}-${pendingPurchase.item.title}`
        }
      />
      {/* Nav */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid rgba(84,119,146,0.1)',
          padding: '20px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span
            style={{
              fontFamily: 'var(--fb)',
              fontWeight: 700,
              fontSize: '1.1rem',
              color: '#0F172A',
              cursor: 'pointer',
              letterSpacing: '-0.04em',
              paddingLeft: 4,
            }}
            onClick={() => nav('landingboard')}
          >
            mind<span style={{ color: 'var(--teal)' }}>G</span>igs
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn btn-gh btn-sm"
            onClick={() => {
              if (!expert?.handle) { notify('This profile has no public link yet.', 'warn'); return; }
              navigator.clipboard.writeText(`https://mindgigs.com/${expert.handle}`);
              notify('Profile link copied!');
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Share2 size={14} /> Share
          </button>
          {isLoggedIn ? (
            <button className="btn btn-gr btn-sm" onClick={() => nav(dashboardRoute)}>
              Profile
            </button>
          ) : (
            <button className="btn btn-gr btn-sm" onClick={() => nav('signup')}>
              Create Your Profile
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px 64px' }}>
        {/* Profile Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ position: 'relative', width: 200, height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                position: 'absolute',
                inset: -24,
                borderRadius: 24,
                background: 'radial-gradient(circle, rgba(25,148,136,0.22) 0%, rgba(15,23,42,0.12) 55%, rgba(15,23,42,0) 75%)',
                filter: 'blur(2px)',
              }}
            />
            <div
              style={{
                position: 'relative',
                width: 200,
                height: 250,
                borderRadius: 16,
                background: 'linear-gradient(135deg, var(--gd), var(--teal))',
                boxShadow: '0 12px 32px rgba(15,23,42,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {expert.image ? (
                <img src={expert.image} alt={expert.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
              ) : (
                <span style={{ fontFamily: 'var(--fu)', fontSize: 72, fontWeight: 700, color: '#fff' }}>{initials}</span>
              )}
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <div style={{ fontFamily: 'var(--fu)', fontSize: '2rem', fontWeight: 800, color: 'var(--gd)', letterSpacing: '-0.02em' }}>
              {expert.name}
            </div>
            {expert.headline && (
              <div style={{ fontSize: '.92rem', color: 'var(--sl)', fontWeight: 500, marginTop: 6 }}>{expert.headline}</div>
            )}
          </div>

          {(expert.tags?.length > 0 || expert.twitter || expert.linkedin || expert.youtube || expert.whatsapp) && (
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              {expert.tags?.map((t) => (
                <span key={t} className="tag tag-gr">{t}</span>
              ))}
              {expert.twitter && (
                <a
                  href={expert.twitter.startsWith('http') ? expert.twitter : `https://${expert.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '.85rem', color: 'var(--gd)', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontWeight: 600 }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  Twitter(X)
                </a>
              )}
              {expert.linkedin && (
                <a
                  href={expert.linkedin.startsWith('http') ? expert.linkedin : `https://${expert.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '.85rem', color: '#0A66C2', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontWeight: 600 }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  LinkedIn
                </a>
              )}
              {expert.youtube && (
                <a
                  href={expert.youtube.startsWith('http') ? expert.youtube : `https://${expert.youtube}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '.85rem', color: '#FF0000', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontWeight: 600 }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  YouTube
                </a>
              )}
              {expert.whatsapp && (
                <a
                  href={`https://wa.me/${expert.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '.85rem', color: '#25D366', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontWeight: 600 }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  WhatsApp
                </a>
              )}
            </div>
          )}

          {expert.bio && (
            <div className="card" style={{ marginTop: 20, width: '100%', padding: '24px 32px', textAlign: 'left' }}>
              <ExpandableBio bio={expert.bio} />
            </div>
          )}
        </div>

        {/* Highlights & Achievements */}
        {highlights.length > 0 && (
        <div style={{ marginTop: 56 }}>
          <SectionHeader
            icon={<Award size={18} color="var(--teal)" />}
            eyebrow="Highlights"
            title="Achievements"
          />
          <div className="grid-3" style={{ gap: 16 }}>
            {highlights.map((h, i) => {
              const card = (
                <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '16/10',
                      overflow: 'hidden',
                      background: h.imageUrl ? '#eef1f4' : PRODUCT_GRADIENTS[i % PRODUCT_GRADIENTS.length],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {h.imageUrl ? (
                      <img src={h.imageUrl} alt={h.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Award size={28} color="#fff" opacity={0.85} />
                    )}
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontFamily: 'var(--fu)', fontSize: '.9rem', fontWeight: 700, color: 'var(--gd)', lineHeight: 1.35 }}>
                      {h.title}
                    </div>
                  </div>
                </div>
              );
              return h.link ? (
                <a
                  key={h.title}
                  href={h.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  {card}
                </a>
              ) : (
                <div key={h.title}>{card}</div>
              );
            })}
          </div>
        </div>
        )}

        {/* 1:1 Sessions */}
        {sessions.length > 0 && (
        <div style={{ marginTop: 56 }}>
          <SectionHeader
            icon={<Calendar size={18} color="var(--teal)" />}
            eyebrow="1:1 Sessions"
            title={`Book time with ${firstName}`}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sessions.map((s) => (
              <div
                key={s.title}
                className="card"
                style={{
                  padding: '28px 32px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  gap: 20,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontFamily: 'var(--fu)', fontSize: '1.05rem', fontWeight: 600, color: 'var(--gd)' }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: '.8rem', color: 'var(--mu)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={13} /> {s.duration}
                  </div>
                  {s.desc && (
                    <div style={{ marginTop: 10, maxWidth: 480 }}>
                      <ExpandableOfferingDesc desc={s.desc} />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, minWidth: 120 }}>
                  <div style={{ fontFamily: 'var(--fu)', fontSize: '1.35rem', fontWeight: 800, color: 'var(--gd)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatOfferPrice(s.price)}
                  </div>
                  <button className="btn btn-gr btn-sm" onClick={() => { if (!currentUser) { goToSignup(); return; } nav('booking', { session: s }); }}>
                    Book Now
                  </button>
                  <a href="#" className="affiliate-link" style={{ display: 'block', fontSize: '0.68rem' }} onClick={(e) => { e.preventDefault(); nav('signup', { role: 'client' }); }}>
                    Start earning referral commissions
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Books */}
        {books.length > 0 && (
        <div style={{ marginTop: 56 }}>
          <SectionHeader
            icon={<BookOpen size={18} color="var(--teal)" />}
            eyebrow="Books"
            title="Published work"
          />
          <div
            style={{
              display: 'flex',
              gap: 16,
              overflowX: 'auto',
              paddingBottom: 10,
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'thin',
            }}
          >
            {books.map((b, i) => (
              <div key={b.title} className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14, flex: '0 0 240px', width: 240, scrollSnapAlign: 'start' }}>
                <div
                  onClick={() => handleOpenBook(b)}
                  style={{
                    width: 88,
                    aspectRatio: '2/3',
                    borderRadius: 6,
                    overflow: 'hidden',
                    background: b.coverUrl ? '#eef1f4' : BOOK_GRADIENTS[i % BOOK_GRADIENTS.length],
                    boxShadow: '0 4px 12px rgba(15,23,42,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                >
                  {b.coverUrl ? (
                    <img src={b.coverUrl} alt={b.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <BookOpen size={22} color="#fff" opacity={0.85} />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  <div>
                    <div
                      onClick={() => handleOpenBook(b)}
                      style={{ fontFamily: 'var(--fu)', fontSize: '1rem', fontWeight: 700, color: 'var(--gd)', lineHeight: 1.3, cursor: 'pointer' }}
                    >
                      {b.title}
                    </div>
                    {b.author && (
                      <div style={{ fontSize: '.78rem', color: 'var(--mu)', marginTop: 3 }}>by {b.author}</div>
                    )}
                  </div>
                  <div style={{ fontSize: '.84rem', color: 'var(--sl)', lineHeight: 1.5 }}>{b.tagline}</div>
                  <div>
                    <span
                      style={{
                        display: 'inline-block',
                        background: 'rgba(15,23,42,0.05)',
                        color: 'var(--sl)',
                        fontSize: '.72rem',
                        fontWeight: 600,
                        padding: '4px 11px',
                        borderRadius: 999,
                      }}
                    >
                      {b.format}
                    </span>
                  </div>
                  <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                    <div style={{ fontFamily: 'var(--fu)', fontSize: '1.1rem', fontWeight: 800, color: 'var(--gd)', fontVariantNumeric: 'tabular-nums', marginBottom: 8 }}>
                      {formatOfferPrice(b.price)}
                    </div>
                    {(() => {
                      const { buyNow, amazon } = getBookPurchaseFlags(b);
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {buyNow && (
                            <button className="btn btn-pr btn-sm" style={{ width: '100%' }} onClick={() => handleBuyBookNow(b)}>
                              {checkoutLoading === `prod-${b.title}` ? '...' : 'Buy Now'}
                            </button>
                          )}
                          {amazon && (
                            <button className="btn btn-gh btn-sm" style={{ width: '100%' }} onClick={() => handleBuyBookAmazon(b)}>
                              Buy on Amazon
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Subscriptions */}
        {subscriptions.length > 0 && (
        <div style={{ marginTop: 56 }}>
          <SectionHeader
            icon={<RefreshCw size={18} color="var(--teal)" />}
            eyebrow="Subscriptions"
            title="Ongoing advisory access"
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {subscriptions.map((sub) => (
              <div
                key={sub.id || sub.title}
                className="card"
                style={{
                  position: 'relative',
                  padding: 32,
                  borderTop: '3px solid var(--teal)',
                  display: 'flex',
                  gap: 24,
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: -11,
                    left: 32,
                    background: 'var(--teal)',
                    color: '#fff',
                    fontSize: '.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    padding: '4px 12px',
                    borderRadius: 999,
                  }}
                >
                  Featured
                </span>
                <div style={{ flex: 1, minWidth: 280, display: 'flex', gap: 18 }}>
                  <div
                    style={{
                      width: 76,
                      height: 76,
                      borderRadius: 12,
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: sub.imageUrl ? '#eef1f4' : PRODUCT_GRADIENTS[0],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {sub.imageUrl ? (
                      <img src={sub.imageUrl} alt={sub.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <RefreshCw size={26} color="#fff" opacity={0.9} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, color: 'var(--gd)', fontSize: '1.2rem' }}>
                      {sub.title}
                    </div>
                    {sub.desc && (
                      <p style={{ fontSize: '.9rem', color: 'var(--sl)', marginTop: 6, lineHeight: 1.55, maxWidth: 420 }}>
                        {sub.desc}
                      </p>
                    )}
                    {sub.benefits?.filter((b) => b.trim() !== '').length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 18 }}>
                        {sub.benefits.filter((b) => b.trim() !== '').map((f) => (
                          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '.9rem', color: 'var(--sl)' }}>
                            <span
                              style={{
                                width: 19,
                                height: 19,
                                borderRadius: '50%',
                                background: 'var(--teal)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <Check size={11} color="#fff" strokeWidth={3} />
                            </span>
                            {f}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 14, minWidth: 140 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--fu)', fontSize: '1.9rem', fontWeight: 800, color: 'var(--gd)', fontVariantNumeric: 'tabular-nums' }}>
                      {sub.price ? formatOfferPrice(String(sub.price).split('/')[0]) : '$—'}
                    </div>
                    <div style={{ fontSize: '.8rem', color: 'var(--mu)' }}>/month</div>
                  </div>
                  <button
                    className="btn btn-gr"
                    disabled={checkoutLoading === `sub-${sub.title}`}
                    onClick={() => handleSubscribe(sub)}
                  >
                    {checkoutLoading === `sub-${sub.title}` ? 'Redirecting...' : 'Subscribe →'}
                  </button>
                  <a href="#" className="affiliate-link" style={{ display: 'block', fontSize: '0.72rem' }} onClick={(e) => { e.preventDefault(); nav('signup', { role: 'client' }); }}>
                    Start earning referral commissions
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Digital Products */}
        {products.length > 0 && (
        <div style={{ marginTop: 56 }}>
          <SectionHeader
            icon={<Package size={18} color="var(--teal)" />}
            eyebrow="Digital Products"
            title="Templates & guides"
          />
          <div className="grid-3">
            {products.map((p, i) => (
              <div key={p.title} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    position: 'relative',
                    aspectRatio: '16/9',
                    background: p.imageUrl ? '#eef1f4' : PRODUCT_GRADIENTS[i % PRODUCT_GRADIENTS.length],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <FileText size={30} color="#fff" opacity={0.9} />
                  )}
                  {p.sold && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        background: 'rgba(255,255,255,0.92)',
                        color: 'var(--gd)',
                        fontSize: '.68rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 999,
                      }}
                    >
                      {p.sold} sold
                    </span>
                  )}
                </div>
                <div style={{ padding: '22px 22px 24px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--fu)', fontWeight: 600, color: 'var(--gd)', fontSize: '1rem' }}>{p.title}</div>
                    <div style={{ fontSize: '.86rem', color: 'var(--sl)', marginTop: 6, lineHeight: 1.5 }}>{p.description}</div>
                  </div>
                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--fu)', fontSize: '1.15rem', fontWeight: 800, color: 'var(--gd)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatOfferPrice(p.price)}
                    </span>
                    <button
                      className="btn btn-pr btn-sm"
                      disabled={checkoutLoading === `prod-${p.title}`}
                      onClick={() => handleBuyNow(p)}
                    >
                      {checkoutLoading === `prod-${p.title}` ? '...' : 'Buy Now'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Custom Offerings */}
        {customOfferings.length > 0 && (
          <div style={{ marginTop: 56 }}>
            <SectionHeader
              icon={<Sparkles size={18} color="var(--teal)" />}
              eyebrow="Custom Offerings"
              
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {customOfferings.map((c) => (
                <div key={c.title} className="card" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ fontFamily: 'var(--fu)', fontWeight: 600, color: 'var(--gd)', fontSize: '1.05rem', marginBottom: 4 }}>{c.title}</div>
                    {c.type && (
                      <span style={{ display: 'inline-block', background: BADGE_BG, color: 'var(--teal)', fontSize: '.72rem', fontWeight: 700, padding: '2px 10px', borderRadius: 99, marginBottom: 6 }}>
                        {c.type}
                      </span>
                    )}
                    {c.desc && <ExpandableOfferingDesc desc={c.desc} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, minWidth: 120 }}>
                    {c.price && (
                      <div style={{ fontFamily: 'var(--fu)', fontSize: '1.35rem', fontWeight: 800, color: 'var(--gd)', fontVariantNumeric: 'tabular-nums' }}>{formatOfferPrice(c.price)}</div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-gh btn-sm" onClick={() => handleBookCall(c)}>
                        Book a Call
                      </button>
                      <button
                        className="btn btn-gr btn-sm"
                        disabled={checkoutLoading === `prod-${c.title}`}
                        onClick={() => handleBuyNow(c)}
                      >
                        {checkoutLoading === `prod-${c.title}` ? '...' : 'Buy Now'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {sessions.length === 0 && subscriptions.length === 0 && products.length === 0 && books.length === 0 && customOfferings.length === 0 && highlights.length === 0 && (
          <div style={{ marginTop: 56, textAlign: 'center', padding: '48px 24px', color: 'var(--mu)' }}>
            <div style={{ fontSize: '.95rem' }}>{firstName} hasn't published any offerings yet. Check back soon!</div>
          </div>
        )}

      </div>
    </div>
  );
}
