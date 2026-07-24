/**
 * LandingBoard - Marketing landing page for mindGigs
 * "Join as an Expert" navigates to LandingPage (home)
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    Check,
    PhoneCall,
    Users,
    MessageSquare,
    Download,
    CheckCircle2,
    ArrowRight,
    Star,
    Zap,
    Clock,
    ShieldCheck,
    TrendingUp,
    Sparkles,
    Calendar,
    Plus,
    Briefcase,
    Megaphone,
    BookOpen,
    GraduationCap,
    PenTool,
    Presentation,
    Video,
    Menu,
    X
} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation, Autoplay, FreeMode, Scrollbar } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import 'swiper/css/free-mode';
import 'swiper/css/scrollbar';

/* ── Animated Network Canvas Background ── */
function NetworkCanvas() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        let animId;
        let width, height;
        const NODE_COUNT = 55;
        const CONNECTION_DIST = 170;
        const nodes = [];

        function resize() {
            width = canvas.width = canvas.offsetWidth;
            height = canvas.height = canvas.offsetHeight;
        }

        function createNodes() {
            nodes.length = 0;
            for (let i = 0; i < NODE_COUNT; i++) {
                const isGold = Math.random() < 0.07;
                nodes.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.28,
                    vy: (Math.random() - 0.5) * 0.28,
                    r: isGold ? 3.2 : Math.random() * 1.8 + 1.2,
                    gold: isGold,
                    pulse: Math.random() * Math.PI * 2,
                });
            }
        }

        function draw() {
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i];
                for (let j = i + 1; j < nodes.length; j++) {
                    const b = nodes[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < CONNECTION_DIST) {
                        const alpha = (1 - dist / CONNECTION_DIST) * 0.45;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.strokeStyle = `rgba(15, 23, 42, ${alpha * 0.5})`;
                        ctx.lineWidth = 0.7;
                        ctx.stroke();
                    }
                }
            }

            for (const node of nodes) {
                node.x += node.vx;
                node.y += node.vy;
                node.pulse += 0.025;
                if (node.x < 0 || node.x > width) node.vx *= -1;
                if (node.y < 0 || node.y > height) node.vy *= -1;

                const pulseR = node.r + Math.sin(node.pulse) * 0.5;

                if (node.gold) {
                    const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, pulseR * 4);
                    grd.addColorStop(0, 'rgba(245, 158, 11, 0.55)');
                    grd.addColorStop(1, 'rgba(245, 158, 11, 0)');
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, pulseR * 4, 0, Math.PI * 2);
                    ctx.fillStyle = grd;
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, pulseR, 0, Math.PI * 2);
                    ctx.fillStyle = '#F59E0B';
                    ctx.fill();
                } else {
                    const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, pulseR * 3.5);
                    grd.addColorStop(0, 'rgba(15, 23, 42, 0.35)');
                    grd.addColorStop(1, 'rgba(15, 23, 42, 0)');
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, pulseR * 3.5, 0, Math.PI * 2);
                    ctx.fillStyle = grd;
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, pulseR, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(84, 119, 146, 0.55)';
                    ctx.globalAlpha = 0.85;
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }
            }
            animId = requestAnimationFrame(draw);
        }

        const ro = new ResizeObserver(resize);
        ro.observe(canvas);
        resize();
        createNodes();
        draw();

        return () => {
            cancelAnimationFrame(animId);
            ro.disconnect();
        };
    }, []);

    return <canvas ref={canvasRef} className="lb-hero-canvas" aria-hidden="true" />;
}

