import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { claimHandle, normalizeHandle } from '../../services/handleService';
import {
  Calendar,
  RefreshCw,
  Box,
  Paperclip,
  Camera,
  Sparkles,
  Award,
} from 'lucide-react';

const BIO_MAX_WORDS = 1000;

function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

const CATEGORY_KEYWORDS = {
  Tech: ['developer','software','engineering','coding','programmer','javascript','python','react','node','backend','frontend','fullstack','devops','cloud','aws','azure','gcp','mobile','app','web','data science','machine learning','ai','artificial intelligence','cybersecurity','blockchain','database','api','tech','it','infrastructure','saas','platform','algorithm','automation','robotics','iot'],
  Health: ['health','wellness','fitness','nutrition','medical','doctor','therapist','therapy','yoga','meditation','dietitian','healthcare','physiotherapy','exercise','mental health','wellbeing','nurse','pharmacist','clinical','weight loss','mindfulness','holistic','rehabilitation','sports medicine','public health'],
  Finance: ['finance','investment','accounting','tax','wealth','trading','stocks','crypto','banking','financial','money','budgeting','retirement','cfo','bookkeeping','auditing','insurance','portfolio','equity','hedge','venture capital','private equity','fintech','economics','forex','real estate investing'],
  Law: ['law','legal','lawyer','attorney','contract','compliance','intellectual property','ip','litigation','corporate law','paralegal','barrister','solicitor','dispute','arbitration','regulatory','legislation','patent','trademark','copyright','immigration','criminal'],
  Coaching: ['coach','coaching','life coach','executive coach','leadership','mindset','productivity','personal development','motivation','performance','career coach','mentor','mentoring','goal setting','accountability','transformation','self improvement','nlp','growth'],
  Creative: ['design','ux','ui','graphic','photography','video','content','writing','art','creative','brand','illustration','animation','copywriting','filmmaker','cinematography','music','fashion','interior design','advertising','storytelling','podcast','media','pr','social media','influencer','blogger','author'],
  Business: ['business','strategy','startup','product','sales','marketing','entrepreneur','management','operations','consulting','fundraising','pitch','b2b','b2c','ecommerce','growth','go to market','revenue','kpi','okr','ceo','coo','cmo','vp','director','leadership','market research','competitive analysis','business development','partnership'],
};

