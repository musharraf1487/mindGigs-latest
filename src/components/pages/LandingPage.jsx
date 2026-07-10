import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowRight,
  CheckCircle2,
  Star,
  Zap,
  Users,
  Download,
  PhoneCall,
  MessageSquare,
  TrendingUp,
  Shield,
  Clock,
  Plus,
  Calendar,
  User,
  DollarSign,
  Briefcase,
  Cpu,
  Scale,
  Code2,
  Target,
  BarChart3,
  Palette,
  PenTool,
  Dumbbell,
  Activity,
  GraduationCap,
  LineChart,
  Mail,
  Phone,
  Banknote,
  Flame,
} from 'lucide-react';


/* ── Animated Particles Canvas Background ── */
function ParticlesCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animId;
    let width, height;

    const ROYAL_BLUE = '#1D4ED8';
    const GOLD = '#F59E0B';
    const PARTICLE_COUNT = 80;

    const particles = [];

    function resize() {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    }

    function createParticles() {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const isGold = Math.random() < 0.1;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vy: Math.random() * -0.6 - 0.2, // Drifting upwards
          vx: (Math.random() - 0.5) * 0.3,
          r: isGold ? Math.random() * 2 + 1.5 : Math.random() * 1.5 + 0.5,
          gold: isGold,
          alpha: Math.random() * 0.5 + 0.2,
          pulse: Math.random() * Math.PI * 2,
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.03;

        // Wrap around
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < 0 || p.x > width) p.vx *= -1;

        const pulseAlpha = p.alpha + Math.sin(p.pulse) * 0.2;
        const boundedAlpha = Math.max(0.1, Math.min(pulseAlpha, 0.8));

        ctx.beginPath();
        const glow = p.r * 3;
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);

        if (p.gold) {
          grd.addColorStop(0, `rgba(245, 158, 11, ${boundedAlpha})`);
          grd.addColorStop(1, 'rgba(245, 158, 11, 0)');
          ctx.fillStyle = grd;
          ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
          ctx.fill();
        } else {
          grd.addColorStop(0, `rgba(15, 23, 42, ${boundedAlpha * 0.6})`);
          grd.addColorStop(1, 'rgba(15, 23, 42, 0)');
          ctx.fillStyle = grd;
          ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.gold ? `rgba(245, 158, 11, ${boundedAlpha + 0.2})` : `rgba(84, 119, 146, ${boundedAlpha})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    const ro = new ResizeObserver(() => {
      resize();
    });
    ro.observe(canvas);

    resize();
    createParticles();
    draw();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-network-canvas" aria-hidden="true" />;
}


const MONETIZATION_TYPES = [
  {
    icon: PhoneCall,
    title: '1:1 Paid Calls',
    desc: 'Book 15, 30, or 60-minute sessions with calendar integration and automatic payment collection.',
  },
  {
    icon: MessageSquare,
    title: 'Recurring Communities',
    desc: 'Charge monthly access to your private WhatsApp group. Auto-renew via Stripe, cancel anytime.',
  },
  {
    icon: Download,
    title: 'Digital Downloads',
    desc: 'Sell PDFs, templates, courses, and files securely via AWS S3 with expiring download links.',
  },
  {
    icon: Users,
    title: 'Advisory Sessions',
    desc: 'Offer premium-priced custom advisory packages with tailored deliverables and follow-ups.',
  },
];

const STEPS = [
  {
    num: '01',
    icon: User,
    title: 'Create Your Profile',
    desc: 'Build your public page at mindgigs.com/yourname. Add bio, expertise tags, and social links. Takes 2 minutes.',
  },
  {
    num: '02',
    icon: DollarSign,
    title: 'Set Your Pricing',
    desc: 'Add 1:1 sessions with calendar sync, monthly subscriptions, or digital downloads. You control pricing always.',
  },
  {
    num: '03',
    icon: TrendingUp,
    title: 'Monetize Your Knowledge',
    desc: "Share your link. Stripe handles payments globally. Anyone who signs up through your profile link earns you a lifetime commission on their purchases.",
  },
];

const WHO_FOR = [
  [Briefcase, 'Consultants'],
  [Cpu, 'AI Builders'],
  [Scale, 'Lawyers'],
  [Code2, 'Developers'],
  [Target, 'Coaches'],
  [BarChart3, 'Analysts'],
  [Palette, 'Designers'],
  [PenTool, 'Writers'],
  [Dumbbell, 'Trainers'],
  [Activity, 'Doctors'],
  [GraduationCap, 'Educators'],
  [LineChart, 'Traders'],
];

const PROBLEMS = [
  {
    icon: Mail,
    title: 'Endless DMs',
    desc: 'Strangers extracting hours of your knowledge through free messages with no compensation.',
  },
  {
    icon: Phone,
    title: 'Free Strategy Calls',
    desc: '"Quick calls" that turn into unpaid consulting. Your expertise deserves a price tag.',
  },
  {
    icon: Banknote,
    title: 'No Monetization',
    desc: 'You have a massive following but no system to convert attention into recurring income.',
  },
  {
    icon: Flame,
    title: 'Burnout',
    desc: 'Giving endlessly without building passive income systems leads to exhaustion and resentment.',
  },
];

function FloatingSideElements() {
  return (
    <>
      <div className="side-popup side-popup-left-1">
        <div className="side-popup-icon"><Clock size={20} /></div>
        <div>
          <div className="side-popup-text">Schedule</div>
          <div className="side-popup-sub">31 Days</div>
        </div>
      </div>
      <div className="side-popup side-popup-left-2">
        <div className="side-popup-icon"><TrendingUp size={20} /></div>
        <div>
          <div className="side-popup-text">Analytics</div>
          <div className="side-popup-sub">Real-time</div>
        </div>
      </div>
      <div className="side-popup side-popup-right-2">
        <div className="side-popup-icon"><CheckCircle2 size={20} /></div>
        <div>
          <div className="side-popup-text">Success</div>
          <div className="side-popup-sub">Guaranteed</div>
        </div>
      </div>
    </>
  );
}

const ROLE_DASHBOARD_ROUTE = {
  expert: 'expert-dashboard',
  client: 'client-dashboard',
  affiliate: 'affiliate-dashboard',
  admin: 'admin-dashboard',
};

export function LandingPage({ nav, onLogin }) {
  const { currentUser, userData } = useAuth();
  const isLoggedIn = !!currentUser && !!userData?.role;
  const dashboardRoute = ROLE_DASHBOARD_ROUTE[userData?.role];
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [navHidden, setNavHidden] = React.useState(false);

  React.useEffect(() => {
    let lastScroll = window.scrollY;
    const onScroll = () => {
      const cur = window.scrollY;
      if (cur > lastScroll && cur > 80) {
        setNavHidden(true);
      } else {
        setNavHidden(false);
      }
      lastScroll = cur;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="lp-root">
      {/* ── NAV ── */}
      <nav className={`lp-nav${navHidden ? ' lp-nav-hidden' : ''}`}>
        <div className="lp-nav-inner">
          <button className="lp-brand" onClick={() => setMenuOpen(false)}>
            mind<span style={{ color: 'var(--teal)' }}>G</span>igs
          </button>

          <div className="lp-nav-links">
            <a href="#monetization" className="lp-nav-link">Features</a>
            <a href="#final-cta" className="lp-nav-link">Pricing</a>
            <a href="#affiliates" className="lp-nav-link">Affiliates</a>
            <a
              className="lp-nav-link"
              style={{ cursor: 'pointer' }}
              onClick={(e) => { e.preventDefault(); nav('experts'); }}
            >
              Experts
            </a>
          </div>

          <div className="lp-nav-actions">
            {isLoggedIn ? (
              <button className="lp-btn-cta" onClick={() => nav(dashboardRoute)}>
                Profile <ArrowRight style={{ width: 16, height: 16 }} />
              </button>
            ) : (
              <>
                <button className="lp-btn-login" onClick={onLogin}>Log In</button>

                <button className="lp-btn-cta" onClick={() => nav('signup')}>
                  Start Earning <ArrowRight style={{ width: 16, height: 16 }} />
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="hero-3d-grid-wrap">
          <div className="hero-3d-floor" />
          <div className="hero-3d-wall" />
          <div className="hero-3d-fade" />
        </div>
        <FloatingSideElements />

        <div className="lp-hero-content">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: 'easeOut' }}
          >
            {/* Badge */}


            {/* Headline */}
            <h1 className="lp-hero-title">
              <span style={{ color: 'var(--teal)' }}>Monetize</span>{' '}
              <span style={{ color: '#0f172a' }}>Your Expertise. On Your Terms.</span>
            </h1>

            {/* Subtext */}
            <p className="lp-hero-sub">
              Turn your audience into a recurring business. Sell 1:1 sessions, digital products, and community access.
            </p>

            {/* CTA Buttons */}
            <div className="lp-hero-actions">
              <button className="lp-btn-hero-primary" onClick={() => nav('signup')}>
                Start Earning
              </button>
            </div>
          </motion.div>
        </div>
      </section >

      {/* ── PROBLEM SECTION ── */}
      < section className="lp-section lp-section-dark" >
        <div className="lp-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lp-section-header"
          >
            <div className="lp-label lp-label-lt">The Problem</div>
            <h2 className="lp-section-title lp-section-title-lt">Stop Giving Advice For Free</h2>
            <p className="lp-section-sub lp-section-sub-lt">Every day, experts like you are leaking value with no return.</p>
          </motion.div>
          <div className="lp-problem-grid">
            {PROBLEMS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="lp-problem-card"
              >
                <div className="lp-icon-box">
                  <p.icon size={26} strokeWidth={1.5} />
                </div>
                <h3 className="lp-problem-title">{p.title}</h3>
                <p className="lp-problem-desc">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section >

      {/* ── HOW IT WORKS ── */}
      <section id="features" className="lp-section lp-section-white">
        <div className="lp-blob lp-blob-tl" />
        <div className="lp-blob lp-blob-br" />
        <div className="lp-container lp-rel">
          <motion.div
            initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
            whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lp-section-header"
          >
            <div className="lp-label">How It Works</div>
            <h2 className="lp-section-title">Three Steps to Recurring Revenue</h2>
            <p className="lp-section-sub">From signup to earning in under 5 minutes.</p>
          </motion.div>
          <div className="lp-steps-grid">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                whileHover={{ y: -20, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="lp-step-card"
              >
                <div className="lp-step-num">{s.num}</div>
                <div className="lp-icon-box">
                  <s.icon size={28} strokeWidth={1.5} />
                </div>
                <h3 className="lp-step-title">{s.title}</h3>
                <p className="lp-step-desc">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section >

      {/* ── MONETIZATION ── */}
      <section id="monetization" className="lp-section lp-section-white">
        <div className="lp-blob lp-blob-tr" />
        <div className="lp-container lp-rel">
          <motion.div
            initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
            whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lp-section-header"
          >
            <div className="lp-label">Monetization Types</div>
            <h2 className="lp-section-title">Four Ways to Earn</h2>
            <p className="lp-section-sub">Multiple revenue streams from a single profile.</p>
          </motion.div>
          <div className="lp-mono-grid">
            {MONETIZATION_TYPES.map((m, i) => (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -12, scale: 1.02 }}
                className="lp-mono-card"
              >
                <div className="lp-mono-icon-wrap">
                  <m.icon className="lp-mono-icon" />
                </div>
                <h3 className="lp-mono-title">{m.title}</h3>
                <p className="lp-mono-desc">{m.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section >

      {/* ── AFFILIATE ENGINE (CTA) ── */}
      <section id="affiliates" className="lp-section lp-section-white">
        <div className="lp-container">
          <div className="lp-aff-card">
            {/* Left */}
            <div className="lp-aff-left">
              <div className="lp-label lp-label-lt">Affiliate Engine</div>
              <h2 className="lp-aff-title">
                Earn Even When<br />Others Earn
              </h2>
              <p className="lp-aff-sub">
                Get your own coupon code and earn a lifetime commission on every sale it brings in. No caps, no expiry.
              </p>
              <ul className="lp-aff-list">
                {[
                  '10% lifetime commission on every sale your coupon brings in',
                  'Works across every expert on mindGigs — not tied to just one',
                  'Your own coupon code, entered at signup or checkout',
                  'Affiliate wallet with payout requests',
                ].map((b) => (
                  <li key={b} className="lp-aff-item">
                    <CheckCircle2 className="lp-aff-check" />
                    {b}
                  </li>
                ))}
              </ul>
              <button className="lp-btn-primary" onClick={() => nav('signup', { role: 'affiliate' })}>
                Start Earning <ArrowRight style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {/* Right: Commission diagram */}
            <div className="lp-aff-right">
              <div className="lp-aff-blob-1" />
              <div className="lp-aff-blob-2" />
              <div className="lp-aff-diagram">
                <div className="lp-aff-diagram-label">How commissions flow</div>
                <div className="lp-aff-flow">
                  <div className="lp-aff-node">
                    <div className="lp-aff-node-info">
                      <div className="lp-icon-box lp-aff-avatar-primary">
                        <User size={20} strokeWidth={1.5} />
                      </div>
                      <div>
                        <div className="lp-aff-node-name">You</div>
                        <div className="lp-aff-node-sub">Dedicated Affiliate</div>
                      </div>
                    </div>
                  </div>
                  <div className="lp-aff-arrow">↓</div>
                  <div className="lp-aff-node">
                    <div className="lp-aff-node-info">
                      <div className="lp-icon-box">
                        <User size={20} strokeWidth={1.5} />
                      </div>
                      <div>
                        <div className="lp-aff-node-name">Sarah buys a $500 session</div>
                        <div className="lp-aff-node-sub">Uses your coupon at checkout</div>
                      </div>
                    </div>
                    <div className="lp-aff-comm-right">
                      <div className="lp-aff-comm">$50</div>
                      <div className="lp-aff-node-sub">10% to you</div>
                    </div>
                  </div>
                  <div className="lp-aff-arrow">↓</div>
                  <div className="lp-aff-node lp-aff-node-t2">
                    <div className="lp-aff-node-info">
                      <div className="lp-icon-box lp-aff-avatar-t2">
                        <User size={18} strokeWidth={1.5} />
                      </div>
                      <div>
                        <div className="lp-aff-node-name" style={{ fontSize: '0.82rem' }}>Sarah buys again next month</div>
                        <div className="lp-aff-node-sub">Same coupon, still linked to you</div>
                      </div>
                    </div>
                    <div className="lp-aff-comm-right">
                      <div className="lp-aff-comm" style={{ fontSize: '1rem' }}>$50</div>
                      <div className="lp-aff-node-sub">10% to you, forever</div>
                    </div>
                  </div>
                  <div className="lp-aff-total">
                    <span className="lp-aff-total-label">Your monthly passive</span>
                    <span className="lp-aff-total-val">$100<span className="lp-aff-total-period">/mo</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section >

      {/* ── WHO IT'S FOR ── */}
      < section className="lp-section lp-section-dark" >
        <div className="lp-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lp-section-header"
          >
            <div className="lp-label lp-label-lt">Who It's For</div>
            <h2 className="lp-section-title lp-section-title-lt">Built For Every Expert</h2>
          </motion.div>
          <div className="lp-who-grid">
            {WHO_FOR.map(([Icon, label], i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -6, scale: 1.05 }}
                className="lp-who-card"
              >
                <div className="lp-icon-box"><Icon size={20} strokeWidth={1.5} /></div>
                <div className="lp-who-label">{label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section >

      {/* ── FINAL CTA ── */}
      <section id="final-cta" className="lp-section lp-section-white lp-final-cta">
        <div className="lp-container lp-rel" style={{ textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="lp-label" style={{ justifyContent: 'center' }}>Start Today</div>
            <h2 className="lp-cta-title">
              Don't Just Share Knowledge.<br />
              <span className="lp-hero-accent">Sell It.</span>
            </h2>
            <p className="lp-cta-sub">
              Become like our knowledge experts who are monetizing their skills.
              Free to start easy to scale.
            </p>
            <div className="lp-cta-actions">
              {isLoggedIn ? (
                <button className="lp-btn-primary" onClick={() => nav(dashboardRoute)}>
                  Go to Profile <ArrowRight style={{ width: 20, height: 20 }} />
                </button>
              ) : (
                <>
                  <button className="lp-btn-primary" onClick={() => nav('signup')}>
                    Create Profile <ArrowRight style={{ width: 20, height: 20 }} />
                  </button>
                  <button className="lp-btn-login" onClick={onLogin}>Log In</button>
                </>
              )}
            </div>
            <p className="lp-cta-trust">
              <span> No credit card</span>
              <span>·</span>
              <span> Live in 5 min</span>
              <span>·</span>
              <span> Cancel anytime</span>
            </p>
          </motion.div>
        </div>
      </section >

      {/* ── FOOTER ── */}
      < footer className="lb-footer" >
        <div className="lb-footer-overlay" />
        <div className="lb-container lb-rel">
          <div className="lb-footer-grid">
            <div className="lb-footer-brand">
              <div className="lb-footer-logo">mind<span style={{ color: 'var(--teal)' }}>G</span>igs</div>
              <p className="lb-footer-tagline">
                The monetization infrastructure for knowledge experts who are serious about recurring income.
              </p>
            </div>
            {[
              ['Platform', ['Expert Profiles', 'Session Booking', 'Subscriptions', 'Digital Products', 'Affiliate Engine']],
              ['Company', ['About', 'Blog', 'Careers', 'Press', 'Partners']],
              ['Support', ['Help Center', 'API Docs', 'Community', 'Status', 'Contact']],
            ].map(([h, links]) => (
              <div key={h}>
                <h4 className="lb-footer-heading">{h}</h4>
                <ul className="lb-footer-links">
                  {links.map((l) => (
                    <li key={l}><a href="#">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="lb-footer-bottom">
            <div className="lb-footer-copy">© 2026 mindGigs. Humans as a Service. All rights reserved.</div>
            <div className="lb-footer-socials">
              <div className="lb-social-dot" />
              <div className="lb-social-dot" />
              <div className="lb-social-dot" />
            </div>
          </div>
        </div>
      </footer >
    </div >
  );
}
