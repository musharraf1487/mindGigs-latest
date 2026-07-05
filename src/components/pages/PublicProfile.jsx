import React, { useState } from 'react';
import {
  Calendar,
  RefreshCw,
  Package,
  Share2,
  Phone,
  MessageSquare,
  Download,
  BookOpen,
  Presentation,
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

export function PublicProfile({ nav, notify, expert }) {
  const { currentUser } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [couponCode, setCouponCode] = useState(() => getStoredReferralCode() || '');

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
        (couponCode || '').trim() || null
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
        (couponCode || '').trim() || null
      );
    } catch (err) {
      notify(err.message || 'Failed to start checkout. Please try again.', 'error');
      setCheckoutLoading(null);
    }
  };

  if (!expert) return null;
  return (
    <div style={{ background: 'var(--cr)', minHeight: '100vh' }}>
      {/* Nav */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid rgba(84,119,146,0.1)',
          padding: '0 48px',
          height: 64,
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
        <div style={{ display: 'flex', gap: 10 }}>
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

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '40px 24px' }}>
        {/* Profile Header */}
        <div className="card" style={{ overflow: 'hidden', marginBottom: 24 }}>
          <div
            style={{
              height: 140,
              background: 'linear-gradient(135deg, var(--gd), var(--gb))',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                bottom: -32,
                left: 32,
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'var(--teal)',
                border: '4px solid #fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                fontWeight: 700,
                color: '#fff',
                boxShadow: '0 4px 16px rgba(0,0,0,.12)',
                overflow: 'hidden',
              }}
            >
              {expert.image ? (
                <img
                  src={expert.image}
                  alt={expert.name}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                expert.name?.charAt(0).toUpperCase() || 'E'
              )}
            </div>
          </div>
          <div style={{ padding: '44px 32px 28px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'var(--fu)',
                    fontWeight: 800,
                    fontSize: '1.4rem',
                    color: 'var(--gd)',
                  }}
                >
                  {expert.name}
                </div>
                {expert.headline && (
                  <div style={{ fontSize: '.88rem', color: 'var(--sl)', fontWeight: 500, marginBottom: 4 }}>
                    {expert.headline}
                  </div>
                )}
                <div
                  style={{
                    fontSize: '.82rem',
                    color: 'var(--gb)',
                    fontWeight: 500,
                    marginBottom: 10,
                  }}
                >
                  mindgigs.com/{expert.handle}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {expert.tags?.map((t) => (
                    <span key={t} className="tag tag-gr">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              {(expert.twitter || expert.linkedin) && (
                <div style={{ display: 'flex', gap: 16 }}>
                  {expert.twitter && (
                    <a
                      href={expert.twitter.startsWith('http') ? expert.twitter : `https://${expert.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '.85rem', color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontWeight: 600 }}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
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
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                      <Linkedin size={16} /> LinkedIn
                    </a>
                  )}
                </div>
              )}
            </div>
            <p
              style={{
                fontSize: '.92rem',
                color: 'var(--sl)',
                lineHeight: 1.75,
                marginTop: 16,
                maxWidth: 580,
              }}
            >
              {expert.bio}
            </p>
          </div>
        </div>

        {/* Coupon code — applies to any purchase made below */}
        <div className="card" style={{ padding: '18px 24px', marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 8 }}>
            Coupon Code (optional)
          </label>
          <input
            className="input"
            style={{ maxWidth: 320 }}
            placeholder="Have a coupon code?"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
          />
        </div>

        {/* 1:1 Sessions */}
          <div style={{ marginBottom: 32 }}>
            <h3
              style={{
                fontFamily: 'var(--fu)',
                fontWeight: 700,
                color: 'var(--gd)',
                marginBottom: 16,
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Calendar size={18} color="var(--teal)" /> 1:1 Sessions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(
                expert.sessionsList || [
                  {
                    title: '60-min Strategy Deep Dive',
                    duration: '60 min',
                    price: '$250',
                    desc: 'Deep dive into your product strategy, roadmap, or fundraising pitch with actionable takeaways.',
                  },
                  {
                    title: '15-min Quick Call',
                    duration: '15 min',
                    price: '$40',
                    desc: 'Fast, focused answer to your most pressing question.',
                  },
                ]
              ).map((s) => (
                <div
                  key={s.title}
                  className="card"
                  style={{
                    padding: 20,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontFamily: 'var(--fu)',
                        fontWeight: 700,
                        color: 'var(--gd)',
                        marginBottom: 4,
                      }}
                    >
                      {s.title}
                    </div>
                    <div style={{ fontSize: '.78rem', color: 'var(--mu)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> {s.duration}
                    </div>
                    <div style={{ fontSize: '.83rem', color: 'var(--sl)' }}>{s.desc}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div
                      style={{
                        fontFamily: 'var(--fu)',
                        fontSize: '1.3rem',
                        fontWeight: 800,
                        color: 'var(--gd)',
                        marginBottom: 10,
                      }}
                    >
                      {s.price}
                    </div>
                    <button className="btn btn-gr btn-sm" onClick={() => nav('booking', { session: s })}>
                      Book Now
                    </button>
                    <a href="#" className="affiliate-link" style={{ display: 'block', fontSize: '0.68rem', marginTop: 8 }} onClick={(e) => { e.preventDefault(); nav('signup'); }}>
                      Do you want to become an Affiliate?
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

        {/* Subscriptions */}
          <div style={{ marginBottom: 32 }}>
            <h3
              style={{
                fontFamily: 'var(--fu)',
                fontWeight: 700,
                color: 'var(--gd)',
                marginBottom: 16,
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <RefreshCw size={18} color="var(--teal)" /> Subscriptions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(expert.subscriptionsList || expert.subscriptions || [
                {
                  id: 'sub-adv',
                  title: 'Strategic Advisory Access',
                  price: '199',
                  desc: 'For serious professionals who want personalized guidance.',
                  features: [
                    "Small-group advisory calls",
                    "Personalized growth roadmap",
                    "Direct expert feedback",
                    "Quarterly performance review"
                  ]
                }
              ]).map((sub) => (
                <div key={sub.id || sub.title} className="card" style={{ padding: 24, background: 'var(--gmt)', border: '1.5px solid rgba(255,155,81,.15)' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 16,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: 'var(--fu)',
                          fontWeight: 700,
                          color: 'var(--gd)',
                          fontSize: '1.05rem',
                          marginBottom: 12,
                        }}
                      >
                        {sub.title}
                      </div>
                      {sub.desc && (
                        <p style={{ fontSize: '.83rem', color: 'var(--sl)', marginBottom: sub.features?.length ? 12 : 0 }}>
                          {sub.desc}
                        </p>
                      )}
                      {sub.features?.length > 0 && (
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {sub.features.map((b) => (
                            <li key={b} style={{ fontSize: '.83rem', color: 'var(--sl)', display: 'flex', gap: 8, alignItems: 'center' }}>
                              <Check size={14} color="var(--teal)" /> {b}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--fu)', fontSize: '2rem', fontWeight: 800, color: 'var(--gd)' }}>
                        {sub.price ? (String(sub.price).includes('$') ? String(sub.price).split('/')[0] : `$${sub.price}`) : '$—'}
                      </div>
                      <div style={{ fontSize: '.78rem', color: 'var(--mu)', marginBottom: 12 }}>/month</div>
                      <button
                        className="btn btn-gr"
                        disabled={checkoutLoading === `sub-${sub.title}`}
                        onClick={() => handleSubscribe(sub)}
                      >
                        {checkoutLoading === `sub-${sub.title}` ? 'Redirecting...' : 'Subscribe →'}
                      </button>
                      <a href="#" className="affiliate-link" style={{ display: 'block', fontSize: '0.72rem', marginTop: 12 }} onClick={(e) => { e.preventDefault(); nav('signup'); }}>
                        Do you want to become an Affiliate?
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        {/* Digital Products */}
          <div style={{ marginBottom: 40 }}>
            <h3
              style={{
                fontFamily: 'var(--fu)',
                fontWeight: 700,
                color: 'var(--gd)',
                marginBottom: 16,
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Package size={18} color="var(--teal)" /> Digital Products
            </h3>
            <div className="grid-3">
              {(
                expert.productsList || [
                  { title: 'Pitch Deck Template', price: '$79', desc: 'Proven template used by 142 founders.' },
                  { title: 'SaaS Metrics Dashboard', price: '$49', desc: 'Track all key SaaS metrics in one place.' },
                  { title: 'Fundraising Playbook', price: '$129', desc: 'Step-by-step guide for raising a seed round.' },
                ]
              ).map((p) => (
                <div key={p.title} className="card" style={{ padding: 20 }}>
                  <div
                    style={{
                      height: 60,
                      background: 'rgba(25, 181, 166, 0.05)',
                      borderRadius: 'var(--rsm)',
                      marginBottom: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--teal)',
                    }}
                  >
                    <FileText size={24} />
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--fu)',
                      fontWeight: 700,
                      color: 'var(--gd)',
                      fontSize: '.88rem',
                      marginBottom: 6,
                    }}
                  >
                    {p.title}
                  </div>
                  <div style={{ fontSize: '.78rem', color: 'var(--sl)', marginBottom: 14 }}>{p.desc}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--fu)', fontWeight: 800, color: 'var(--gd)' }}>
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
              ))}
            </div>
          </div>
          
        {/* Custom Offerings */}
        {expert.customOfferingsList?.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h3 style={{ fontFamily: 'var(--fu)', fontWeight: 700, color: 'var(--gd)', marginBottom: 16, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="var(--teal)" /> Custom Offerings
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {expert.customOfferingsList.map((c) => (
                <div key={c.title} className="card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, color: 'var(--gd)', marginBottom: 4 }}>{c.title}</div>
                    {c.type && (
                      <span style={{ display: 'inline-block', background: 'rgba(25,181,166,0.08)', color: 'var(--teal)', fontSize: '.72rem', fontWeight: 700, padding: '2px 10px', borderRadius: 99, marginBottom: 6 }}>
                        {c.type}
                      </span>
                    )}
                    {c.desc && <div style={{ fontSize: '.83rem', color: 'var(--sl)' }}>{c.desc}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {c.price && (
                      <div style={{ fontFamily: 'var(--fu)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--gd)', marginBottom: 10 }}>{c.price}</div>
                    )}
                    <button className="btn btn-gr btn-sm" onClick={() => notify('Contact the expert to inquire.')}>
                      Inquire →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile Footer CTA */}
        <div style={{ background: 'var(--gd)', borderRadius: 'var(--rlg)', padding: 40, textAlign: 'center' }}>
          <h3
            style={{
              fontFamily: 'var(--fd)',
              fontSize: '1.8rem',
              color: '#fff',
              marginBottom: 12,
            }}
          >
            Start Monetizing Your Knowledge
          </h3>
          <p style={{ fontSize: '.9rem', color: 'rgba(255,255,255,.65)', marginBottom: 24 }}>
            Join Priya and thousands of experts earning recurring income on mindGigs.
          </p>
          <button className="btn btn-gr btn-lg" onClick={() => nav('signup')}>
            Create Your Profile — Free →
          </button>
        </div>
      </div>
    </div>
  );
}