/* ── Hero Background Fan — the same 3D expert card fan used on the Experts page, ── */
/* rendered as a low-opacity backdrop behind the hero copy.                        */
function HeroFanBackground({ experts }) {
    const cards = experts.slice(0, 7);
    if (cards.length === 0) return null;
    const center = Math.floor(cards.length / 2);

    return (
        <div className="lb-hero-fan" aria-hidden="true">
            <div className="lb-hero-fan-stage">
                {cards.map((exp, i) => {
                    const offset = i - center;
                    const rotateY = offset * -15;
                    const translateX = offset * 210;
                    const translateZ = -Math.abs(offset) * 40;
                    const scale = 1 - Math.abs(offset) * 0.05;
                    const zIndex = 50 - Math.abs(offset) * 10;

                    return (
                        <div
                            key={exp.id}
                            className="lb-hero-fan-card"
                            style={{
                                transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                                zIndex,
                            }}
                        >
                            {exp.image ? (
                                <img
                                    src={exp.image}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                                />
                            ) : (
                                <div
                                    style={{
                                        width: '100%', height: '100%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: `hsl(${((exp.name?.charCodeAt(0) || 65) * 67 + 160) % 360}, 40%, 55%)`,
                                        color: 'rgba(255,255,255,0.9)', fontSize: '4rem', fontWeight: 900,
                                        fontFamily: 'var(--fu)',
                                    }}
                                >
                                    {exp.name?.charAt(0).toUpperCase() || 'E'}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Temporarily hidden on the landing page — re-enable by flipping this back to true.
const SHOW_SUBSCRIPTIONS = false;

const SUBSCRIPTIONS = [
    {
        title: "AI Insiders Community",
        desc: "Monthly WhatsApp group with exclusive AI insights and networking",
        price: "49",
        features: [
            "Weekly AI insights and trends",
            "Private community access",
            "Monthly Q&A sessions",
            "Exclusive templates and resources"
        ],
        icon: MessageSquare,
        color: "lb-color-green",
    },
    {
        title: "AI Pro Network",
        desc: "Advanced networking and live workshops for AI practitioners",
        price: "99",
        features: [
            "Everything in Insiders",
            "Monthly Live Strategy Workshop",
            "Case Study Breakdowns",
            "Direct Expert Feedback",
            "Priority Q&A"
        ],
        icon: Zap,
        color: "lb-color-blue",
        popular: true,
    },
    {
        title: "Strategic Advisory Access",
        desc: "For serious professionals who want personalized guidance.",
        price: "199",
        features: [
            "Everything in Pro Practice",
            "Small-group advisory calls",
            "Personalized growth roadmap",
            "Direct expert feedback",
            "Quarterly performance review"
        ],
        icon: ShieldCheck,
        color: "lb-color-purple",
    }
];

const FAQ_GROUPS = [
    {
        category: "General",
        items: [
            { q: "What is mindGigs?", a: "mindGigs is an online platform where experts sell their knowledge directly to clients through one-on-one video sessions, monthly subscriptions, digital products, and books. Experts keep 70% of every sale." },
            { q: "Who can use mindGigs?", a: "Anyone. Experts join to sell their knowledge. Clients join to book sessions and buy products. Affiliates join to earn commissions by bringing experts to the platform." },
            { q: "Does it cost anything to create an account?", a: "No. Signing up is completely free for experts and clients alike. There are no monthly fees, no listing fees, and no hidden charges. mindGigs only earns when a sale happens." },
            { q: "Is my payment information safe?", a: "Yes. All payments are processed through Stripe, the same payment processor used by Amazon, Google, and thousands of major companies. Your card details never touch mindGigs' servers." },
            { q: "What countries are supported?", a: "mindGigs is available worldwide. Any expert or client with an internet connection and a supported payment method can use the platform." },
        ],
    },
    {
        category: "For Experts",
        items: [
            { q: "How much do I keep from each sale?", a: "You keep 70% of every sale — sessions, subscriptions, digital products, and books. If a buyer came through your own referral link, you earn an additional 7.5%, totaling 77.5%." },
            { q: "How do I set up my profile?", a: "Sign up as an expert, complete the two-step onboarding (profile setup and first offer), and your public profile goes live immediately with your own shareable URL." },
            { q: "What can I sell on mindGigs?", a: "One-on-one video sessions, monthly subscriptions, digital products (templates, guides, courses), books, and custom offerings like workshops or group programs." },
            { q: "Do clients get my personal contact details?", a: "No. All communication and sessions happen on the platform. Your email, phone number, and personal meeting links are never shared with clients." },
            { q: "How does my referral link work?", a: "Your profile URL (mindgigs.com/experts/yourhandle) doubles as your referral link. When someone signs up after visiting your profile, they are tagged to you permanently. You earn 7.5% on every purchase they ever make on mindGigs — even if they buy from other experts." },
            { q: "Can I use my handle as a coupon code?", a: "Yes. Clients can enter your handle at checkout as a coupon code. You earn 7.5% on that purchase. If it's your own product, you get 70% plus 7.5% — totaling 77.5%." },
            { q: "Can I sell my book on mindGigs?", a: "Yes. Each book gets its own dedicated page with a front cover, back cover, full description, and a buy button. The page has its own shareable link you can post anywhere." },
            { q: "When do I get paid?", a: "Your earnings update the moment a payment clears. You can request a payout from your dashboard once you reach the minimum threshold. Payouts are processed within two business days." },
            { q: "Can I also be an affiliate?", a: "You already are one. Every expert earns referral commissions through their profile link, and every client account includes referral capabilities with its own code. There is no separate affiliate account to create or log into." },
        ],
    },
    {
        category: "For Clients",
        items: [
            { q: "How do I book a session with an expert?", a: "Browse the experts directory, open a profile, pick a session, choose an available time slot on their calendar, and pay. You'll receive a confirmation email with your video session link and a calendar invite within a minute." },
            { q: "Do I need to install any software for the video call?", a: "No. The session opens directly in your browser on any device — desktop, tablet, or phone. Just click the link, allow your camera and microphone, and you're in." },
            { q: "What if I need to reschedule?", a: "Contact support or reach out to the expert through the platform. We understand that plans change." },
            { q: "Can I subscribe to an expert for ongoing access?", a: "Yes. Many experts offer monthly subscriptions that give you recurring access — weekly calls, group access, or ongoing mentorship. You can cancel anytime from your dashboard." },
            { q: "What is a referral code and should I use one?", a: "If an expert or a friend gave you a referral code, enter it at checkout. It costs you nothing extra — the price stays exactly the same. It simply supports the person who recommended the expert or platform to you." },
            { q: "Is there a refund policy?", a: "Refund policies may vary. If you have an issue with a booking or purchase, contact support and we will work to resolve it fairly." },
        ],
    },
    {
        category: "For Affiliates",
        items: [
            { q: "What is the mindGigs affiliate program?", a: "Every client account includes referral capabilities — you receive a unique coupon code the moment you sign up. You earn 7.5% commission by onboarding experts and by sharing your code with buyers. The expert onboarding commission is lifetime — you earn on every sale they ever make." },
            { q: "Do I need a separate affiliate account?", a: "No. Referrals are built into the client account, so there is nothing extra to create and no second login to switch between. Experts earn referral commissions too, through their profile link and username." },
            { q: "How do I earn lifetime commissions?", a: "When a new expert signs up using your coupon code, they are permanently linked to you. Every time that expert makes a sale to anyone, any product type, any amount, you earn 7.5%. This never expires." },
            { q: "How do one-time coupon commissions work?", a: "When a buyer enters your coupon code at checkout, you earn 7.5% of that specific purchase. This is a one-time commission per purchase, separate from the lifetime onboarding commission." },
            { q: "Can I earn both lifetime and one-time commissions on the same sale?", a: "Yes. If you onboarded the expert AND your coupon code is used at checkout on their product, you earn 7.5% for onboarding plus 7.5% for promotion — totaling 15% on that sale." },
            { q: "How much can I realistically earn?", a: "It depends on how many experts you onboard and how much they sell. One expert doing $3,000 per month in sales earns you $225 monthly — that is $2,700 per year from a single expert. Onboard ten active experts and you could earn over $27,000 per year." },
            { q: "How do I get my coupon code?", a: "Your code is generated automatically when you create your client account. It appears in your dashboard immediately, under Referrals and in Settings — a six-character code you can share anywhere." },
            { q: "How do I track my earnings?", a: "The Referrals and Affiliate Earnings tabs in your client dashboard show everything in real time: experts you have onboarded, coupon redemptions, lifetime earnings, one-time earnings, and pending payouts — all separated clearly, alongside your bookings and purchases." },
            { q: "When and how do I get paid?", a: "Request a payout from your dashboard once you reach the minimum threshold. Payouts are processed within two business days via bank transfer." },
            { q: "Is my data private?", a: "Yes. mindGigs uses secure authentication through Firebase and encrypted payment processing through Stripe. Your personal data is never sold or shared with third parties." },
            { q: "I found a bug or have a feature request. How do I reach support?", a: "Email support@mindgigs.com with a description of the issue. We respond within 24 hours." },
        ],
    },
];

function FaqItem({ q, a }) {
    const [open, setOpen] = React.useState(false);
    return (
        <div className={`lb-faq-item${open ? ' lb-faq-item-open' : ''}`}>
            <button
                type="button"
                className="lb-faq-question"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
            >
                <span>{q}</span>
                <Plus className="lb-faq-icon" style={{ width: 20, height: 20 }} />
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                    >
                        <p className="lb-faq-answer">{a}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function FaqGroup({ group, collapsible }) {
    const [open, setOpen] = React.useState(!collapsible);

    const grid = (
        <div className="lb-faq-grid">
            {group.items.map((item, i) => (
                <FaqItem key={i} q={item.q} a={item.a} />
            ))}
        </div>
    );

    if (!collapsible) {
        return (
            <div className="lb-faq-group">
                <h3 className="lb-faq-group-title">{group.category}</h3>
                {grid}
            </div>
        );
    }

    return (
        <div className={`lb-faq-group lb-faq-group-collapsible${open ? ' lb-faq-group-open' : ''}`}>
            <button
                type="button"
                className="lb-faq-group-toggle"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
            >
                <h3 className="lb-faq-group-title">{group.category}</h3>
                <span className="lb-faq-group-meta">
                    <span className="lb-faq-group-count">{group.items.length}</span>
                    <Plus className="lb-faq-group-icon" style={{ width: 22, height: 22 }} />
                </span>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.32, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="lb-faq-group-body">{grid}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// function FloatingSideElements() {
//     return (
//         <>
//             <div className="side-popup side-popup-left-1">
//                 <div className="side-popup-icon"><Clock size={20} /></div>
//                 <div>
//                     <div className="side-popup-text">Schedule</div>
//                     <div className="side-popup-sub">31 Days</div>
//                 </div>
//             </div>
//             {/* <div className="side-popup side-popup-left-2">
//                 <div className="side-popup-icon"><TrendingUp size={20} /></div>
//                 <div>
//                     <div className="side-popup-text">Analytics</div>
//                     <div className="side-popup-sub">Real-time</div>
//                 </div>
//             </div> */}
//             <div className="side-popup side-popup-right-2">
//                 <div className="side-popup-icon"><CheckCircle2 size={20} /></div>
//                 <div>
//                     <div className="side-popup-text">Success</div>
//                     <div className="side-popup-sub">Guaranteed</div>
//                 </div>
//             </div>
//         </>
//     );
// }

/* ── Offers by Role — interactive "what would you sell" section ── */
const OFFER_ROLES = {
    author: {
        label: 'For Authors', head: 'Ideas for authors',
        title: 'Your readers already trust you. Let them book you.',
        desc: 'Sell your book and the session that goes with it from one profile. The reader finishes chapter twelve and books chapter thirteen with you.',
        price: '$450', priceNote: 'Manuscript strategy session', badge: 'Live session',
        scene: 'linear-gradient(140deg,#2F4B6E,#152438 70%)',
        ideas: [
            { ic: '✍️', h: 'Manuscript review call', p: 'Sixty minutes on their draft, with notes they can act on that week.' },
            { ic: '📚', h: 'Book plus session bundle', p: 'Package the book with a follow-up call and price the pair together.' },
            { ic: '🎤', h: 'Author Q&A subscription', p: 'A recurring session for readers who want you monthly, not once.' },
            { ic: '🗂️', h: 'Publishing roadmap toolkit', p: 'Sell the templates and checklists you already use with clients.' },
        ],
    },
    coach: {
        label: 'For Coaches', head: 'Ideas for coaches',
        title: 'Stop chasing DMs. Let your calendar do the selling.',
        desc: 'Set your rate, publish your slots, and let clients book and pay before they ever land in your inbox.',
        price: '$299', priceNote: 'Discovery to breakthrough call', badge: 'Coaching room',
        scene: 'linear-gradient(140deg,#1F5E58,#10202E 70%)',
        ideas: [
            { ic: '🎯', h: 'Single breakthrough session', p: 'One focused call for the client stuck on one specific decision.' },
            { ic: '🔁', h: 'Monthly coaching plan', p: 'Recurring subscription with a set number of sessions each month.' },
            { ic: '📋', h: 'Accountability check-ins', p: 'Short, high-frequency calls priced for clients who need momentum.' },
            { ic: '🧰', h: 'Self-guided program', p: "Sell your framework as a digital product for clients who aren't ready to book." },
        ],
    },
    founder: {
        label: 'For Founders', head: 'Ideas for founders',
        title: 'You already made the mistakes. Charge for the shortcut.',
        desc: 'Someone is two years behind you and would pay real money to skip the part you got wrong. That conversation is a product.',
        price: '$650', priceNote: 'Founder strategy session', badge: 'Strategy call',
        scene: 'linear-gradient(140deg,#3A3C6E,#131E32 70%)',
        ideas: [
            { ic: '🚀', h: 'Zero-to-one teardown', p: 'Walk a first-time founder through the launch you already survived.' },
            { ic: '💰', h: 'Fundraising prep call', p: 'Pitch review and investor questions from someone who has raised.' },
            { ic: '🧭', h: 'Advisory retainer', p: 'A monthly subscription slot for a founder who needs you on call.' },
            { ic: '📈', h: 'Growth playbook', p: 'Package the exact process that moved your numbers, as a product.' },
        ],
    },
    consultant: {
        label: 'For Consultants', head: 'Ideas for consultants',
        title: 'Sell the insight without selling the retainer.',
        desc: 'Not every client can afford a three-month engagement. Give them the ninety-minute version and keep the pipeline warm.',
        price: '$499', priceNote: 'Diagnostic deep dive', badge: 'Client session',
        scene: 'linear-gradient(140deg,#264C5E,#101F2E 70%)',
        ideas: [
            { ic: '🔍', h: 'Paid diagnostic call', p: 'Charge for the audit that used to be your free discovery call.' },
            { ic: '📊', h: 'Second-opinion session', p: "Review a plan the client already has and tell them what's missing." },
            { ic: '📁', h: 'Framework licensing', p: 'Sell the model and the spreadsheet, not just your hours.' },
            { ic: '🤝', h: 'Fractional office hours', p: 'A subscription slot for clients who need you every fortnight.' },
        ],
    },
    creator: {
        label: 'For Creators', head: 'Ideas for creators',
        title: 'Your audience wants more than a reply to their comment.',
        desc: 'A fraction of your followers would pay to speak with you directly. mindGigs turns that fraction into revenue.',
        price: '$349', priceNote: '1:1 creator session', badge: 'On air',
        scene: 'linear-gradient(140deg,#5E3A56,#1A1F33 70%)',
        ideas: [
            { ic: '🎬', h: 'Portfolio and channel review', p: 'Look at their work live and tell them what you would change.' },
            { ic: '💡', h: 'Content strategy call', p: 'One hour on positioning, hooks, and what to make next.' },
            { ic: '🎓', h: 'Workshop or course', p: 'Teach the thing you get asked about most, once, and sell it forever.' },
            { ic: '👥', h: 'Community subscription', p: 'Recurring group sessions for your most invested followers.' },
        ],
    },
    academic: {
        label: 'For Academics', head: 'Ideas for academics',
        title: 'Your research has an audience outside the journal.',
        desc: 'Students, professionals, and founders all need what you know. Sessions are how you reach them without a lecture hall.',
        price: '$399', priceNote: 'Research consultation', badge: 'Consultation',
        scene: 'linear-gradient(140deg,#3E4E6E,#141D2E 70%)',
        ideas: [
            { ic: '🎓', h: 'Thesis and research guidance', p: 'Direct feedback for students who need more than a supervisor slot.' },
            { ic: '🔬', h: 'Expert opinion session', p: 'Companies pay well for a clear read on your field.' },
            { ic: '📖', h: 'Concept masterclass', p: 'Sell a recorded deep dive on the topic you teach best.' },
            { ic: '🗓️', h: 'Ongoing mentorship', p: 'A subscription for a student or team you support long term.' },
        ],
    },
};

const ROLE_TABS = [
    { key: 'author', label: '📖 Authors' },
    { key: 'coach', label: '🎯 Coaches' },
    { key: 'founder', label: '🚀 Founders' },
    { key: 'consultant', label: '📊 Consultants' },
    { key: 'creator', label: '🎬 Creators' },
    { key: 'academic', label: '🎓 Academics' },
];

function OffersByRole({ nav }) {
    const [active, setActive] = React.useState('author');
    const [seconds, setSeconds] = React.useState(2538);
    const r = OFFER_ROLES[active];

    React.useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const id = setInterval(() => setSeconds((s) => (s + 1) % 3600), 1000);
        return () => clearInterval(id);
    }, []);

    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');

    return (
        <section className="mg-section mg-offers" id="mg-offers">
            <div className="mg-wrap">
                <div className="mg-head mg-reveal">
                    <span className="mg-pill">Built around your expertise</span>
                    <h2>What would <em>you</em> sell on mindGigs?</h2>
                    <p>Pick what you do and see exactly how people like you turn experience into income.</p>
                </div>

                <div className="mg-roles" role="tablist">
                    {ROLE_TABS.map((t) => (
                        <button
                            key={t.key}
                            role="tab"
                            aria-selected={active === t.key}
                            className={`mg-role${active === t.key ? ' mg-on' : ''}`}
                            onClick={() => setActive(t.key)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="mg-stage-grid">
                    <div className="mg-stage" aria-hidden="true">
                        <div className="mg-stage-scene" style={{ background: r.scene }} />
                        <div className="mg-stage-glow" />
                        <div className="mg-scan" />
                        <div className="mg-stage-vig" />
                        <div className="mg-stage-badge"><i /><span>{r.badge}</span></div>
                        <div className="mg-stage-timer">{mm}:{ss}</div>
                        <div className="mg-stage-body">
                            <div className="mg-fade" key={active}>
                                <p className="mg-stage-role">{r.label}</p>
                                <h3>{r.title}</h3>
                                <p>{r.desc}</p>
                            </div>
                            <div className="mg-stage-foot">
                                <div className="mg-wave"><i /><i /><i /><i /><i /><i /><i /></div>
                                <div className="mg-stage-price">{r.price}<small>{r.priceNote}</small></div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <p className="mg-ideas-head">{r.head}</p>
                        <div className="mg-fade" key={active}>
                            {r.ideas.map((i, idx) => (
                                <div className="mg-idea" key={idx}>
                                    <div className="mg-ic">{i.ic}</div>
                                    <div>
                                        <h4>{i.h}</h4>
                                        <p>{i.p}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mg-ideas-cta">
                            <button className="mg-btn mg-btn-teal" onClick={() => nav('signup', { role: 'expert' })}>Start selling on mindGigs</button>
                            <span className="mg-note">Free to list. You set the price.</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

const ROLE_DASHBOARD_ROUTE = {
    expert: 'expert-dashboard',
    client: 'client-dashboard',
    // Legacy role — the affiliate portal was merged into the client dashboard.
    affiliate: 'client-dashboard',
    admin: 'admin-dashboard',
};

export function LandingBoard({ nav, onLogin, experts }) {
    const { currentUser, userData } = useAuth();
    const isLoggedIn = !!currentUser && !!userData?.role;
    const dashboardRoute = ROLE_DASHBOARD_ROUTE[userData?.role];
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [navHidden, setNavHidden] = React.useState(false);
    const [hoveredExpertId, setHoveredExpertId] = React.useState(null);

    // ── Featured Experts carousel — sourced from the same expert list used by ──
    // the Experts Directory page, so both stay in sync from a single fetch.
    const liveCarouselExperts = useMemo(() => {
        const normalized = (experts || []).map((e) => ({
            id: e.id,
            name: e.name || 'Expert',
            role: e.headline || e.bio?.substring(0, 60) || 'Expert',
            image: e.image || null,
            expertise: e.expertise || e.skills || e.tags || [],
            price: e.sessionPrice ? `$${e.sessionPrice}/session` : null,
            rating: typeof e.rating === 'number' ? e.rating : (e.averageRating || 0),
            reviews: e.reviewCount || e.reviews || 0,
            isVerified: e.isVerified,
        }));
        normalized.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        return normalized.slice(0, 7);
    }, [experts]);
    const carouselLive = liveCarouselExperts.length > 0;

    // Reorder the top experts into a pyramid so the highest-rated sits in the
    // centre of the hero background fan (mirrors the Experts page carousel).
    const heroFanExperts = useMemo(() => {
        const top = liveCarouselExperts;
        if (top.length === 0) return [];
        const result = new Array(top.length);
        const mid = Math.floor(top.length / 2);
        result[mid] = top[0];
        for (let i = 1; i < top.length; i++) {
            const offset = Math.ceil(i / 2);
            if (i % 2 === 1) result[mid - offset] = top[i];
            else result[mid + offset] = top[i];
        }
        return result.filter(Boolean);
    }, [liveCarouselExperts]);

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

    // Reveal-on-scroll for the new (mg-) landing sections.
    React.useEffect(() => {
        const els = document.querySelectorAll('.mg-reveal');
        if (!els.length) return;
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (e.isIntersecting) {
                    e.target.classList.add('mg-in');
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.12 });
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, []);

    const handleJoinAsExpert = () => {
        setIsMenuOpen(false);
        nav('signup', { role: 'expert' });
    };

    const handleBecomePartner = () => {
        setIsMenuOpen(false);
        nav('login');
    };

    return (
        <div className="lb-root">
            {/* Navbar */}
            <nav className={`lb-nav${navHidden ? ' lb-nav-hidden' : ''}`}>
                <div className="lb-nav-inner">
                    <button
                        onClick={() => setIsMenuOpen(false)}
                        className="lb-brand"
                        style={{ color: '#ffffffff', fontWeight: 800 }}
                    >
                        mind<span style={{ color: 'var(--teal)' }}>G</span>igs
                    </button>

                    <div className="lb-nav-links">
                        <a href="#lb-services" className="lb-nav-link">Who</a>
                        <a href="#lb-how" className="lb-nav-link">How</a>
                        <a href="#lb-affiliate" className="lb-nav-link">Affiliates</a>
                        <a href="#lb-experts" className="lb-nav-link">Experts</a>
                        <a href="#lb-faqs" className="lb-nav-link">FAQs</a>
                        {SHOW_SUBSCRIPTIONS && <a href="#lb-subscriptions" className="lb-nav-link">Pricing</a>}
                    </div>

                    <div className="lb-nav-actions">

                        {isLoggedIn ? (
                            <button
                                className="lb-btn-join lb-hidden-sm"
                                onClick={() => nav(dashboardRoute)}
                            >
                                Profile
                            </button>
                        ) : (
                            <>
                                <button
                                    className="lb-btn-join lb-hidden-sm"
                                    onClick={handleJoinAsExpert}
                                >
                                    Join as an Expert
                                </button>
                                <button
                                    onClick={onLogin}
                                    className="lb-btn-login"
                                >
                                    Login
                                </button>
                            </>
                        )}

                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="lb-menu-toggle"
                        >
                            {isMenuOpen ? <X style={{ width: 24, height: 24 }} /> : <Menu style={{ width: 24, height: 24 }} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown */}
                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="lb-mobile-menu"
                        >
                            <div className="lb-mobile-menu-inner">
                                <a href="#lb-services" onClick={() => setIsMenuOpen(false)} className="lb-mobile-link">Who</a>
                                <a href="#lb-how" onClick={() => setIsMenuOpen(false)} className="lb-mobile-link">How</a>
                                <a href="#lb-affiliate" onClick={() => setIsMenuOpen(false)} className="lb-mobile-link">Affiliates</a>
                                <a href="#lb-experts" onClick={() => setIsMenuOpen(false)} className="lb-mobile-link">Experts</a>
                                <a href="#lb-faqs" onClick={() => setIsMenuOpen(false)} className="lb-mobile-link">FAQs</a>
                                {SHOW_SUBSCRIPTIONS && <a href="#lb-subscriptions" onClick={() => setIsMenuOpen(false)} className="lb-mobile-link">Pricing</a>}
                                <hr className="lb-divider" />
                                {isLoggedIn ? (
                                    <button className="lb-btn-join-full" onClick={() => { setIsMenuOpen(false); nav(dashboardRoute); }}>
                                        Profile
                                    </button>
                                ) : (
                                    <button className="lb-btn-join-full" onClick={handleJoinAsExpert}>
                                        Join as an Expert
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* Hero Section */}
            <section className="lb-hero">
                <div className="hero-3d-grid-wrap">
                    <div className="hero-3d-floor" />
                    <div className="hero-3d-wall" />
                    <div className="hero-3d-fade" />
                </div>

                {/* Expert card fan (from the Experts page) as a soft backdrop */}
                <HeroFanBackground experts={heroFanExperts} />
                <div className="lb-hero-fan-scrim" aria-hidden="true" />

                <div className="lb-hero-content">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.85, ease: 'easeOut' }}
                    >
                        {/* Badge */}


                        <h1 className="lb-hero-title">
                            Stuck on something?{' '}
                            <br />
                            Book a {' '}
                            <span className="lb-hero-accent">brilliant mind.</span>
                        </h1>

                        <p className="lb-hero-sub">
                               Book a 1:1 video session with a verified expert who already solved the problem and get answers face to face.                        </p>

                        {/* CTA Buttons */}
                        <div className="lb-hero-cta">
                            <button className="lb-btn-hire" onClick={() => nav('experts')}>
                                Book an Expert
                            </button>
                            <button className="lb-btn-become" onClick={handleJoinAsExpert}>
                                Become an Expert
                            </button>
                        </div>

                        {/* Trust Line */}
                        <p className="lb-hero-trust-line">
                            Trusted by founders, startups, and growing businesses.
                        </p>
                    </motion.div>
                </div>
            </section >


            {/* ── Two Ways In ── */}
            <section className="mg-section" id="lb-services">
                <div className="mg-wrap">
                    <div className="mg-head mg-reveal">
                        <span className="mg-pill">Two ways in</span>
                        <h2>Get expertise. Or <em>get paid for yours.</em></h2>
                        <p>One platform where people find real answers and experts build real income.</p>
                    </div>
                    <div className="mg-two-grid">
                        <div className="mg-aud mg-light mg-reveal">
                            <h3>For Clients</h3>
                            <p className="mg-intro">Skip the search results and the unanswered DMs. Talk directly to someone who has done the thing you're trying to do.</p>
                            <ul>
                                <li>Book 1:1 video sessions with verified experts</li>
                                <li>Browse specialists across every category</li>
                                <li>Subscribe for ongoing coaching, not one-off advice</li>
                                <li>Buy courses, workshops, and books straight from the source</li>
                            </ul>
                            <button className="mg-btn mg-btn-navy" onClick={() => nav('experts')}>Find an Expert</button>
                        </div>
                        <div className="mg-aud mg-dark-card mg-reveal">
                            <h3>For Experts</h3>
                            <p className="mg-intro">Your experience is the product. mindGigs handles booking, video, payments, and payouts so you can just show up and talk.</p>
                            <ul>
                                <li>List your expertise for free and set your own rates</li>
                                <li>Keep 70% of every sale, up to 77.5% on your own referrals</li>
                                <li>Sell sessions, subscriptions, digital products, and books</li>
                                <li>Get paid through Stripe with every transaction visible</li>
                            </ul>
                            <button className="mg-btn mg-btn-teal" onClick={handleJoinAsExpert}>Become an Expert</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Why Choose ── */}
            <section className="mg-section mg-why mg-dark">
                <div className="mg-wrap">
                    <div className="mg-head mg-reveal">
                        <span className="mg-pill">Why people choose mindGigs</span>
                        <h2>Judgment beats search results.</h2>
                        <p>AI gives you information. Experts give you decisions. Connect with people who have lived the problem instead of chasing cold outreach.</p>
                    </div>
                    <div className="mg-why-grid">
                        <div>
                            <div className="mg-reason mg-reveal">
                                <div className="mg-reason-top">
                                    <h3><span className="mg-hl">100%</span> Verified</h3>
                                    <p className="mg-desc">Every expert is manually reviewed before their profile goes live. No self-appointed gurus, no bots, no recycled advice.</p>
                                </div>
                                <ul>
                                    <li>Credentials and track record checked by our team</li>
                                    <li>Real reviews from real sessions</li>
                                    <li>Specialties you can actually filter by</li>
                                </ul>
                            </div>
                            <div className="mg-reason mg-reveal">
                                <div className="mg-reason-top">
                                    <h3>Face to <span className="mg-hl">Face</span></h3>
                                    <p className="mg-desc">Private HD video rooms with an instant calendar invite. You get undivided attention for the full session, not a rushed reply.</p>
                                </div>
                                <ul>
                                    <li>Secure video sessions, no downloads required</li>
                                    <li>Calendar invite the moment you book</li>
                                    <li>Follow up with subscriptions if one call isn't enough</li>
                                </ul>
                            </div>
                            <div className="mg-reason mg-reveal">
                                <div className="mg-reason-top">
                                    <h3>Start <span className="mg-hl">Earning</span></h3>
                                    <p className="mg-desc">Turn years of experience into a new revenue line. Listing costs nothing and you keep total control over your price and calendar.</p>
                                </div>
                                <ul>
                                    <li>Free to list, free to set your rates</li>
                                    <li>Keep 70% on every sale, 77.5% on self-referred bookings</li>
                                    <li>No hidden fees and no exclusivity lock-in</li>
                                </ul>
                            </div>
                        </div>
                        <div className="mg-mock mg-reveal" aria-hidden="true">
                            <div className="mg-mock-bar"><i /><i /><i /><div className="mg-url">mindgigs.com/session</div></div>
                            <div className="mg-mock-screen">
                                <div className="mg-mock-video">
                                    <span className="mg-mock-live">Live session</span>
                                    <div className="mg-mock-name">Ali Abdal<small>Executive Performance Strategist</small></div>
                                </div>
                                <div className="mg-mock-row">
                                    <div className="mg-mock-price">$450<small>60-minute session</small></div>
                                    <span className="mg-mock-join">Join session</span>
                                </div>
                                <div className="mg-mock-tags"><span>Verified</span><span>4.9 ★</span><span>Calendar synced</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Offers by Role ── */}
            <OffersByRole nav={nav} />
            {/* Subscriptions */}
            {SHOW_SUBSCRIPTIONS && (
            < section id="lb-subscriptions" className="lb-section lb-section-white" >
                <div className="lb-container">
                    <motion.div
                        initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
                        whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="lb-subs-header"
                    >
                        <h2 className="lb-section-title">Subscriptions</h2>
                    </motion.div>
                    <div className="lb-subs-grid">
                        {SUBSCRIPTIONS.map((plan, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ y: -15, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="lb-sub-card"
                            >
                                {plan.popular && (
                                    <div className="lb-popular-badge">Popular</div>
                                )}
                                <div className="lb-sub-header">
                                    <div className="lb-sub-icon-wrap">
                                        <plan.icon className="lb-sub-icon" />
                                    </div>
                                    <div>
                                        <h3 className="lb-sub-title">{plan.title}</h3>
                                        <p className="lb-sub-desc">{plan.desc}</p>
                                    </div>
                                </div>
                                <div className="lb-sub-features">
                                    {plan.features.map((feature, idx) => (
                                        <div key={idx} className="lb-sub-feature">
                                            <div className="lb-sub-check">
                                                <Check style={{ width: 12, height: 12, color: 'white' }} />
                                            </div>
                                            <span className="lb-sub-feature-text">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="lb-sub-footer">
                                    <div>
                                        <div className="lb-sub-price">
                                            <span className="lb-sub-price-num">${plan.price}</span>
                                            <span className="lb-sub-price-period">/ month</span>
                                        </div>
                                        <p className="lb-sub-price-label">per month</p>
                                    </div>
                                    <button
                                        className="lb-btn-subscribe"
                                        onClick={() => nav('experts')}
                                    >
                                        Subscribe
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section >
            )}

            {/* ── Affiliate Band ── */}
            <section className="mg-section mg-aff" id="lb-affiliate">
                <div className="mg-wrap mg-aff-grid">
                    <div className="mg-reveal">
                        <span className="mg-pill">Affiliate Program</span>
                        <h2>We grow through <em>people, not ads.</em></h2>
                        <p className="mg-lede">Get your own coupon code, share it anywhere, and earn on every sale it drives. Onboard an expert and keep earning for as long as they sell.</p>
                        <button className="mg-btn mg-btn-amber" onClick={handleBecomePartner}>Become a Partner</button>
                    </div>
                    <div className="mg-aff-nums mg-reveal">
                        <div className="mg-aff-num"><div className="mg-n">7.5%</div><p>On every sale your code drives, at signup or checkout</p></div>
                        <div className="mg-aff-num"><div className="mg-n">77.5%</div><p>Experts keep up to this much on their own referrals</p></div>
                        <div className="mg-aff-num"><div className="mg-n">$0</div><p>To join the program and get your code</p></div>
                        <div className="mg-aff-num"><div className="mg-n">∞</div><p>Lifetime earnings from experts you onboard</p></div>
                    </div>
                </div>
            </section>
            {/* Featured Experts */}
            {liveCarouselExperts.length > 0 && (
            < section id="lb-experts" className="lb-section lb-experts" >
                <div className="lb-experts-blob" />
                <div className="lb-container lb-rel">
                    <div className="lb-experts-header">
                        <div>
                            <h2 className="lb-section-title">Featured Experts</h2>
                            <p className="lb-section-sub">
                                We provide the structure. Experts deliver the impact.
                                {carouselLive && (
                                    <span style={{ marginLeft: 10, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', background: 'rgba(26,184,160,0.12)', color: 'var(--teal)', padding: '2px 8px', borderRadius: 99, fontWeight: 700, verticalAlign: 'middle' }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                                        Live
                                    </span>
                                )}
                            </p>
                        </div>
                        
                        <button className="lb-view-all" onClick={() => nav('experts')}>
                            View all 500+ experts <ArrowRight style={{ width: 20, height: 20 }} />
                        </button>
                    </div>

                    <Swiper
                        modules={[FreeMode, Autoplay, Scrollbar]}
                        spaceBetween={30}
                        slidesPerView={1.2}
                        freeMode={true}
                        loop={liveCarouselExperts.length >= 4}
                        speed={5000}
                        autoplay={{ delay: 0, disableOnInteraction: false, pauseOnMouseEnter: true }}
                        allowTouchMove={true}
                        scrollbar={{ draggable: true, hide: false }}
                        breakpoints={{
                            640: { slidesPerView: 2.2 },
                            1024: { slidesPerView: 3.2 },
                        }}
                        className="lb-experts-swiper lb-experts-marquee"
                    >
                        {liveCarouselExperts.map((expert) => {
                            const isHovered = hoveredExpertId === expert.id;

                            return (
                                <SwiperSlide key={expert.id}>
                                    <motion.div
                                        onClick={() => nav('public-profile', { expertId: expert.id, expert: expert })}
                                        onMouseEnter={() => setHoveredExpertId(expert.id)}
                                        onMouseLeave={() => setHoveredExpertId(null)}
                                        style={{
                                            background: '#fdfbf7',
                                            borderRadius: '44px',
                                            overflow: 'hidden',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            height: '100%',
                                            cursor: 'pointer',
                                            border: expert.isVerified ? '1.5px solid rgba(26,184,160,0.25)' : '1px solid rgba(15, 23, 42, 0.03)',
                                            transition: 'all 0.5s cubic-bezier(0.165, 0.84, 0.44, 1)',
                                            transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
                                            boxShadow: isHovered ? '0 24px 48px rgba(15, 23, 42, 0.1)' : 'none',
                                            position: 'relative',
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: '100%',
                                                aspectRatio: '0.82',
                                                overflow: 'hidden',
                                                position: 'relative',
                                                background: expert.image
                                                    ? 'var(--teal)'
                                                    : `hsl(${(expert.name?.charCodeAt(0) || 0) * 37 % 360}, 45%, 55%)`
                                            }}
                                        >
                                            {expert.image ? (
                                                <img
                                                    src={expert.image}
                                                    alt={expert.name}
                                                    referrerPolicy="no-referrer"
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        objectPosition: 'top center',
                                                        transition: 'transform 0.8s cubic-bezier(0.165, 0.84, 0.44, 1)',
                                                        transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                                                    }}
                                                />
                                            ) : (
                                                <div style={{
                                                    width: '100%', height: '100%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '4rem', fontWeight: 800, color: '#fff', opacity: 0.9,
                                                    fontFamily: 'var(--fu)',
                                                }}>
                                                    {(expert.name || 'E').charAt(0).toUpperCase()}
                                                </div>
                                            )}

                                            {/* Expertise overlay on hover */}
                                            <div
                                                style={{
                                                    position: 'absolute', bottom: 0, left: 0, width: '100%',
                                                    padding: '40px 20px 20px',
                                                    background: 'linear-gradient(to top, rgba(25, 181, 166, 0.95) 0%, rgba(25, 181, 166, 0.4) 60%, transparent 100%)',
                                                    transition: 'all 0.4s ease',
                                                    opacity: isHovered ? 1 : 0,
                                                    transform: isHovered ? 'translateY(0)' : 'translateY(20px)',
                                                    display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center'
                                                }}
                                            >
                                                <span style={{ color: 'white', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8 }}>Key Expertise</span>
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                                                    {(expert.expertise || ['Expert']).slice(0, 2).map((tag, i) => (
                                                        <span key={i} style={{
                                                            background: 'white', color: 'var(--teal)',
                                                            padding: '3px 10px', borderRadius: '99px',
                                                            fontSize: '0.7rem', fontWeight: 700,
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                        }}>{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ padding: '24px 20px', textAlign: 'center' }}>
                                            <h3 style={{
                                                fontFamily: 'var(--fd)', fontWeight: 800, fontSize: '1.2rem',
                                                color: 'var(--text-main)', marginBottom: 4,
                                            }}>{expert.name}</h3>
                                            <p style={{
                                                fontSize: '0.82rem', color: 'var(--sl)', fontWeight: 500, margin: 0,
                                                display: '-webkit-box', WebkitLineClamp: 1,
                                                WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                            }}>{expert.role}</p>
                                            {expert.price && (
                                                <p style={{ fontSize: '0.78rem', color: 'var(--teal)', fontWeight: 700, marginTop: 6 }}>{expert.price}</p>
                                            )}
                                        </div>
                                    </motion.div>
                                </SwiperSlide>
                            );
                        })}
                    </Swiper>
                </div>
            </section >
            )}

             {/* ── How It Works ── */}
            <section className="mg-section" id="lb-how">
                <div className="mg-wrap">
                    <div className="mg-head mg-reveal">
                        <span className="mg-pill">How it works</span>
                        <h2>From stuck to sorted in <em>three steps.</em></h2>
                    </div>
                    <div className="mg-steps">
                        <div className="mg-step mg-reveal"><div className="mg-n">STEP 01</div><h3>Pick your expert</h3><p>Browse verified experts with real reviews and trusted specialties.</p><div className="mg-rule" /></div>
                        <div className="mg-step mg-reveal"><div className="mg-n">STEP 02</div><h3>Book your session</h3><p>Choose a time, pay securely, and get an instant calendar invite.</p><div className="mg-rule" /></div>
                        <div className="mg-step mg-reveal"><div className="mg-n">STEP 03</div><h3>Get clear answers</h3><p>Join the private video room and leave with something you can act on today.</p><div className="mg-rule" /></div>
                    </div>
                </div>
            </section>

            {/* FAQs */}
            < section id="lb-faqs" className="lb-section lb-faqs" >
                <div className="lb-container">
                    <motion.div
                        initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
                        whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="lb-section-header"
                    >
                        <h2 className="lb-section-title">Frequently Asked Questions</h2>
                        <p className="lb-section-sub">Everything you need to know about mindGigs.</p>
                    </motion.div>

                    {FAQ_GROUPS.map((group) => (
                        <FaqGroup
                            key={group.category}
                            group={group}
                            collapsible={group.category !== 'General'}
                        />
                    ))}
                </div>
            </section >

            {/* ── Final CTA ── */}
            <section className="mg-final">
                <h2>Stop guessing. <span>Start asking.</span></h2>
                <p>The answer you've been circling for weeks is one session away.</p>
                <div className="mg-final-ctas">
                    <button className="mg-btn mg-btn-teal" onClick={() => nav('experts')}>Book an Expert</button>
                    <button className="mg-btn mg-btn-outline" onClick={handleJoinAsExpert}>Become an Expert</button>
                </div>
            </section>
            {/* Footer */}
            < footer className="lb-footer" >
                <div className="lb-footer-overlay" />
                <div className="lb-container lb-rel">
                    <div className="lb-footer-grid">
                        <div className="lb-footer-brand">
                            <div className="lb-footer-logo">mind<span style={{ color: 'var(--teal)' }}>G</span>igs</div>
                            <p className="lb-footer-tagline">
                                Connecting ambitious professionals with world-class expertise to accelerate growth and decision-making.
                            </p>
                        </div>
                        <div>
                            <h4 className="lb-footer-heading">Platform</h4>
                            <ul className="lb-footer-links">
                                <li><a href="#lb-how">How it Works</a></li>
                                <li><a href="#lb-experts">Browse Experts</a></li>
                                <li><a href="#lb-services">Services</a></li>
                                {SHOW_SUBSCRIPTIONS && <li><a href="#lb-subscriptions">Pricing</a></li>}
                            </ul>
                        </div>
                        <div>
                            <h4 className="lb-footer-heading">Company</h4>
                            <ul className="lb-footer-links">
                                <li><a href="#">About Us</a></li>
                                <li><a href="#">Careers</a></li>
                                <li><a href="#">Affiliate Program</a></li>
                                <li><a href="#">Contact</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="lb-footer-heading">Legal</h4>
                            <ul className="lb-footer-links">
                                <li><a href="#">Privacy Policy</a></li>
                                <li><a href="#">Terms of Service</a></li>
                                <li><a href="#">Cookie Policy</a></li>
                            </ul>
                        </div>
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
