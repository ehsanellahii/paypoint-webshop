# PayPoint Webshop

Multi-tenant online ordering frontend for PayPoint POS. A single deployment serves every
restaurant: the store is resolved from the URL slug, and its branding, menu, opening hours,
order types and payment methods all come from the PayPoint integration API at request time.

Guests reach it by scanning a QR code at the table, or by opening the store's public link
for pickup and delivery.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 (strict) · Tailwind CSS v4 ·
shadcn/ui + Radix · Firebase Auth · Google Maps Platform

---

## Table of contents

- [How it works](#how-it-works)
- [Routes](#routes)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Store configuration contract](#store-configuration-contract)
- [Backend API surface](#backend-api-surface)
- [Client state and persistence](#client-state-and-persistence)
- [Internationalisation](#internationalisation)
- [Project structure](#project-structure)
- [Conventions](#conventions)
- [Deployment](#deployment)
- [Known gaps](#known-gaps)

---

## How it works

Everything hangs off one dynamic segment, `app/[slug]`. There is no root landing page — a
request without a store slug has no store to render.

```text
Guest scans QR  →  /pizzeria-roma?t=<table-token>
                        │
                        ▼
        Server Component resolves the store
        GET /integration/slugs/:slug?token=<t>
                        │
        ┌───────────────┴────────────────┐
        ▼                                ▼
   StoreProvider                    ThemeVars
   (brand, settings,           (writes --primary and
    postal rates,               --selected-text CSS
    tableInfo, keys)            variables at runtime)
                        │
                        ▼
              HomeScreen (client)
        GET /integration/menu  ── revalidate: 60
                        │
        menu → cart → checkout → confirmation
```

The store payload is fetched per request (`cache: 'no-store'`) but memoised for the
duration of that render with React `cache()`, so the layout, the page and
`generateMetadata` share a single network call.

### The dine-in table token

A QR code on the table carries `?t=<token>`. The token is passed to the store endpoint,
which resolves it into `tableInfo` (area, table id, table number). That token must survive
every navigation — losing it silently downgrades a dine-in session to an ordinary order, so
all in-app navigation goes through [`useStoreNavigation`](hooks/useStoreNavigation.ts),
which re-attaches `?t=` to each destination.

---

## Routes

| Route | Rendering | Purpose |
| --- | --- | --- |
| `/[slug]` | Server shell + client screen | Menu: hero, category nav, search, product modal, cart |
| `/[slug]/checkout` | Server shell + client screen | Customer details, order type, slot, voucher, payment, submit |
| `/[slug]/confirmation` | Server shell + client screen | Order reference, ETA, item recap, map |
| `/[slug]/error.tsx`, `loading.tsx`, `not-found.tsx` | — | Per-store boundaries |

There are no route handlers — the app talks to the PayPoint integration API directly.

Slugs that would collide with static assets (`favicon.ico`, `robots.txt`, `sitemap.xml`,
`favicon.png`) are rejected with `notFound()` via the `BLOCKEDSLUGS` guard in
[`app/[slug]/page.tsx`](app/[slug]/page.tsx).

---

## Getting started

### Prerequisites

- Node.js 20 or newer
- A running PayPoint API. In development the client targets
  `http://localhost:4000/integration`; in production it targets
  `https://api.paypointpos.de/integration`. The switch is on `NODE_ENV` — see
  [`lib/api.ts`](lib/api.ts).

### Install and run

```bash
npm install
npm run dev          # http://localhost:3000/<store-slug>
```

Create `.env.local` with the variable below, then open a store by slug, e.g.
`http://localhost:3000/demo-store`. A bare `/` has no route.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (`eslint-config-next`, flat config) |

---

## Configuration

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | yes | Loads the Maps JS SDK with the `places` library in [`app/[slug]/layout.tsx`](app/[slug]/layout.tsx). Restrict it by HTTP referrer. |

Stores additionally return their own `adminGoogleApiKey` / `posGoogleApiKey` in the store
payload; those are used for the per-store static map and geocoding.

### Remote image hosts

`next/image` only loads from hosts allow-listed in [`next.config.ts`](next.config.ts).
Adding a new asset bucket means adding it to `images.remotePatterns` — otherwise product
images silently fail to render.

---

## Architecture

### Data fetching

| Data | Where | Caching |
| --- | --- | --- |
| Store profile and settings | Server Component, `getStoreData()` | `no-store`, deduped per render via React `cache()` |
| Menu | Client, `fetchMenuData()` in `HomeScreen` | `next: { revalidate: 60 }` |
| Everything else (auth, vouchers, orders, favourites) | Client, on demand | `no-store` |

### Multi-tenancy

Every API call is scoped by three headers:

```text
x-api-key              shared integration key
x-paypoint-tenant-id   adminId  — the tenant that owns the store
x-paypoint-store-id    storeId  — the individual location
```

`adminId` and `storeId` are not known up front; they come back from the slug lookup and are
threaded through `StoreProvider` into every subsequent call.

### Theming

The `<html>` element is dark by default. Per-store brand colours arrive as
`settings.themeColors` and are written onto `document.documentElement` as CSS custom
properties by [`ThemeVars`](lib/ThemeVars.tsx):

```text
--primary          ← settings.themeColors.primaryColor
--selected-text    ← settings.themeColors.selectedTextColor
```

Tailwind v4 tokens in [`app/globals.css`](app/globals.css) consume those variables, so a
store rebrands without a rebuild.

### Order types

`pickup`, `delivery` and `dineIn`, gated by `settings.orderTypes`. Delivery adds:

- **[`ZoneCheckGate`](components/onboarding/ZoneCheckGate.tsx)** — a one-off onboarding
  sheet, shown per store when delivery is offered and no address has been picked yet. Uses
  Google Places autocomplete plus browser geolocation.
- **`postalRates`** — per postal code: delivery charge, minimum order value, delivery time
  and an optional priority tier. These drive the fee, the minimum-order guard and the ETA.

### Scheduling

All slot maths runs in `Europe/Berlin` via `moment-timezone`.
[`generateTimeSlotsWithinHours`](lib/generateTimeSlotsWithinHours.tsx) derives bookable
slots from the store's weekly opening hours; the chosen slot is persisted per store so it
survives the navigation from menu to checkout.

### Authentication

Phone-number sign-in. Firebase Auth (`RecaptchaVerifier` + `signInWithPhoneNumber`) issues
and verifies the OTP; the PayPoint API then issues the app-level session via `/user/login`
or `/user/register`. Checkout also supports a guest path that posts customer details
straight to `/login`.

The Firebase web config in [`lib/firebase.ts`](lib/firebase.ts) is client-side by design and
is not a secret.

---

## Store configuration contract

Shape returned by `GET /integration/slugs/:slug` and consumed as `IStoreInfo`
([`lib/types.ts`](lib/types.ts)). Behaviour driven by each field:

| Field | Effect on the UI |
| --- | --- |
| `settings.themeColors` | Brand colours injected as CSS variables |
| `settings.orderTypes` | Which of pickup / delivery / dine-in are offered |
| `settings.paymentMethods` | `cash` and `ecCardReader` (pay by card at the counter) |
| `settings.logo`, `logo` | Header brand mark, OG image |
| `timings` | Open/closed state, pre-order slot generation |
| `postalRates[]` | Delivery fee, minimum order, ETA, priority tier |
| `coordinates` | Static map on the confirmation screen |
| `tableInfo` | Populated only for a valid dine-in QR token |
| `adminId`, `storeId` | Tenant headers on every subsequent call |

---

## Backend API surface

All paths are relative to `API_BASE_URL` (`…/integration`).

| Method | Endpoint | Used by |
| --- | --- | --- |
| `GET` | `/slugs/:slug?token=` | Store resolution (server) |
| `GET` | `/menu` | Menu load |
| `POST` | `/order` | Order placement |
| `GET` | `/orders/:userId` | Order history panel |
| `POST` | `/login` | Guest checkout |
| `POST` | `/user/login`, `/user/register` | Phone sign-in and sign-up |
| `POST` | `/vouchers/apply` | Voucher redemption |
| `POST` | `/favorites/resolve`, `/favorites/sync`, `/favorites/merge` | Favourites |
| `POST` | `/recommendations/cart` | Co-purchase upsell in the cart |

**Favourites** are optimistic and offline-first: they live in `localStorage` as product-id
snapshots, are `resolve`d into full products for rendering, `sync`ed once the user is signed
in, and `merge`d with the server list on first login after guest browsing.

**Recommendations** degrade gracefully — a failed call returns `[]` and the cart falls back
to a plain slice of the menu.

**Voucher errors** are mapped from backend codes (`VOUCHER_NOT_FOUND`, `LIMIT_EXCEEDED`,
`MINIMUM_ORDER_VALUE_NOT_MET`, `CUSTOMER_NOT_FOUND`) to translated copy in
[`lib/errorMessges.ts`](lib/errorMessges.ts).

---

## Client state and persistence

Five React contexts wrap the tree, composed in
[`app/[slug]/layout.tsx`](app/[slug]/layout.tsx):

```text
LanguageProvider
└── UserProvider
    └── AddressProvider  (storeKey = slug)
        └── CartProvider (storeKey = slug)
            └── StoreProvider  (per route, server-injected)
```

| Key | Storage | Scope | Contents |
| --- | --- | --- | --- |
| `pos-cart:<slug>` | localStorage | per store | Cart lines, customisations, notes, voucher |
| `pos-address:<slug>` | localStorage | per store | Order type and delivery address |
| `pos-preorder:<slug>` | sessionStorage | per store | Selected pre-order slot |
| `pos-last-order:<slug>` | sessionStorage | per store | Snapshot read by the confirmation route |
| `user_session` | localStorage | global | Signed-in user |
| `favorites_v1` | localStorage | keyed by store | Favourite product snapshots |
| `app-language` | localStorage | global | `en` or `de` |

**Cart and address keys are deliberately scoped per store.** A single global key let a cart
from store A survive into store B, so checkout would post store B's `adminId` alongside
store A's product ids and the server rejected it with "Invalid product".

The confirmation screen is its own route and cannot read React state from checkout, which is
why the placed order is stashed in `sessionStorage` — that also makes it survive a refresh.

---

## Internationalisation

German (default) and English. Translations live in a single flat dictionary in
[`lib/i18n.ts`](lib/i18n.ts), typed as `Record<Language, Translations>` — a key missing from
either language is a compile error, not a runtime fallback. Consume it with `useLanguage()`:

```tsx
const { t, language, setLanguage } = useLanguage();
return <h2>{t.paymentMethod}</h2>;
```

Prices are formatted with `Intl.NumberFormat('de-DE', { currency: 'EUR' })` regardless of UI
language — the stores are German.

---

## Project structure

```text
app/
├── [slug]/                    Store-scoped routes
│   ├── layout.tsx             Fonts, Maps SDK, provider tree
│   ├── page.tsx               Menu
│   ├── checkout/page.tsx
│   ├── confirmation/page.tsx
│   └── error | loading | not-found
├── components/                Route-level screens (Home, Checkout, Confirmation)
└── globals.css                Tailwind v4 tokens and theme variables

components/
├── ui/                        shadcn/ui primitives (new-york, neutral)
├── menu/                      Header, hero, category nav, pre-order, info modals
├── Cart/                      Cart sheet, bottom bar, voucher section
├── checkout/                  Payment and voucher sheets
├── dialogs/                   Auth (phone + OTP), product, profile, address, favourites
├── Header/                    User drawer, order history panel
└── onboarding/                ZoneCheckGate — delivery zone check

contexts/                      store · cart · address · user · language
hooks/                         useStoreNavigation · useGoogleMaps · useScrollDetection
lib/                           API client, i18n, types, favourites, slots, maps, helpers
```

---

## Conventions

- **Path aliases** — `~/*` and `@/*` both resolve to the project root. They are
  interchangeable; both appear in the codebase.
- **Comments in English**, regardless of the German UI copy.
- **Non-obvious code carries a comment explaining *why*, not *what*.** The per-store cart
  key, the dine-in token propagation and the confirmation snapshot are all worth reading
  before changing.
- **Client components are explicit.** Anything touching `localStorage`, Google Maps or React
  state is `'use client'`; route files stay Server Components so the store payload is
  fetched once, server-side.
- **UI primitives come from shadcn/ui** (`components.json`, new-york style, `lucide` icons).
  Add new ones with the shadcn CLI rather than hand-rolling.
- **TypeScript is strict.** Prefer widening the API types in `lib/types.ts` over `any`.

---

## Deployment

A standard Next.js build; no custom server.

```bash
npm run build && npm start
```

Checklist before shipping a new environment:

1. Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, referrer-restricted to the deployment domain.
2. Add every image host to `images.remotePatterns` in `next.config.ts`.
3. Confirm the production API base URL in `lib/api.ts` matches the target backend.
4. Point the store's slug at the deployment and verify one QR token end to end.

---

## Known gaps

- **The integration API key is hardcoded** in `lib/api.ts` and ships to the browser. It
  should move to an environment variable, and ideally behind a server-side proxy route so it
  never reaches the client.
- **The API base URL is selected by `NODE_ENV`,** which makes staging environments awkward.
  An explicit `NEXT_PUBLIC_API_BASE_URL` would be better.
- **`lib/errorMessges.ts` is misspelled** (`errorMessges` → `errorMessages`).
