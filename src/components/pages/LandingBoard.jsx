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
    Code2,
    Scale,
    Palette,
    Megaphone,
    UserCheck,
    BookOpen,
    Presentation,
    Video,
    Menu,
    X
} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation, Autoplay, EffectCoverflow } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import 'swiper/css/effect-coverflow';

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

const SERVICES = [
    {
        category: "Consultants",
        icon: Briefcase,
        description: "Strategic guidance to navigate complex business challenges and drive sustainable growth.",
        items: [
            "Business Strategy Development",
            "Growth & Scaling Plans",
            "Market Research & Analysis",
            "Operations Optimization",
            "Financial Planning & Forecasting"
        ]
    },
    {
        category: "Developers",
        icon: Code2,
        description: "Technical expertise to build robust, scalable digital products and automate your systems.",
        items: [
            "Website Development",
            "Mobile App Development",
            "SaaS/Product Development",
            "E-commerce Setup",
            "API Integration & System Automation"
        ]
    },
    {
        category: "Lawyers",
        icon: Scale,
        description: "Professional legal support to protect your interests and ensure full business compliance.",
        items: [
            "Legal Consultation",
            "Contract Drafting & Review",
            "Business Registration & Compliance",
            "Intellectual Property Protection",
            "Dispute Resolution"
        ]
    },
    {
        category: "Designers",
        icon: Palette,
        description: "Creative vision to define your brand identity and craft exceptional user experiences.",
        items: [
            "Brand Identity & Logo Design",
            "UI/UX Design",
            "Website & App Design",
            "Marketing Creatives",
            "Design Systems"
        ]
    },
    {
        category: "Marketers",
        icon: Megaphone,
        description: "Data-driven strategies to amplify your brand voice and capture market share.",
        items: [
            "Digital Marketing Strategy",
            "SEO Optimization",
            "Social Media Marketing",
            "Paid Advertising Campaigns",
            "Content Marketing"
        ]
    },
    {
        category: "Coaches",
        icon: UserCheck,
        description: "Personalized mentorship to unlock your potential and lead with absolute clarity.",
        items: [
            "Career Coaching",
            "Business Coaching",
            "Leadership Coaching",
            "Executive Mentoring",
            "Productivity & Mindset Coaching"
        ]
    }
];

const CTA_SERVICES = [
    { title: "Advisory Session", icon: Users, desc: "Strategic long-term guidance." },
    { title: "1:1 Paid Calls", icon: PhoneCall, desc: "Focused decision support." },
    { title: "Expert-Led Communities", icon: MessageSquare, desc: "Direct access to peer networks." },
    { title: "Digital Products", icon: Download, desc: "Playbooks and frameworks." },
    { title: "Training", icon: BookOpen, desc: "Structured skill building." },
    { title: "Workshops", icon: Presentation, desc: "Interactive group sessions." },
];

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

