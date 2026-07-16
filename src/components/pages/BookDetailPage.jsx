import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Share2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { initiateProductPayment, confirmFreeProduct } from '../../services/stripeService';
import { formatOfferPrice } from '../../utils/price';
import { renderFormattedText } from '../../utils/richText';
import { slugify } from '../../utils/slug';
import { getBookPurchaseFlags } from '../../utils/book';
import { OrderSummaryModal } from './PublicProfile';

function CoverPanel({ url, label }) {
  return (
    <div style={{ flex: '1 1 220px', maxWidth: 260 }}>
      <div
        style={{
          width: '100%',
          aspectRatio: '2/3',
          borderRadius: 12,
          overflow: 'hidden',
          background: url ? '#eef1f4' : 'linear-gradient(135deg, var(--gd), var(--gb))',
          boxShadow: '0 8px 24px rgba(15,23,42,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {url ? (
          <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <BookOpen size={40} color="#fff" opacity={0.85} />
        )}
      </div>
      <div style={{ textAlign: 'center', fontSize: '.72rem', color: 'var(--mu)', marginTop: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
    </div>
  );
}

export function BookDetailPage({ nav, notify, expert, book }) {
  const { currentUser } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [pendingBuy, setPendingBuy] = useState(false);

  if (!book) return null;

  const parsePriceCents = (priceStr) => {
    const num = parseFloat(String(priceStr ?? '').replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : Math.round(num * 100);
  };

  const goToSignup = () => nav('signup', { role: 'client', expertId: expert?.id || expert?.uid });

  const handleBuyBookAmazon = () => {
    if (!book.link) return;
    window.open(book.link, '_blank', 'noopener,noreferrer');
  };

  const handleBuyBookNow = async () => {
    if (!currentUser) {
      goToSignup();
      return;
    }
    const priceStr = String(book.price ?? '').trim();
    if (!priceStr) { notify('Invalid product price.', 'error'); return; }
    const amount = parsePriceCents(book.price);
    if (amount === 0) {
      setCheckoutLoading(true);
      try {
        await confirmFreeProduct(
          expert?.id || expert?.uid || '',
          book.title,
          currentUser.email,
          book.deliveryLink || book.fileUrl || null,
          currentUser.uid
        );
        notify('You now have access — check your email for the details.', 'success');
      } catch (err) {
        notify(err.message || 'Failed to complete your free purchase. Please try again.', 'error');
      } finally {
        setCheckoutLoading(false);
      }
      return;
    }
    // Non-free — pause on the Order Summary modal rather than charging immediately.
    setPendingBuy(true);
  };

  const confirmBuyBook = async () => {
    const amount = parsePriceCents(book.price);
    setCheckoutLoading(true);
    try {
      await initiateProductPayment(
        expert?.id || expert?.uid || '',
        book.title,
        amount,
        currentUser.email,
        book.deliveryLink || book.fileUrl || null,
        currentUser.uid
      );
      // On success, initiateProductPayment redirects the browser away — nothing left to do here.
    } catch (err) {
      notify(err.message || 'Failed to start checkout. Please try again.', 'error');
      setCheckoutLoading(false);
    }
  };

  const handleShare = () => {
    if (!expert?.handle) { notify('This profile has no public link yet.', 'warn'); return; }
    const url = `https://mindgigs.com/${expert.handle}/${slugify(book.title)}`;
    navigator.clipboard.writeText(url);
    notify('Book link copied!');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gmt)', padding: '80px 24px 64px' }}>
      <OrderSummaryModal
        pendingPurchase={pendingBuy ? { type: 'product', item: book } : null}
        expert={expert}
        appliedCouponCode={null}
        onConfirm={confirmBuyBook}
        onClose={() => setPendingBuy(false)}
        loading={checkoutLoading}
      />
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
          <div
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'var(--fu)', fontWeight: 700, color: 'var(--gd)' }}
            onClick={() => nav('public-profile')}
          >
            <ArrowLeft size={18} /> Back to {expert?.name ? `${expert.name}'s Profile` : 'Profile'}
          </div>
          <button className="btn btn-gh btn-sm" onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Share2 size={14} /> Share
          </button>
        </div>

        <div className="card" style={{ padding: 40 }}>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
            <CoverPanel url={book.coverUrl} label="Front Cover" />
            {book.backCoverUrl && <CoverPanel url={book.backCoverUrl} label="Back Cover" />}
          </div>

          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--fu)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--gd)' }}>{book.title}</div>
            {book.author && <div style={{ fontSize: '.9rem', color: 'var(--mu)', marginTop: 4 }}>by {book.author}</div>}
            {book.format && (
              <span
                style={{
                  display: 'inline-block',
                  background: 'rgba(15,23,42,0.05)',
                  color: 'var(--sl)',
                  fontSize: '.72rem',
                  fontWeight: 600,
                  padding: '4px 11px',
                  borderRadius: 999,
                  marginTop: 10,
                }}
              >
                {book.format}
              </span>
            )}
          </div>

          {(book.overview || book.tagline) && (
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 24, marginBottom: 28 }}>
              <div style={{ fontFamily: 'var(--fu)', fontSize: '.78rem', fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Overview
              </div>
              {book.overview
                ? renderFormattedText(book.overview, { fontSize: '.94rem', color: 'var(--sl)', lineHeight: 1.7 })
                : <p style={{ fontSize: '.94rem', color: 'var(--sl)', lineHeight: 1.7 }}>{book.tagline}</p>}
            </div>
          )}

          <div
            style={{
              borderTop: '1px solid rgba(0,0,0,0.06)',
              paddingTop: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontFamily: 'var(--fu)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--gd)', fontVariantNumeric: 'tabular-nums' }}>
              {formatOfferPrice(book.price)}
            </span>
            {(() => {
              const { buyNow, amazon } = getBookPurchaseFlags(book);
              return (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {buyNow && (
                    <button className="btn btn-pr btn-lg" disabled={checkoutLoading} onClick={handleBuyBookNow}>
                      {checkoutLoading ? '...' : 'Buy Now'}
                    </button>
                  )}
                  {amazon && (
                    <button className="btn btn-gh btn-lg" onClick={handleBuyBookAmazon}>
                      Buy on Amazon
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
