import React, { useState } from 'react';
import {
  Calendar,
  RefreshCw,
  Package,
  Share2,
  BookOpen,
  Twitter,
  Linkedin,
  FileText,
  Clock,
  Check,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { initiateSubscriptionPayment, initiateProductPayment } from '../../services/stripeService';
import { getStoredReferralCode } from '../../services/affiliateService';

const BADGE_BG = 'rgba(25, 181, 166, 0.08)';

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

export function PublicProfile({ nav, notify, expert }) {
  const { currentUser } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  const parsePriceCents = (priceStr) => {
    const num = parseFloat(String(priceStr ?? '').replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : Math.round(num * 100);
  };

  const handleSubscribe = async (sub) => {
    if (!currentUser) {
      notify('Please log in to subscribe.', 'warn');
      nav('login', { role: 'client' });
      return;
    }
    const amount = parsePriceCents(sub.price);
    if (!amount) { notify('Invalid subscription price.', 'error'); return; }
    setCheckoutLoading(`sub-${sub.title}`);
    try {
      await initiateSubscriptionPayment(
        expert?.id || expert?.uid || '',
        sub.title,
        amount,
        currentUser.email,
        getStoredReferralCode() || null
      );
    } catch (err) {
      notify(err.message || 'Failed to start checkout. Please try again.', 'error');
      setCheckoutLoading(null);
    }
  };

  const handleBuyNow = async (product) => {
    if (!currentUser) {
      notify('Please log in to purchase.', 'warn');
      nav('login', { role: 'client' });
      return;
    }
    const amount = parsePriceCents(product.price);
    if (!amount) { notify('Invalid product price.', 'error'); return; }
    setCheckoutLoading(`prod-${product.title}`);
    try {
      await initiateProductPayment(
        expert?.id || expert?.uid || '',
        product.title,
        amount,
        currentUser.email,
        getStoredReferralCode() || null,
        product.deliveryLink || product.fileUrl || null,
        currentUser.uid
      );
    } catch (err) {
      notify(err.message || 'Failed to start checkout. Please try again.', 'error');
      setCheckoutLoading(null);
    }
  };

  const handleBuyBook = (book) => {
    if (book.link) {
      window.open(book.link, '_blank', 'noopener,noreferrer');
      return;
    }
    handleBuyNow(book);
  };

  const handleCustomCta = (c) => {
    if (c.ctaType === 'book') {
      nav('booking', { session: { title: c.title, price: c.price || 'Contact for pricing', duration: c.duration || 'Flexible' } });
    } else if (c.ctaType === 'custom' && c.link) {
      window.open(c.link, '_blank', 'noopener,noreferrer');
    } else {
      notify('Contact the expert to inquire.');
    }
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

  return (
    <div style={{ background: 'var(--cr)', minHeight: '100vh' }}>
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
          <button className="btn btn-gr btn-sm" onClick={() => nav('signup')}>
            Create Your Profile
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px 0' }}>
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
                <img src={expert.image} alt={expert.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
            <div style={{ marginTop: 6, fontFamily: 'var(--fu)', fontSize: '.94rem', color: 'var(--teal)', fontWeight: 500 }}>
              mindgigs.com/{expert.handle}
            </div>
          </div>

          {(expert.tags?.length > 0 || expert.twitter || expert.linkedin) && (
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              {expert.tags?.map((t) => (
                <span key={t} className="tag tag-gr">{t}</span>
              ))}
              {expert.twitter && (
                <a
                  href={expert.twitter.startsWith('http') ? expert.twitter : `https://${expert.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '.85rem', color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontWeight: 600 }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  <Twitter size={16} /> Twitter
                </a>
              )}
              {expert.linkedin && (
                <a
                  href={expert.linkedin.startsWith('http') ? expert.linkedin : `https://${expert.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '.85rem', color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontWeight: 600 }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  <Linkedin size={16} /> LinkedIn
                </a>
              )}
            </div>
          )}

          {expert.bio && (
            <div className="card" style={{ marginTop: 20, width: '100%', padding: '24px 32px' }}>
              <p style={{ fontSize: '.94rem', color: 'var(--sl)', lineHeight: 1.6 }}>{expert.bio}</p>
            </div>
          )}
        </div>

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
                  alignItems: 'center',
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
                  <div style={{ fontSize: '.9rem', color: 'var(--sl)', marginTop: 10, lineHeight: 1.55, maxWidth: 480 }}>
                    {s.desc}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, minWidth: 120 }}>
                  <div style={{ fontFamily: 'var(--fu)', fontSize: '1.35rem', fontWeight: 800, color: 'var(--gd)', fontVariantNumeric: 'tabular-nums' }}>
                    {s.price}
                  </div>
                  <button className="btn btn-gr btn-sm" onClick={() => nav('booking', { session: s })}>
                    Book Now
                  </button>
                  <a href="#" className="affiliate-link" style={{ display: 'block', fontSize: '0.68rem' }} onClick={(e) => { e.preventDefault(); nav('signup', { role: 'affiliate' }); }}>
                    Do you want to become an Affiliate?
                  </a>
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
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, color: 'var(--gd)', fontSize: '1.2rem' }}>
                    {sub.title}
                  </div>
                  {sub.desc && (
                    <p style={{ fontSize: '.9rem', color: 'var(--sl)', marginTop: 6, lineHeight: 1.55, maxWidth: 420 }}>
                      {sub.desc}
                    </p>
                  )}
                  {sub.features?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 18 }}>
                      {sub.features.map((f) => (
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 14, minWidth: 140 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--fu)', fontSize: '1.9rem', fontWeight: 800, color: 'var(--gd)', fontVariantNumeric: 'tabular-nums' }}>
                      {sub.price ? (String(sub.price).includes('$') ? String(sub.price).split('/')[0] : `$${sub.price}`) : '$—'}
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
                  <a href="#" className="affiliate-link" style={{ display: 'block', fontSize: '0.72rem' }} onClick={(e) => { e.preventDefault(); nav('signup', { role: 'affiliate' }); }}>
                    Do you want to become an Affiliate?
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
                    background: PRODUCT_GRADIENTS[i % PRODUCT_GRADIENTS.length],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={30} color="#fff" opacity={0.9} />
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
                    <div style={{ fontSize: '.86rem', color: 'var(--sl)', marginTop: 6, lineHeight: 1.5 }}>{p.desc}</div>
                  </div>
                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--fu)', fontSize: '1.15rem', fontWeight: 800, color: 'var(--gd)', fontVariantNumeric: 'tabular-nums' }}>
                      {p.price}
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

        {/* Books */}
        {books.length > 0 && (
        <div style={{ marginTop: 56 }}>
          <SectionHeader
            icon={<BookOpen size={18} color="var(--teal)" />}
            eyebrow="Books"
            title="Published work"
          />
          <div className="grid-3">
            {books.map((b, i) => (
              <div key={b.title} className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div
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
                    <div style={{ fontFamily: 'var(--fu)', fontSize: '1rem', fontWeight: 700, color: 'var(--gd)', lineHeight: 1.3 }}>
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
                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }}>
                    <span style={{ fontFamily: 'var(--fu)', fontSize: '1.1rem', fontWeight: 800, color: 'var(--gd)', fontVariantNumeric: 'tabular-nums' }}>
                      {b.price}
                    </span>
                    <button className="btn btn-pr btn-sm" onClick={() => handleBuyBook(b)}>
                      {b.cta || 'Buy Now'}
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
              title="Additional ways to work together"
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {customOfferings.map((c) => (
                <div key={c.title} className="card" style={{ padding: '28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ fontFamily: 'var(--fu)', fontWeight: 600, color: 'var(--gd)', fontSize: '1.05rem', marginBottom: 4 }}>{c.title}</div>
                    {c.type && (
                      <span style={{ display: 'inline-block', background: BADGE_BG, color: 'var(--teal)', fontSize: '.72rem', fontWeight: 700, padding: '2px 10px', borderRadius: 99, marginBottom: 6 }}>
                        {c.type}
                      </span>
                    )}
                    {c.desc && <div style={{ fontSize: '.9rem', color: 'var(--sl)' }}>{c.desc}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, minWidth: 120 }}>
                    {c.price && (
                      <div style={{ fontFamily: 'var(--fu)', fontSize: '1.35rem', fontWeight: 800, color: 'var(--gd)', fontVariantNumeric: 'tabular-nums' }}>{c.price}</div>
                    )}
                    <button className="btn btn-gr btn-sm" onClick={() => handleCustomCta(c)}>
                      {c.ctaType === 'book' ? 'Book Now' : c.ctaType === 'custom' ? (c.ctaLabel || 'Learn More') : 'Contact Me'} →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {sessions.length === 0 && subscriptions.length === 0 && products.length === 0 && books.length === 0 && customOfferings.length === 0 && (
          <div style={{ marginTop: 56, textAlign: 'center', padding: '48px 24px', color: 'var(--mu)' }}>
            <div style={{ fontSize: '.95rem' }}>{firstName} hasn't published any offerings yet. Check back soon!</div>
          </div>
        )}

        {/* Profile Footer CTA */}
        <div
          style={{
            marginTop: 64,
            marginBottom: 64,
            borderRadius: 'var(--rlg)',
            padding: '56px 32px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            background: 'var(--gd)',
            backgroundImage:
              'radial-gradient(circle at 30% 20%, rgba(84,119,146,0.45) 0%, rgba(15,23,42,0) 55%), radial-gradient(circle at 80% 90%, rgba(25,181,166,0.28) 0%, rgba(15,23,42,0) 50%)',
          }}
        >
          <h3
            style={{
              fontFamily: 'var(--fd)',
              fontSize: '2.1rem',
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '-0.01em',
              position: 'relative',
            }}
          >
            Start Monetizing Your Knowledge
          </h3>
          <p
            style={{
              fontSize: '.97rem',
              color: 'rgba(255,255,255,.65)',
              marginTop: 14,
              maxWidth: 480,
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: 1.6,
              position: 'relative',
            }}
          >
            Join {firstName} and thousands of experts earning recurring income on mindGigs.
          </p>
          <button
            style={{
              marginTop: 26,
              padding: '14px 32px',
              borderRadius: 999,
              border: 'none',
              background: '#fff',
              color: 'var(--gd)',
              fontSize: '.95rem',
              fontFamily: 'var(--fu)',
              fontWeight: 700,
              cursor: 'pointer',
              position: 'relative',
              transition: 'background .2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#e9ebee')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
            onClick={() => nav('signup')}
          >
            Create Your Profile — Free →
          </button>
        </div>
      </div>
    </div>
  );
}