export function LandingBoard({ nav, onLogin, experts }) {
    const { currentUser, userData } = useAuth();
    const isLoggedIn = !!currentUser && !!userData?.role;
    const dashboardRoute = ROLE_DASHBOARD_ROUTE[userData?.role];
    const [activeCtaIndex, setActiveCtaIndex] = React.useState(0);
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

    React.useEffect(() => {
        const timer = setInterval(() => {
            setActiveCtaIndex((prev) => (prev + 1) % CTA_SERVICES.length);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    const handleJoinAsExpert = () => {
        setIsMenuOpen(false);
        nav('home');
    };

    const handleBecomePartner = () => {
        setIsMenuOpen(false);
        nav('login', { role: 'affiliate' });
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
                        <a href="#lb-how" className="lb-nav-link">How it Works</a>
                        <a href="#lb-affiliate" className="lb-nav-link">Affiliate</a>
                        <a href="#lb-experts" className="lb-nav-link">Experts</a>
                        <a href="#lb-subscriptions" className="lb-nav-link">Pricing</a>
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
                                <a href="#lb-how" onClick={() => setIsMenuOpen(false)} className="lb-mobile-link">How it Works</a>
                                <a href="#lb-affiliate" onClick={() => setIsMenuOpen(false)} className="lb-mobile-link">Affiliate</a>
                                <a href="#lb-experts" onClick={() => setIsMenuOpen(false)} className="lb-mobile-link">Experts</a>
                                <a href="#lb-subscriptions" onClick={() => setIsMenuOpen(false)} className="lb-mobile-link">Pricing</a>
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
                <FloatingSideElements />

                <div className="lb-hero-content">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.85, ease: 'easeOut' }}
                    >
                        {/* Badge */}


                        <h1 className="lb-hero-title">
                            Stuck on something?.{' '}
                            <br />
                            Borrow a {' '}
                            <span className="lb-hero-accent">brilliant mind..</span>
                        </h1>

                        <p className="lb-hero-sub">
                            Book a 1:1 video session with a verified expert who has already solved the problem you're staring at. No agencies. No retainers. No three-week email chains. Just answers, face to face.
                        </p>

                        {/* CTA Buttons */}
                        <div className="lb-hero-cta">
                            <button className="lb-btn-hire" onClick={() => nav('experts')}>
                                Hire an Expert
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


            {/* How It Works */}
            < section id="lb-how" className="lb-section lb-section-white lb-how" >
                <div className="lb-blob lb-blob-tl" />
                <div className="lb-blob lb-blob-br" />

                <div className="lb-container lb-rel">
                    <motion.div
                        initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
                        whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="lb-section-header"
                    >
                        <h2 className="lb-section-title">How It Works</h2>
                    </motion.div>
                    <div className="lb-how-grid">
                        {[
                            { step: "01", title: "Pick your expert", desc: "Browse verified experts with real reviews and trusted specialties." },
                            { step: "02", title: "Book a time that works", desc: "Choose a slot, pay securely, and get an instant calendar invite." },
                            { step: "03", title: "Meet face to face", desc: "Join a private video call, share your screen, and leave with clear answers." },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.2 }}
                                whileHover={{ y: -20, scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="lb-how-card"
                            >
                                <div className="lb-how-step">{item.step}</div>
                                <h3 className="lb-how-card-title">{item.title}</h3>
                                <p className="lb-how-card-desc">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section >

            {/* Services Slider */}
            < section id="lb-services" className="lb-section lb-section-white lb-services" >
                <div className="lb-blob lb-blob-tr" />
                <div className="lb-container lb-rel">
                    <motion.div
                        initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
                        whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="lb-services-header"
                    >
                        <h2 className="lb-section-title">Our Specialized Services</h2>
                        <p className="lb-section-sub">Direct access to elite practitioners across every critical business function.</p>
                    </motion.div>

                    <Swiper
                        modules={[Pagination, Autoplay, Navigation, EffectCoverflow]}
                        effect={'coverflow'}
                        grabCursor={true}
                        centeredSlides={true}
                        loop={true}
                        slidesPerView={1}
                        coverflowEffect={{
                            rotate: 0,
                            stretch: 0,
                            depth: 100,
                            modifier: 2.5,
                            slideShadows: false,
                        }}
                        pagination={{ clickable: true }}
                        navigation={true}
                        autoplay={{ delay: 6000, disableOnInteraction: false }}
                        breakpoints={{
                            768: { slidesPerView: 2 },
                            1024: { slidesPerView: 3 },
                        }}
                        className="lb-services-swiper"
                    >
                        {SERVICES.map((service, i) => (
                            <SwiperSlide key={i}>
                                <div className="lb-service-card">
                                    <div className="lb-service-icon-wrap">
                                        <service.icon className="lb-service-icon" />
                                    </div>
                                    <h3 className="lb-service-title">{service.category}</h3>
                                    <p className="lb-service-desc">{service.description}</p>
                                    <div className="lb-service-items">
                                        {service.items.map((item, idx) => (
                                            <button key={idx} className="lb-service-item">
                                                <div className="lb-service-dot" />
                                                <span>{item}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <button 
                                        className="lb-service-cta"
                                        onClick={() => nav('experts', { category: service.category })}
                                    >
                                        Find {service.category} <ArrowRight style={{ width: 20, height: 20 }} />
                                    </button>
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            </section >

            {/* Strategic Support CTA */}
            < section className="lb-section lb-cta-section" >
                <div className="lb-container">
                    <div className="lb-cta-card">
                        {/* Left */}
                        <div className="lb-cta-left">
                            <h2 className="lb-cta-title">Need Strategic Support to Grow?</h2>
                            <p className="lb-cta-sub">Get matched with the right expert to keep building and marketing your project.</p>
                            <button className="lb-btn-white" onClick={() => nav('experts')}>Find an expert</button>
                        </div>

                        {/* Right graphic */}
                        <div className="lb-cta-right">
                            <div className="lb-cta-blob lb-cta-blob-1" />
                            <div className="lb-cta-blob lb-cta-blob-2" />

                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, x: 20 }}
                                whileInView={{ opacity: 1, scale: 1, x: 0 }}
                                className="lb-cta-widget"
                            >
                                <div className="lb-cta-dots">
                                    <div className="lb-dot" />
                                    <div className="lb-dot" />
                                    <div className="lb-dot" />
                                </div>

                                <div className="lb-cta-services-wrap">
                                    <div className="lb-cta-services-inner">
                                        {CTA_SERVICES.map((service, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                                animate={{
                                                    opacity: activeCtaIndex === idx ? 1 : 0,
                                                    y: activeCtaIndex === idx ? 0 : 20,
                                                    scale: activeCtaIndex === idx ? 1 : 0.9,
                                                    zIndex: activeCtaIndex === idx ? 20 : 0
                                                }}
                                                transition={{ duration: 0.5 }}
                                                className="lb-cta-service-item"
                                            >
                                                <div className="lb-cta-service-icon-wrap">
                                                    <service.icon className="lb-cta-service-icon" />
                                                </div>
                                                <div>
                                                    <h4 className="lb-cta-service-title">{service.title}</h4>
                                                    <p className="lb-cta-service-desc">{service.desc}</p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                    <div className="lb-cta-indicators">
                                        {CTA_SERVICES.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`lb-cta-dot ${activeCtaIndex === idx ? 'lb-cta-dot-active' : ''}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                animate={{ y: [0, -15, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="lb-float-icon lb-float-top"
                            >
                                <PhoneCall style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.4)' }} />
                            </motion.div>
                            <motion.div
                                animate={{ y: [0, 15, 0] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                className="lb-float-icon lb-float-bottom"
                            >
                                <Presentation style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.4)' }} />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section >

            {/* Subscriptions */}
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

            {/* Affiliate Advantage */}
            < section id="lb-affiliate" className="lb-section lb-section-white" >
                <div className="lb-container lb-affiliate-layout">
                    <div className="lb-affiliate-left">
                        <h2 className="lb-section-title">Affiliate-Driven Growth Model</h2>
                        <p className="lb-affiliate-sub">
                            Unlike traditional platforms that rely primarily on paid advertising, mindGigs operates on a revenue-sharing model designed for alignment.
                        </p>
                        <div className="lb-affiliate-stats">
                            <div className="lb-affiliate-stat">
                                <div className="lb-aff-pct">20%</div>
                                <p>Lifetime commission on direct referrals</p>
                            </div>
                            <div className="lb-affiliate-stat">
                                <div className="lb-aff-pct">5%</div>
                                <p>Commission on second-tier referrals</p>
                            </div>
                        </div>
                        <button className="lb-btn-primary-sm" onClick={handleBecomePartner}>Become a Partner</button>
                    </div>
                    <div className="lb-affiliate-card">
                        <div className="lb-rel" style={{ zIndex: 10 }}>
                            <h3 className="lb-affiliate-card-title">Growth is driven by alignment, not ad spend.</h3>
                            <ul className="lb-affiliate-list">
                                <li><CheckCircle2 className="lb-aff-check" /> Experts grow through trusted networks.</li>
                                <li><CheckCircle2 className="lb-aff-check" /> Affiliates are incentivized through performance.</li>
                                <li><CheckCircle2 className="lb-aff-check" /> Clients discover high-quality expertise.</li>
                            </ul>
                        </div>
                        <div className="lb-affiliate-blob" />
                    </div>
                </div>
            </section >

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
                        modules={[Pagination, Navigation, Autoplay]}
                        spaceBetween={30}
                        slidesPerView={1}
                        centeredSlides={liveCarouselExperts.length < 2}
                        pagination={{ clickable: true }}
                        autoplay={{ delay: 4500, disableOnInteraction: false, pauseOnMouseEnter: true }}
                        loop={liveCarouselExperts.length >= 4}
                        breakpoints={{
                            640: { slidesPerView: 2, centeredSlides: liveCarouselExperts.length < 2 },
                            1024: { slidesPerView: 3, centeredSlides: liveCarouselExperts.length < 3 },
                        }}
                        className="lb-experts-swiper"
                    >
                        {liveCarouselExperts.map((expert) => {
                            const isHovered = hoveredExpertId === expert.id;
                            const isOthersHovered = hoveredExpertId !== null && !isHovered;

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
                                            filter: isOthersHovered ? 'blur(8px) brightness(0.9)' : 'none',
                                            opacity: isOthersHovered ? 0.7 : 1,
                                            transform: isHovered ? 'translateY(-12px) scale(1.02)' : 'translateY(0) scale(1)',
                                            boxShadow: isHovered ? '0 30px 60px rgba(15, 23, 42, 0.12)' : 'none',
                                            zIndex: isHovered ? 10 : 1,
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
                                <li><a href="#lb-subscriptions">Pricing</a></li>
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
