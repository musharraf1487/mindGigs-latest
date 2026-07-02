# mindGigs

**mindGigs** is a marketplace platform connecting clients with domain experts for 1-on-1 sessions, subscriptions, and digital products. It supports four user roles — **Expert**, **Client**, **Affiliate**, and **Admin** — each with a dedicated dashboard and onboarding flow.

Built with React 18 + Vite, Firebase on the backend, and a custom vanilla CSS design system.

---

## 🏗️ Project Structure

```
mindGigs-v2/
├── index.html                        # HTML entry point
├── vite.config.js                    # Vite build config
├── package.json
└── src/
    ├── index.jsx                     # React entry point (renders App)
    ├── App.jsx                       # Central router + shared state
    │
    ├── config/
    │   └── firebase.js               # Firebase app init (Auth, Firestore, Storage)
    │
    ├── context/
    │   ├── AuthContext.jsx           # Auth state, signup/login/logout, Firestore user fetch
    │   └── ThemeContext.jsx          # Light-mode enforcer (dark mode disabled)
    │
    ├── data/
    │   └── mockData.js               # Mock data for all 4 roles (experts, clients, admin, affiliate)
    │
    ├── images/                       # Local expert profile images
    │   ├── amiranzur.png
    │   ├── moemohana.png
    │   └── Chris-Tibbetts.png
    │
    ├── styles/
    │   ├── globals.css               # CSS variables, reset, fonts, scrollbar
    │   ├── utilities.css             # Buttons, cards, tags, forms, modals, grid helpers
    │   ├── layout.css                # Dashboard layout (sidebar, topbar, dash-main)
    │   ├── components.css            # Stat cards, tables, charts, calendar, activity feed
    │   └── pages.css                 # Hero, landing sections, expert carousel, booking flow
    │
    ├── components/
    │   ├── common/
    │   │   ├── DashShell.jsx         # Shared dashboard layout wrapper (sidebar + topbar + content)
    │   │   ├── NavControls.jsx       # Browser back/forward buttons for dashboard navbars
    │   │   ├── Notifications.jsx     # Toast notification stack (top-right)
    │   │   └── ProfIcon.jsx          # Teal icon-in-box component (maps string keys → Lucide icons)
    │   │
    │   ├── pages/
    │   │   ├── LandingBoard.jsx      # Main marketing homepage (hero, features, experts carousel)
    │   │   ├── LandingPage.jsx       # Secondary landing page variant
    │   │   ├── ExpertsDirectory.jsx  # Browseable expert grid with 3D carousel + category filter
    │   │   ├── PublicProfile.jsx     # Expert public profile (bio, sessions, subscriptions, reviews)
    │   │   ├── BookingFlow.jsx       # Session booking calendar + checkout
    │   │   ├── LoginPage.jsx         # Multi-role login (email/password + demo mode)
    │   │   ├── SignupPage.jsx        # Multi-role account creation
    │   │   └── OnboardingPage.jsx    # Expert profile setup wizard (post-signup)
    │   │
    │   └── dashboards/
    │       ├── expert/
    │       │   ├── ExpertDashboard.jsx    # Expert shell + sidebar navigation
    │       │   └── sections/
    │       │       ├── Overview.jsx       # Stats, recent bookings, quick actions
    │       │       ├── Offers.jsx         # Sessions, subscriptions, digital products
    │       │       ├── Bookings.jsx       # Upcoming & past booking management
    │       │       ├── Subscriptions.jsx  # Active subscriber list
    │       │       ├── Products.jsx       # Digital product library
    │       │       ├── Affiliate.jsx      # Expert's affiliate link & earnings
    │       │       ├── Earnings.jsx       # Revenue charts & payout history
    │       │       └── Settings.jsx       # Profile, billing, account settings
    │       │
    │       ├── client/
    │       │   └── ClientDashboard.jsx    # Client dashboard (bookings, subs, purchases, activity)
    │       │
    │       ├── affiliate/
    │       │   ├── AffiliateDashboard.jsx # Affiliate shell + sidebar
    │       │   └── sections/
    │       │       ├── Overview.jsx       # Earnings stats + affiliate link + activity
    │       │       ├── Referrals.jsx      # Referred expert list + status
    │       │       ├── Campaigns.jsx      # Campaign tracking (clicks, conversions, ROI)
    │       │       ├── Earnings.jsx       # Commission breakdown + payout history
    │       │       └── Settings.jsx       # Affiliate account settings
    │       │
    │       └── admin/
    │           ├── AdminDashboard.jsx     # Admin shell + sidebar
    │           └── sections/
    │               ├── Overview.jsx       # Platform-wide KPIs + revenue chart
    │               ├── Users.jsx          # User management table (all roles)
    │               ├── Transactions.jsx   # Platform transaction ledger
    │               ├── Analytics.jsx      # Platform analytics & key metrics
    │               └── Settings.jsx       # Platform configuration
```

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 |
| Build Tool | Vite 4 |
| Backend / Auth | Firebase (Auth, Firestore, Storage) |
| Icons | Lucide React |
| Animation | Motion (Framer Motion v12) |
| Carousel | Swiper.js |
| Styling | Vanilla CSS (5 organized files) |
| Fonts | Inter, DM Serif Display (Google Fonts) |

