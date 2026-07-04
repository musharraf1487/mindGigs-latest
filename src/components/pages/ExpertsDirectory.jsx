import React, { useState, useMemo, useRef } from 'react';
import { ArrowRight, Zap, Star, BarChart2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = ['All', 'AI', 'Business', 'Developers', 'Marketers', 'Designers', 'Lawyers', 'Consultants', 'Coaches'];

const FEATURES = [
    {
        icon: <Zap size={20} color="#555" />,
        title: 'Real-Time Collaboration',
        desc: 'Communicate seamlessly and keep everyone in sync with built-in messaging, file sharing, and live updates.',
    },
    {
        icon: <Star size={20} color="#555" />,
        title: 'Specialized Expert Guidance',
        desc: 'Connect with seasoned product strategists, corporate attorneys, and licensed physicians tailored to your needs for personalized growth.',
    },
    {
        icon: <BarChart2 size={20} color="#555" />,
        title: 'Performance Insights',
        desc: 'Make smarter decisions with analytics that show productivity trends, bottlenecks, and team workload balance.',
    },
];

/* ─── Static 3D Fan Display ─── */
function FanDisplay({ experts }) {
    const cards = experts.slice(0, 7);
    const center = Math.floor(cards.length / 2);

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: 400,
            perspective: '1200px',
            perspectiveOrigin: '50% 50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
        }}>
            {cards.map((exp, i) => {
                const offset = i - center;
                const rotateY = offset * -16;          // subtle tilt
                const translateX = offset * 175;       // horizontal spread
                const translateZ = -Math.abs(offset) * 35; // mild depth
                const scale = 1 - Math.abs(offset) * 0.04;
                const opacity = 1 - Math.abs(offset) * 0.1;
                const zIndex = 50 - Math.abs(offset) * 10;

                return (
                    <div
                        key={exp.id}
                        style={{
                            position: 'absolute',
                            width: 215,
                            height: 330,
                            borderRadius: '18px',
                            overflow: 'hidden',
                            transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                            transformStyle: 'preserve-3d',
                            opacity,
                            zIndex,
                            background: '#2a2a2a',
                            boxShadow: Math.abs(offset) === 0
                                ? '0 28px 64px rgba(0,0,0,0.22)'
                                : `0 10px 30px rgba(0,0,0,0.1)`,
                        }}
                    >
                        {exp.image ? (
                            <img
                                src={exp.image}
                                alt={exp.name}
                                referrerPolicy="no-referrer"
                                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                            />
                        ) : (
                            <div style={{
                                width: '100%', height: '100%',
                                background: `hsl(${((exp.name?.charCodeAt(0) || 65) * 67 + 160) % 360}, 40%, 38%)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'rgba(255,255,255,0.9)', fontSize: '5rem', fontWeight: 900,
                            }}>
                                {exp.name?.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ─── Expert Grid Card ─── */
function ExpertGridCard({ expert, nav }) {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: '#fff',
                borderRadius: 22,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.35s cubic-bezier(0.165,0.84,0.44,1), box-shadow 0.35s ease',
                transform: hovered ? 'translateY(-8px)' : 'translateY(0)',
                boxShadow: hovered
                    ? '0 20px 48px rgba(25,181,166,0.15), 0 6px 20px rgba(0,0,0,0.08)'
                    : '0 2px 10px rgba(0,0,0,0.06)',
                border: '1px solid rgba(0,0,0,0.07)',
            }}
        >
            {/* Photo */}
            <div style={{
                width: '100%', aspectRatio: '4/3', overflow: 'hidden',
                position: 'relative',
                background: 'linear-gradient(135deg, #19b5a6, #0d8a7f)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '4rem', fontWeight: 900, color: 'rgba(255,255,255,0.9)',
            }}>
                {expert.image ? (
                    <img
                        src={expert.image}
                        alt={expert.name}
                        referrerPolicy="no-referrer"
                        style={{
                            width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center',
                            transition: 'transform 0.5s ease',
                            transform: hovered ? 'scale(1.06)' : 'scale(1)',
                        }}
                    />
                ) : (
                    <span>{expert.name?.charAt(0).toUpperCase() || 'E'}</span>
                )}
                {/* Tags on hover */}
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '36px 14px 14px',
                    background: 'linear-gradient(to top, rgba(25,181,166,0.93), rgba(25,181,166,0.5), transparent)',
                    display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center',
                    opacity: hovered ? 1 : 0,
                    transform: hovered ? 'translateY(0)' : 'translateY(12px)',
                    transition: 'all 0.3s ease',
                }}>
                    {(expert.tags || expert.expertise || []).slice(0, 3).map((tag, i) => (
                        <span key={i} style={{
                            background: 'white', color: '#19b5a6',
                            padding: '3px 10px', borderRadius: '99px',
                            fontSize: '0.68rem', fontWeight: 700,
                        }}>{tag}</span>
                    ))}
                </div>
            </div>

            {/* Info */}
            <div style={{ padding: '18px 18px 8px', textAlign: 'center', flex: 1 }}>
                <h3 style={{
                    fontFamily: 'var(--fd)', fontWeight: 800, fontSize: '1rem',
                    color: '#1a1a40', margin: '0 0 6px', letterSpacing: '-0.01em',
                }}>
                    {expert.name}
                </h3>
                <p style={{
                    fontSize: '0.8rem', color: '#6b7280', fontWeight: 500,
                    lineHeight: 1.5, margin: '0 0 8px',
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                    {expert.headline || expert.bio || 'Expert Practitioner'}
                </p>
                {expert.category && (
                    <span style={{
                        display: 'inline-block',
                        background: 'rgba(25,181,166,0.08)', color: '#19b5a6',
                        padding: '2px 12px', borderRadius: '99px',
                        fontSize: '0.7rem', fontWeight: 700,
                    }}>
                        {expert.category}
                    </span>
                )}
            </div>

            {/* Check Profile Button */}
            <div style={{ padding: '10px 18px 18px' }}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        nav('public-profile', { expertId: expert.id, expert: expert });
                    }}
                    style={{
                        width: '100%',
                        padding: '10px 0',
                        borderRadius: '12px',
                        background: hovered ? '#19b5a6' : 'transparent',
                        color: hovered ? 'white' : '#19b5a6',
                        border: '2px solid #19b5a6',
                        fontFamily: 'var(--fb)',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        letterSpacing: '0.02em',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#19b5a6';
                        e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                        if (!hovered) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#19b5a6';
                        }
                    }}
                >
                    Check Profile
                </button>
            </div>
        </div>
    );
}

/* ─── Main Export ─── */
export function ExpertsDirectory({ nav, onLogin, experts, selectedCategory }) {
    const { currentUser, userData } = useAuth();
    const isLoggedInExpert = !!currentUser && userData?.role === 'expert';
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const gridRef = useRef(null);

    // Sync with external category selection (e.g. from LandingBoard)
    React.useEffect(() => {
        if (selectedCategory) {
            setActiveCategory(selectedCategory);
        }
    }, [selectedCategory]);

    const filtered = useMemo(() => {
        return (experts || []).filter((e) => {
            const catMapping = {
                'AI': 'Tech',
                'Developers': 'Tech', 'Development': 'Tech',
                'Marketers': 'Creative', 'Marketing': 'Creative',
                'Designers': 'Creative', 'Design': 'Creative',
                'Lawyers': 'Law', 'Legal': 'Law',
            };
            let mappedCat = activeCategory;
            if (catMapping[activeCategory]) mappedCat = catMapping[activeCategory];

            const matchCat = activeCategory === 'All' ||
                (e.category || '') === mappedCat ||
                (e.category || '') === activeCategory ||
                (e.category || '').toLowerCase() === activeCategory.toLowerCase();

            const q = search.toLowerCase();
            const matchSearch = !q ||
                (e.name || '').toLowerCase().includes(q) ||
                (e.tags || []).some((t) => t.toLowerCase().includes(q)) ||
                (e.category || '').toLowerCase().includes(q) ||
                (e.bio || '').toLowerCase().includes(q);

            return matchCat && matchSearch;
        });
    }, [search, activeCategory, experts]);

    /* ─── Carousel Logic: Highest Rating at Center ─── */
    const carouselExperts = useMemo(() => {
        if (!experts || experts.length === 0) return [];
        
        // 1. Sort all experts by rating descending
        const sorted = [...experts].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        
        // 2. Select top 7 for the carousel
        const top7 = sorted.slice(0, 7);
        const result = new Array(top7.length);
        
        // 3. Reorder into pyramid for FanDisplay (Center = Highest)
        // Order: [Edge, FarL, Left, CENTER, Right, FarR, Edge]
        // Target Indices: [0, 1, 2, 3, 4, 5, 6]
        // Sorted Indices mapping: top7[0] -> result[3]
        
        const mid = Math.floor(top7.length / 2);
        result[mid] = top7[0]; // #1 expert in the middle
        
        for (let i = 1; i < top7.length; i++) {
            const offset = Math.ceil(i / 2);
            if (i % 2 === 1) {
                // Odd i: E2, E4, E6 -> Place on Left
                result[mid - offset] = top7[i];
            } else {
                // Even i: E3, E5, E7 -> Place on Right
                result[mid + offset] = top7[i];
            }
        }
        
        return result.filter(Boolean); // Clear any empties if < 7 experts
    }, [experts]);

    return (
        <div style={{ background: '#ffffff', minHeight: '100vh', paddingTop: 96 }}>

            {/* ── NAVBAR — floating pill style matching reference image ── */}
            <nav className="lb-nav">
                <div className="lb-nav-inner" style={{ maxWidth: 1280, padding: '0 32px' }}>
                    <button
                        className="lb-brand"
                        style={{ color: '#fff', fontWeight: 800 }}
                        onClick={() => nav('landingboard')}
                    >
                        mind<span style={{ color: '#19b5a6' }}>G</span>igs
                    </button>

                    <div className="lb-nav-links">
                        <button onClick={() => nav('landingboard')} className="lb-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>Home</button>
                        <span className="lb-nav-link" style={{ opacity: 1, color: '#19b5a6', fontWeight: 700 }}>Experts</span>
                        {!isLoggedInExpert && (
                            <button onClick={() => nav('home')} className="lb-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>Join as Expert</button>
                        )}
                    </div>

                    <div className="lb-nav-actions">
                        {isLoggedInExpert ? (
                            <button className="lb-btn-join" onClick={() => nav('expert-dashboard')}>Profile</button>
                        ) : (
                            <>
                                <button className="lb-btn-login" onClick={onLogin}>Log In</button>
                                <button
                                    className="lb-btn-join lb-hidden-sm"
                                    onClick={() => nav('home')}
                                >
                                    Join as Expert
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* ── HERO ── */}
            <section style={{
                background: '#ffffff',
                backgroundImage: `
                    linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)
                `,
                backgroundSize: '44px 44px',
                textAlign: 'center',
                padding: '80px 24px 0',
                position: 'relative',
            }}>
                <h1 style={{
                    fontFamily: 'var(--fd)',
                    fontSize: 'clamp(3rem, 7vw, 4.6rem)',
                    fontWeight: 900,
                    color: '#0F172A',
                    letterSpacing: '-0.035em',
                    lineHeight: 1.08,
                    margin: '0 0 18px',
                }}>
                    Explore <span style={{ color: '#19b5a6' }}>Experts</span>
                </h1>

                <p style={{
                    fontSize: '1.05rem',
                    color: '#5a6a7a',
                    maxWidth: 500,
                    margin: '0 auto 36px',
                    lineHeight: 1.65,
                    fontFamily: 'var(--fb)',
                }}>
                    Book 1:1 sessions, join communities, and learn from the<br />best Experts
                </p>

                {/* CTA Button */}
                <button
                    onClick={() => gridRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(25,181,166,0.5)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 5px 20px rgba(25,181,166,0.35)'; }}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 10,
                        background: '#19b5a6', color: 'white',
                        border: 'none', borderRadius: '999px',
                        padding: '14px 32px',
                        fontFamily: 'var(--fb)', fontWeight: 700, fontSize: '1rem',
                        cursor: 'pointer',
                        boxShadow: '0 5px 20px rgba(25,181,166,0.35)',
                        transition: 'transform 0.22s ease, box-shadow 0.22s ease',
                        marginBottom: 52,
                    }}
                >
                    Explore Experts <ArrowRight size={18} />
                </button>

                {/* 3D Fan */}
                {carouselExperts.length > 0 ? (
                    <FanDisplay experts={carouselExperts} />
                ) : (
                    <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>
                        <p>No experts to display.</p>
                    </div>
                )}

                {/* Features Row */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    maxWidth: 860,
                    margin: '16px auto 0',
                    padding: '44px 24px 72px',
                    borderTop: '1px solid rgba(0,0,0,0.07)',
                }}>
                    {FEATURES.map((f, i) => (
                        <div key={i} style={{
                            flex: 1,
                            padding: '0 28px',
                            borderRight: i < FEATURES.length - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                            textAlign: 'center',
                        }}>
                            <h4 style={{
                                fontFamily: 'var(--fd)', fontWeight: 700,
                                fontSize: '0.95rem', color: '#1a1a40',
                                margin: '0 0 10px',
                            }}>{f.title}</h4>
                            <p style={{
                                fontSize: '0.78rem', color: '#7a8a9a',
                                lineHeight: 1.65, margin: 0,
                            }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── ALL EXPERTS GRID ── */}
            <section
                ref={gridRef}
                style={{
                    background: '#f4f6f9',
                    padding: '64px 48px 90px',
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                }}
            >
                <div style={{ maxWidth: 1240, margin: '0 auto' }}>

                    {/* Section heading */}
                    <div style={{ textAlign: 'center', marginBottom: 44 }}>
                        <h2 style={{
                            fontFamily: 'var(--fd)', fontWeight: 900,
                            fontSize: '2.1rem', color: '#0F172A',
                            margin: '0 0 10px', letterSpacing: '-0.025em',
                        }}>
                            Browse All <span style={{ color: '#19b5a6' }}>Experts</span>
                        </h2>
                        <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>
                            {filtered.length} expert{filtered.length !== 1 ? 's' : ''} available
                        </p>
                    </div>

                    {/* Search & Category Filter */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 44 }}>

                        {/* Search bar */}
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            background: 'white', borderRadius: '25px',
                            padding: '10px 18px',
                            border: '1.5px solid rgba(0,0,0,0.1)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            transition: 'border-color 0.2s',
                            width: '100%',
                            maxWidth: 420,
                            minWidth: 320,
                        }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#19b5a6'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; }}
                        >
                            <svg width="16" height="16" fill="none" stroke="#999" strokeWidth="2" viewBox="0 0 24 24" style={{ marginRight: 10, flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                            <input
                                className="ed-search-input"
                                style={{
                                    border: 'none', background: 'transparent', outline: 'none',
                                    width: '100%', fontSize: '.9rem', fontFamily: 'var(--fb)',
                                    color: '#0F172A',
                                }}
                                placeholder="Search by name, expertise, or topic"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Category Pills */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                            {CATEGORIES.map((cat) => {
                                const isActive = activeCategory === cat;
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        style={{
                                            padding: '9px 20px', borderRadius: '999px',
                                            background: isActive ? '#19b5a6' : 'white',
                                            color: isActive ? 'white' : '#5a6a7a',
                                            fontFamily: 'var(--fb)', fontSize: '.83rem',
                                            fontWeight: isActive ? 700 : 600,
                                            border: isActive ? '2px solid #19b5a6' : '1.5px solid rgba(0,0,0,0.12)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            boxShadow: isActive ? '0 4px 14px rgba(25,181,166,0.3)' : 'none',
                                        }}
                                        onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = '#19b5a6'; e.currentTarget.style.borderColor = '#19b5a6'; } }}
                                        onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = '#5a6a7a'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'; } }}
                                    >
                                        {cat}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Grid */}
                    {filtered.length > 0 ? (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                            gap: 26,
                        }}>
                            {filtered.map((expert) => (
                                <ExpertGridCard key={expert.id} expert={expert} nav={nav} />
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '80px 0', color: '#aaa' }}>
                            <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 6 }}>No experts found</p>
                            <p style={{ fontSize: '0.85rem' }}>Try adjusting your search or category.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