function detectCategory(tagsStr = '', bioStr = '') {
  const text = `${tagsStr} ${bioStr}`.toLowerCase();
  const scores = Object.entries(CATEGORY_KEYWORDS).map(([cat, keywords]) => ({
    cat,
    score: keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0),
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0].score > 0 ? scores[0].cat : 'Business';
}

export function OnboardingPage({ nav, notify, addExpert }) {
  const [step, setStep] = useState(0);
  const [offerTab, setOfferTab] = useState(0);

  // Step 1 — Profile
  const [bio, setBio] = useState('');
  const [headline, setHeadline] = useState('');
  const [handleEdit, setHandleEdit] = useState('');
  const [tags, setTags] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [twitter, setTwitter] = useState('');
  const [youtube, setYoutube] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  // 1:1 Session
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionPrice, setSessionPrice] = useState('');
  const [sessionDesc, setSessionDesc] = useState('');
  const [sessionDuration, setSessionDuration] = useState('60 min');

  // Subscription
  const [subTitle, setSubTitle] = useState('');
  const [subPrice, setSubPrice] = useState('');
  const [subDesc, setSubDesc] = useState('');

  // Digital Product
  const [productTitle, setProductTitle] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productDesc, setProductDesc] = useState('');

  // Custom Offering
  const [customTitle, setCustomTitle] = useState('');
  const [customType, setCustomType] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customDesc, setCustomDesc] = useState('');

  // Highlights & Achievements
  const [highlightTitle, setHighlightTitle] = useState('');
  const [highlightLink, setHighlightLink] = useState('');

  const { currentUser, userData, refreshUserData } = useAuth();
  const fileInputRef = useRef(null);
  const productFileInputRef = useRef(null);
  const highlightImageInputRef = useRef(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [productFile, setProductFile] = useState(null);
  const [highlightImageFile, setHighlightImageFile] = useState(null);
  const [highlightImagePreview, setHighlightImagePreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill handle from existing user data (important for Google signups)
  useEffect(() => {
    if (userData?.handle && !handleEdit) setHandleEdit(userData.handle);
  }, [userData?.handle]);

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleProductFileChange = (e) => {
    if (e.target.files?.[0]) setProductFile(e.target.files[0]);
  };

  const handleHighlightImageChange = (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setHighlightImageFile(file);
      setHighlightImagePreview(URL.createObjectURL(file));
    }
  };

  const steps = ['Profile Setup', 'Add First Offer'];

  const offerTabs = [
    { label: '1:1 Session', icon: Calendar },
    { label: 'Subscription', icon: RefreshCw },
    { label: 'Digital Product', icon: Box },
    { label: 'Custom Offer', icon: Sparkles },
    { label: 'Highlights', icon: Award },
  ];

  return (
    <div
      style={{ minHeight: '100vh', background: 'var(--gmt)', padding: '80px 24px 40px' }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          if (e.target.tagName.toLowerCase() === 'textarea') return;
          e.preventDefault();
          if (step < steps.length - 1) {
            setStep((s) => s + 1);
          } else {
            const btn = document.getElementById('onboarding-submit-btn');
            if (btn && !isSubmitting) btn.click();
          }
        }
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 40% at 50% 0%,rgba(25, 181, 166, 0.1) 0%,transparent 65%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <span style={{ fontFamily: 'var(--fb)', fontWeight: 700, fontSize: '1.3rem', color: '#0F172A', letterSpacing: '-0.04em' }}>
            mind<span style={{ color: 'var(--teal)' }}>G</span>igs
          </span>
          <p style={{ fontSize: '.82rem', color: 'var(--mu)', marginTop: 4 }}>
            Expert Onboarding · Step {step + 1} of {steps.length}
          </p>
        </div>

        <div className="progress-bar" style={{ marginBottom: 8 }}>
          <div className="progress-fill" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
          {steps.map((s, i) => (
            <span key={s} style={{ fontSize: '.72rem', fontFamily: 'var(--fu)', fontWeight: 600, color: i <= step ? 'var(--gb)' : 'var(--mu)' }}>
              {s}
            </span>
          ))}
        </div>

        <div className="card" style={{ padding: 40 }}>
          {/* ── STEP 1: Profile Setup ── */}
          {step === 0 && (
            <>
              <div className="slabel">Step 01</div>
              <h2 className="stitle" style={{ fontSize: '1.6rem' }}>Set Up Your Profile</h2>

              {/* Avatar */}
              <div
                style={{ width: 80, height: 80, borderRadius: '50%', background: avatarPreview ? `url(${avatarPreview}) top center/cover` : 'rgba(25, 181, 166, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', border: '3px dashed rgba(25, 181, 166, 0.2)', cursor: 'pointer', overflow: 'hidden', color: 'var(--teal)', fontWeight: 700, fontSize: '1.5rem' }}
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarPreview ? null : (userData?.name?.charAt(0).toUpperCase() || <Camera size={28} />)}
              </div>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
              <p style={{ textAlign: 'center', fontSize: '.78rem', color: 'var(--mu)', marginBottom: 24 }}>
                {avatarPreview ? 'Photo selected. Click to change.' : 'Click to upload profile photo'}
              </p>

              <div className="field">
                <label className="label">Bio (max {BIO_MAX_WORDS} words)</label>
                <textarea
                  className="textarea"
                  placeholder="Tell experts and visitors who you are and what you offer..."
                  style={{ minHeight: 120 }}
                  value={bio}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (countWords(value) <= BIO_MAX_WORDS) setBio(value);
                  }}
                />
                <span style={{ fontSize: '.72rem', color: countWords(bio) >= BIO_MAX_WORDS ? '#e0554f' : 'var(--mu)', float: 'right' }}>{countWords(bio)}/{BIO_MAX_WORDS} words</span>
              </div>

              <div className="field">
                <label className="label">Professional Headline</label>
                <input
                  className="input"
                  placeholder="e.g. CMO · SaaS Advisor · Author"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                />
                <span style={{ fontSize: '.72rem', color: 'var(--mu)' }}>Shown below your name on your profile card</span>
              </div>

              <div className="field">
                <label className="label">Your Public Handle</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '.85rem', color: 'var(--mu)' }}>
                    mindgigs.com/
                  </span>
                  <input
                    className="input"
                    style={{ paddingLeft: 120 }}
                    placeholder="yourname"
                    value={handleEdit}
                    onChange={(e) => setHandleEdit(normalizeHandle(e.target.value))}
                  />
                </div>
                <span style={{ fontSize: '.72rem', color: 'var(--mu)' }}>Only lowercase letters, numbers, hyphens</span>
              </div>

              <div className="field">
                <label className="label">Expertise Tags</label>
                <input
                  className="input"
                  placeholder="e.g. Product Strategy, SaaS, Fundraising"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="label">LinkedIn (optional)</label>
                <input className="input" placeholder="https://linkedin.com/in/yourname" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
              </div>
              <div className="field">
                <label className="label">X (optional)</label>
                <input className="input" placeholder="https://x.com/yourhandle" value={twitter} onChange={(e) => setTwitter(e.target.value)} />
              </div>
              <div className="field">
                <label className="label">YouTube (optional)</label>
                <input className="input" placeholder="https://youtube.com/@yourchannel" value={youtube} onChange={(e) => setYoutube(e.target.value)} />
              </div>
              <div className="field">
                <label className="label">WhatsApp (optional)</label>
                <input className="input" placeholder="e.g. 15551234567 (with country code, no + or spaces)" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
              </div>
            </>
          )}

          {/* ── STEP 2: Offers ── */}
          {step === 1 && (
            <>
              <div className="slabel">Step 02</div>
              <h2 className="stitle" style={{ fontSize: '1.6rem' }}>Add Your First Offer</h2>
              <p style={{ fontSize: '.82rem', color: 'var(--mu)', marginBottom: 20 }}>
                You can fill in multiple offer types — all non-empty ones will be saved.
              </p>

              <div className="offer-tabs" style={{ flexWrap: 'wrap' }}>
                {offerTabs.map((t, i) => (
                  <button
                    key={t.label}
                    className={`offer-tab ${offerTab === i ? 'active' : ''}`}
                    onClick={() => setOfferTab(i)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', fontSize: '.8rem' }}
                  >
                    <t.icon size={14} />
                    {t.label}
                  </button>
                ))}
              </div>

              {/* 1:1 Session */}
              {offerTab === 0 && (
                <>
                  <div className="field">
                    <label className="label">Session Title</label>
                    <input className="input" placeholder="e.g. 60-min Strategy Deep Dive" value={sessionTitle} onChange={e => setSessionTitle(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="label">Duration</label>
                    <select className="select w-full" value={sessionDuration} onChange={e => setSessionDuration(e.target.value)}>
                      <option value="15 min">15 minutes</option>
                      <option value="30 min">30 minutes</option>
                      <option value="60 min">60 minutes</option>
                      <option value="90 min">90 minutes</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Price (USD)</label>
                    <input className="input" type="number" min="0" placeholder="e.g. 150" value={sessionPrice} onChange={e => setSessionPrice(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="label">Description</label>
                    <textarea className="textarea" placeholder="What will you cover in this session?" value={sessionDesc} onChange={e => setSessionDesc(e.target.value)} />
                  </div>
                </>
              )}

              {/* Subscription */}
              {offerTab === 1 && (
                <>
                  <div className="field">
                    <label className="label">Subscription Name</label>
                    <input className="input" placeholder="e.g. Monthly Mentorship Club" value={subTitle} onChange={e => setSubTitle(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="label">Monthly Price (USD)</label>
                    <input className="input" type="number" min="0" placeholder="e.g. 99" value={subPrice} onChange={e => setSubPrice(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="label">What's Included</label>
                    <textarea className="textarea" placeholder="Weekly Q&A, WhatsApp group access, monthly 1:1..." value={subDesc} onChange={e => setSubDesc(e.target.value)} />
                  </div>
                </>
              )}

              {/* Digital Product */}
              {offerTab === 2 && (
                <>
                  <div className="field">
                    <label className="label">Product Title</label>
                    <input className="input" placeholder="e.g. The Ultimate SaaS Pitch Deck Template" value={productTitle} onChange={e => setProductTitle(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="label">Price (USD)</label>
                    <input className="input" type="number" min="0" placeholder="e.g. 49" value={productPrice} onChange={e => setProductPrice(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="label">Description</label>
                    <textarea className="textarea" placeholder="What's inside and who is it for?" value={productDesc} onChange={e => setProductDesc(e.target.value)} />
                  </div>
                  <label style={{ display: 'block', border: '2px dashed rgba(25, 181, 166, .2)', borderRadius: 'var(--rsm)', padding: 24, textAlign: 'center', cursor: 'pointer', background: 'var(--gmt)', marginBottom: 16, color: 'var(--teal)' }}>
                    <div style={{ marginBottom: 8 }}><Paperclip size={24} style={{ margin: '0 auto' }} /></div>
                    <div style={{ fontSize: '.82rem', color: 'var(--mu)' }}>{productFile ? productFile.name : 'Upload file (PDF, ZIP, DOC) — optional'}</div>
                    <input type="file" style={{ display: 'none' }} accept=".pdf,.zip,.doc,.docx" onChange={handleProductFileChange} ref={productFileInputRef} />
                  </label>
                </>
              )}

              {/* Custom Offering */}
              {offerTab === 3 && (
                <>
                  <div style={{ background: 'rgba(25,181,166,0.05)', border: '1px solid rgba(25,181,166,0.15)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '.82rem', color: 'var(--sl)' }}>
                    Use this for anything that doesn't fit the standard types — workshops, courses, consulting packages, newsletters, group programs, etc.
                  </div>
                  <div className="field">
                    <label className="label">Offer Title</label>
                    <input className="input" placeholder="e.g. 8-Week Startup Bootcamp" value={customTitle} onChange={e => setCustomTitle(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="label">Offer Type / Format</label>
                    <input className="input" placeholder="e.g. Online Course, Workshop, Group Program, Newsletter" value={customType} onChange={e => setCustomType(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="label">Price (USD)</label>
                    <input className="input" type="number" min="0" placeholder="e.g. 499 — leave blank if free or contact-based" value={customPrice} onChange={e => setCustomPrice(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="label">Description</label>
                    <textarea className="textarea" placeholder="What's included, how it works, who it's for..." value={customDesc} onChange={e => setCustomDesc(e.target.value)} style={{ minHeight: 100 }} />
                  </div>
                </>
              )}

              {/* Highlights & Achievements */}
              {offerTab === 4 && (
                <>
                  <div style={{ background: 'rgba(25,181,166,0.05)', border: '1px solid rgba(25,181,166,0.15)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '.82rem', color: 'var(--sl)' }}>
                    Showcase an award, press mention, or achievement on your profile.
                  </div>
                  <div className="field">
                    <label className="label">Title</label>
                    <input className="input" placeholder="e.g. Featured in Forbes 30 Under 30" value={highlightTitle} onChange={e => setHighlightTitle(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="label">Link (optional)</label>
                    <input className="input" placeholder="https://..." value={highlightLink} onChange={e => setHighlightLink(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="label">Image (optional)</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 16, border: '2px dashed rgba(25, 181, 166, .2)', borderRadius: 'var(--rsm)', padding: 16, cursor: 'pointer', background: 'var(--gmt)' }}>
                      <div
                        style={{ width: 56, height: 56, borderRadius: 10, background: highlightImagePreview ? `url(${highlightImagePreview}) center/cover` : 'rgba(25, 181, 166, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}
                      >
                        {!highlightImagePreview && <Award size={22} color="var(--teal)" />}
                      </div>
                      <div style={{ fontSize: '.82rem', color: 'var(--mu)' }}>{highlightImageFile ? highlightImageFile.name : 'Upload image (PNG, JPG) — optional'}</div>
                      <input type="file" style={{ display: 'none' }} accept="image/png,image/jpeg" onChange={handleHighlightImageChange} ref={highlightImageInputRef} />
                    </label>
                  </div>
                </>
              )}
            </>
          )}


          {/* Navigation */}
          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            {step > 0 && (
              <button className="btn btn-gh flex-1" onClick={() => setStep((s) => s - 1)}>
                ← Back
              </button>
            )}
            <button
              id="onboarding-submit-btn"
              className="btn btn-gr flex-1 btn-lg"
              disabled={isSubmitting}
              onClick={async () => {
                if (step < steps.length - 1) {
                  setStep((s) => s + 1);
                } else {
                  if (!currentUser) return notify('User not authenticated', 'error');
                  setIsSubmitting(true);
                  try {
                    let photoUrl = userData?.image || null;

                    if (avatarFile) {
                      const storageRef = ref(storage, `avatars/${currentUser.uid}`);
                      await uploadBytes(storageRef, avatarFile);
                      photoUrl = await getDownloadURL(storageRef);
                    } else if (avatarPreview) {
                      photoUrl = avatarPreview;
                    }

                    const newSession = sessionTitle
                      ? { title: sessionTitle, price: sessionPrice ? `$${sessionPrice}` : null, priceNum: Number(sessionPrice) || 0, desc: sessionDesc, duration: sessionDuration }
                      : null;
                    const newSub = subTitle
                      ? { title: subTitle, price: subPrice ? `$${subPrice}` : null, priceNum: Number(subPrice) || 0, desc: subDesc }
                      : null;
                    const newCustom = customTitle
                      ? { title: customTitle, type: customType || 'Custom', price: customPrice ? `$${customPrice}` : null, priceNum: Number(customPrice) || 0, desc: customDesc }
                      : null;

                    let newProduct = productTitle
                      ? { title: productTitle, price: productPrice ? `$${productPrice}` : null, priceNum: Number(productPrice) || 0, desc: productDesc }
                      : null;

                    if (newProduct && productFile) {
                      const productStorageRef = ref(storage, `products/${currentUser.uid}/${productFile.name}`);
                      await uploadBytes(productStorageRef, productFile);
                      newProduct.fileUrl = await getDownloadURL(productStorageRef);
                      newProduct.fileName = productFile.name;
                    }

                    let newHighlight = highlightTitle
                      ? { title: highlightTitle, link: highlightLink || null, imageUrl: null, active: true }
                      : null;

                    if (newHighlight && highlightImageFile) {
                      const highlightStorageRef = ref(storage, `highlights/${currentUser.uid}/${Date.now()}-${highlightImageFile.name}`);
                      await uploadBytes(highlightStorageRef, highlightImageFile);
                      newHighlight.imageUrl = await getDownloadURL(highlightStorageRef);
                    }

                    // Lowest non-zero price across all offers
                    const prices = [sessionPrice, subPrice, productPrice, customPrice]
                      .map(Number)
                      .filter(v => v > 0);
                    const startingPrice = prices.length > 0 ? Math.min(...prices) : 0;

                    const requestedHandle = handleEdit || userData?.handle || '';
                    if (!requestedHandle) {
                      notify('Please choose a public username before publishing your profile.', 'warn');
                      setIsSubmitting(false);
                      return;
                    }
                    // This is the moment the expert's profile (and vanity/coupon URL) go public.
                    const claimedHandle = await claimHandle({
                      uid: currentUser.uid,
                      role: 'expert',
                      oldHandle: userData?.handle || null,
                      newHandle: requestedHandle,
                    });

                    const expertUpdates = {
                      image: photoUrl,
                      name: userData?.name || currentUser.displayName || 'Expert',
                      headline: headline || '',
                      category: detectCategory(tags, bio),
                      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                      bio: bio || '',
                      linkedin: linkedin || null,
                      twitter: twitter || null,
                      youtube: youtube || null,
                      whatsapp: whatsapp.replace(/\D/g, '') || null,
                      rating: userData?.rating ?? 0,
                      sessions: userData?.sessions ?? 0,
                      startingPrice,
                      verified: userData?.verified ?? false,
                      sessionsList: newSession ? [newSession] : [],
                      subscriptionsList: newSub ? [newSub] : [],
                      productsList: newProduct ? [newProduct] : [],
                      customOfferingsList: newCustom ? [newCustom] : [],
                      highlightsList: newHighlight ? [newHighlight] : [],
                      onboardingComplete: true,
                    };

                    await updateDoc(doc(db, 'users', currentUser.uid), expertUpdates);

                    const newExpertProfile = { ...userData, ...expertUpdates, handle: claimedHandle, id: currentUser.uid };
                    if (addExpert) addExpert(newExpertProfile);
                    if (refreshUserData) await refreshUserData();

                    notify('Profile live! Your page is ready.');
                    nav('expert-dashboard');
                  } catch (err) {
                    console.error('Error saving profile:', err);
                    notify('Failed to save profile: ' + (err.message || 'Unknown error'), 'error');
                  } finally {
                    setIsSubmitting(false);
                  }
                }
              }}
            >
              {isSubmitting ? 'Launching...' : step < steps.length - 1 ? 'Continue →' : 'Launch My Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