---

## 🔑 Multi-Role System

mindGigs has 4 distinct user roles, each with a separate login portal and dashboard:

| Role | Login Portal | Dashboard Route | Description |
|------|-------------|-----------------|-------------|
| **Expert** | Expert Portal | `expert-dashboard` | Profile, bookings, subscriptions, products, earnings |
| **Client** | Client/Buyer Portal | `client-dashboard` | Book sessions, manage subscriptions, purchases |
| **Affiliate** | Affiliate Portal | `affiliate-dashboard` | Referral links, campaign tracking, commissions |
| **Admin** | Admin Portal | `admin-dashboard` | Platform user management, transactions, analytics |

### Role Selection Flow
1. User clicks **Log In** → `LoginSelectorModal` opens (role picker)
2. Role is stored in state → `LoginPage` renders the matching portal UI
3. After Firebase auth, `AuthContext` fetches the Firestore `users/{uid}` doc
4. App reads `userData.role` and redirects to the correct dashboard

---

## 🔥 Firebase Setup

The project uses a Firebase project (`mindgigs-62f27`). Config lives in `src/config/firebase.js`:

```js
// Three services exported:
export const auth     // Firebase Authentication
export const db       // Firestore Database
export const storage  // Firebase Storage
```

### Firestore Data Model

**`users/{uid}`** — created on signup:
```json
{
  "uid": "...",
  "email": "user@example.com",
  "role": "expert | client | affiliate | admin",
  "name": "...",
  "onboardingComplete": true,
  "createdAt": "ISO timestamp"
}
```

Experts also have: `handle`, `bio`, `category`, `tags`, `startingPrice`, `image`, `verified`, `sessionsList`, `subscriptions`.

---

## 🎨 CSS Design System

All variables are defined in `src/styles/globals.css` under `:root`:

### Colour Tokens
| Variable | Value | Usage |
|----------|-------|-------|
| `--teal` | `#19b5a6` | Primary brand accent (buttons, icons, active states) |
| `--gb` | `#547792` | Interactive slate-blue (links, borders, hover) |
| `--gl` | `#22c55e` | Green — success, active, earnings indicators |
| `--gold` | `#F59E0B` | Warnings, premium badges |
| `--rd` | `#EF4444` | Errors, destructive actions |
| `--purp` | `#8B5CF6` | Pending/special state accents |
| `--mu` | `#64748B` | Muted text, subtitles |
| `--sl` | `#334155` | Subtext, labels |
| `--gmt` | `rgba(15,23,42,0.04)` | Row/item tint backgrounds |
| `--rd-lt` | `rgba(239,68,68,0.10)` | Light red for error tags |

### Utility Classes
- **Buttons**: `.btn`, `.btn-gr`, `.btn-gh`, `.btn-pr`, `.btn-sm`, `.btn-lg`
- **Cards**: `.card`, `.card-dark`
- **Tags**: `.tag`, `.tag-gr`, `.tag-tl`, `.tag-gd`, `.tag-rd`, `.tag-pu`
- **Grid**: `.grid-2`, `.grid-3`, `.grid-4`
- **Forms**: `.field`, `.label`, `.input`, `.select`, `.textarea`
- **Dashboard**: `.dash-layout`, `.sidebar`, `.dash-main`, `.dash-topbar`, `.stat-card`

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
# → http://localhost:5173

# Production build
npm run build

# Preview production build
npm run preview
```

---

## 🔐 Demo Login

A built-in demo mode lets you explore all dashboards without a real account:

| Field | Value |
|-------|-------|
| Username | `demo` |
| Password | `demo` |

Select any role from the login selector modal, then enter `demo` / `demo`. The app calls `mockLogin(role)` in `AuthContext` which seeds a local user session without touching Firebase.

---

## 🗺️ Client-Side Routing

The app uses a custom `nav(page, ctx)` function in `App.jsx` with `window.history.pushState` — no React Router dependency. The browser back/forward buttons work correctly for all routes.

### Page Keys
| Key | Component |
|-----|-----------|
| `landingboard` | `LandingBoard` (default) |
| `home` | `LandingPage` |
| `experts` | `ExpertsDirectory` |
| `public-profile` | `PublicProfile` |
| `booking` | `BookingFlow` |
| `login` | `LoginPage` |
| `signup` | `SignupPage` |
| `onboarding` | `OnboardingPage` |
| `expert-dashboard` | `ExpertDashboard` |
| `client-dashboard` | `ClientDashboard` |
| `affiliate-dashboard` | `AffiliateDashboard` |
| `admin-dashboard` | `AdminDashboard` |

---

## 📦 Expert Data Flow

On load, `App.jsx` fetches live experts from Firestore (`users` collection where `role == 'expert'` and `onboardingComplete == true`) and merges them with the mock experts in `mockData.js`. An image override system ensures all experts have a professional photo:

1. **Uploaded image** → always used
2. **Live user, no upload** → letter-initial avatar
3. **Named mock experts** → specific overrides (`IMAGE_OVERRIDES` map)
4. **Other mock experts** → deterministic unique Unsplash portrait (hash of `id`)
