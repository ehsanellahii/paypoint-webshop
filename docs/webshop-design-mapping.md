# Webshop design → implementation mapping

A block-by-block comparison of the `Diazo Webshop` design prototype against the components
in this repository, written so the team can scope the remaining work without re-reading the
prototype.

**Design source:** `~/Downloads/webshop_and_app_designs/design/Diazo Webshop.dc.html`
(1 893 lines, dark theme, single-restaurant reference build) plus the handoff spec in
`README.md` / `CLAUDE.md` next to it.

**Implementation:** this repo — Next.js 16 App Router, React 19, Tailwind v4, shadcn/Radix,
`app/[slug]` per store.

---

## Table of contents

- [0. How to read the prototype](#0-how-to-read-the-prototype)
- [1. Verdict at a glance](#1-verdict-at-a-glance)
- [2. Design tokens](#2-design-tokens)
- [3. Layout system](#3-layout-system)
- [4. Auth screens](#4-auth-screens)
- [5. Shop shell — header](#5-shop-shell--header)
- [6. Menu screen](#6-menu-screen)
- [7. Product modal](#7-product-modal)
- [8. Cart modal](#8-cart-modal)
- [9. Checkout](#9-checkout)
- [10. Confirmation](#10-confirmation)
- [11. Secondary sheets and modals](#11-secondary-sheets-and-modals)
- [12. Account drawer](#12-account-drawer)
- [13. Global overlays](#13-global-overlays)
- [14. Data the design needs that the API does not return](#14-data-the-design-needs-that-the-api-does-not-return)
- [15. Prioritised gap backlog](#15-prioritised-gap-backlog)
- [16. Open questions](#16-open-questions)

---

## 0. How to read the prototype

The `.dc.html` file is a "Design Component": a declarative template plus a logic class,
rendered by the bundled `support.js` prototyping runtime. **Neither file ships.**

| Construct | Meaning |
| --- | --- |
| `{{ name }}` | value produced by the logic class' `renderVals()` |
| `<sc-if value="{{ flag }}">` | conditional block |
| `<sc-for list="{{ arr }}" as="item">` | list render |
| `style-hover` / `style-active` / `style-focus` | pseudo-state styles |
| `<helmet>` | head content: fonts, `@keyframes`, resets |

Styling is **100 % inline on purpose**. The `style="…"` strings are the spec — read them for
exact px, hex, radius and weight values. Named keyframes and the responsive media queries
live in the `<helmet><style>` block (lines 12–123).

Prototype component state lives in one object (line 1166). The keys that matter for
planning: `screen`, `cart`/`cartUnit`/`cartOpts`/`cartNotes`/`cartConfig`, `mode`,
`deliverySpeed`, `tipIdx`, `applied`, `preorderSlot`, `favs`, `acctView`, `orderMsg`.

> **Note on the handoff README.** Its "Colors — web shop (dark theme)" line
> (`#1c1c1e app bg · #232326 card`) does **not** match the prototype file, which uses
> `#141416` for the page and `#1c1c1e` for cards/dialogs. This repo followed the file, which
> is the correct source. Ignore that README line.

---

## 1. Verdict at a glance

The webshop is **not a greenfield build** — most of the prototype is already implemented.
`app/globals.css` carries the prototype's full `wz*` keyframe library and its surface
palette verbatim. What remains is a fidelity pass plus a handful of genuinely missing
features.

| Prototype block | Status | Owner component |
| --- | --- | --- |
| Login (split panel) | ⚠️ Different shape | `components/dialogs/Authentication/AuthenticationDialog.tsx` |
| OTP (split panel) | ⚠️ Different shape | `.../Authentication/LoginOTPStep.tsx` |
| Liefergebiet / zone check | ✅ Matches | `components/onboarding/ZoneCheckGate.tsx` |
| Shop header | ✅ Close | `components/menu/MenuHeader.tsx`, `menu/ShopHeaderMinimal.tsx` |
| Menu hero | ⚠️ Wrong image source | `components/menu/MenuHero.tsx` |
| Meta bar (mode, MBW, fee, details, preorder) | ✅ Close | `components/menu/MenuMetaBar.tsx` |
| Sticky category nav + scroll spy | ✅ Close | `components/menu/CategoryNavBar.tsx` |
| Product card | ✅ Matches (click behaviour is a decided departure) | `components/ProductCard.tsx` |
| Search + empty state | ✅ Matches | `app/components/HomeScreen.tsx` |
| Menu load error banner | ⚠️ Different treatment | `app/components/HomeScreen.tsx` |
| Product modal — base | ✅ Close | `components/dialogs/ProductModal.tsx` |
| Product modal — "Oft gekauft mit" | ❌ Missing | — |
| Product modal — "Produktinfo" accordion | ❌ Missing | — |
| Product modal — edit existing cart line | ❌ Missing | — |
| Cart modal | ✅ Rebuilt to the design | `components/Cart/Cart.tsx` |
| Cart — message for the restaurant | ✅ In the cart, shared with checkout | `contexts/cart-context.tsx` |
| Checkout | ✅ Matches (5 agreed departures) | `app/components/CheckoutScreen.tsx` |
| Confirmation + tracking | ✅ Close | `app/components/ConfirmationScreen.tsx` |
| Preorder modal | ✅ Matches | `components/menu/PreorderModal.tsx` |
| Restaurant info modal | ✅ Close | `components/menu/RestaurantInfoModal.tsx` |
| Order detail modal | ✅ Built as the design's modal | `components/Header/OrderDetailModal.tsx` |
| Address sheet (book + form) | ✅ Rebuilt to the design | `components/dialogs/DeliveryAddressModal.tsx` |
| Payment sheet | ✅ Close | `components/checkout/PaymentSheet.tsx` |
| Voucher sheet | ⚠️ No catalogue list | `components/checkout/VoucherSheet.tsx` |
| Voucher "activated" celebration | ❌ Missing | — |
| Placing loader | ✅ Matches | `app/components/CheckoutScreen.tsx` |
| Account drawer | ✅ Matches (3 agreed departures) | `components/Header/UserDrawer.tsx` |
| Add-to-cart toast + confetti | ✅ Matches | `components/menu/CartToast.tsx` |
| Mobile cart bar | ✅ Matches | `components/Cart/BottomBar.tsx` |
| Footer | ➕ Addition | `components/Footer.tsx` (prototype has none) |

Legend: ✅ implemented · ⚠️ implemented with a deviation · ❌ missing · ➕ not in the design

---

## 2. Design tokens

### 2.1 Already mapped in `app/globals.css`

| Prototype hex | CSS variable | Tailwind class |
| --- | --- | --- |
| `#141416` page background | `--background` | `bg-background` |
| `#1c1c1e` cards, dialogs, drawer | `--card` / `--popover` | `bg-card` |
| `#1f1f22` panels, rows, inputs | `--surface-1` | `bg-surface-1` |
| `#26262a` hover surface, suggestion list | `--surface-2` | `bg-surface-2` |
| `#2a2a2c` controls, icon tiles, chips | `--surface-3` | `bg-surface-3` |
| `#34363a` elevated hover, scrollbar thumb | `--elevated` | `bg-elevated` |
| `#8a8d93` muted text | `--muted-foreground` | `text-muted-foreground` |
| `#6b6d72` faint text | `--muted-foreground-2` | `text-muted-foreground-2` |
| `#46d17f` success / live states | `--success` | `text-success` |
| `#5fc163` brand green (logo) | `--brand-green` | `text-brand-green` |
| `#ec5b4f` brand red (logo) | `--brand-red` | `text-brand-red` |
| `#ff6b5e` danger, favourite heart | `--destructive` | `text-destructive` |
| `#ffb800` rating star | `--star` | `text-star` |
| `rgba(255,255,255,.08)` | `--border` | `border-border` |
| `rgba(255,255,255,.16)` | `--border-strong` | `border-border-strong` |

### 2.2 Secondary palette — now tokenised

These all now exist as CSS variables in `app/globals.css` (and as Tailwind utilities
via `@theme inline`), each carrying a comment naming its role in the prototype.

| Hex | Token | Role in the prototype |
| --- | --- | --- |
| `#e7e8ea` | `fg-strong` | item names in summaries, benefit rows |
| `#d6d8dc` | `fg-on-photo` | eyebrows and sub-lines over photos, product-modal info |
| `#cfd2d6` | `fg-on-photo-2` | wordmark separator, OTP hero copy |
| `#c4c6ca` | `fg-soft` | product-modal price |
| `#b9bbbf` | `fg-secondary` | inactive segment labels, summary values |
| `#a9adb3` | `fg-tertiary` | order-card summary, invite copy |
| `#9a9da3` | `fg-disabled` | disabled place-order label, empty-state icon |
| `#7a7d83` | `fg-disabled-2` | disabled save-address label |
| `#5c5e63` | `fg-hint` | "· optional" next to a section label |
| `#55575c` | `fg-faint` | chevrons, unselected radio ring, empty-state glyphs |
| `#232325` | `surface-hover` | ghost / outlined button hover, unselected day+time chips |
| `#2f3033` | `surface-selected` | selected radio and option rows |
| `#303034` | `surface-suggest` | autocomplete row hover |
| `#3a3a3e` / `#4a4a4f` | `control` / `control-hover` | search "clear" button, stepper minus |
| `#f0f0f2` | `control-light` | minus button inside a white stepper |
| `#3a3c40` | `track` | inactive progress-bar segments |
| `#45474b` | `outline-soft` | dashed borders (add address, referral code) |
| `#7fb2ff` | `link` | "Restaurantdetails" link **and the global focus ring** |
| `#ff8a7e` | `error-text` | inline field-error text |
| `#ff8a5c` | `warning` | menu-failure banner, recommendation price |
| `#e8859a` | `tip` | tip-thanks heart |
| `#ff5247` | `delete` | destructive row action |
| `#ef4444` | `live` | LIVE order badge |
| `#e8b24a` | `star-badge` | "Beliebt" star on a product card |
| `#f5b942` | `star-rating` | rating star in the restaurant-info modal |

Three distinct star colours exist in the prototype and are now distinct here too:
`star-badge` (`#e8b24a`), `star-rating` (`#f5b942`) and `star` (`#ffb800`, the benefit-row
star on the zone-check hero). They were previously collapsed onto `--star`.

### 2.3 Typography

Prototype loads **Plus Jakarta Sans** (400–800), **Baloo 2** (700/800), **Playfair Display**
(700–900), **Kaushan Script**. All four are wired up as `--font-sans` / `--font-display` /
`--font-serif` / `--font-script` — no gap.

Usage rules from the prototype:

| Face | Where |
| --- | --- |
| Plus Jakarta Sans | everything by default |
| Baloo 2, 800 | large display headings: "Zur Kasse", "Deine Bestellung", product-modal title, modal H2s |
| Playfair Display, 800 | auth split-panel marketing headline only |
| Kaushan Script | restaurant wordmark (header, hero, drawer watermark, avatar "Li") |

### 2.4 Focus ring — deviation

Prototype (line 122):

```css
button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible,
[tabindex]:focus-visible { outline: 2px solid #7fb2ff !important; outline-offset: 2px; border-radius: 4px; }
```

**Now matched.** The repo previously used `outline: 2px solid var(--color-primary)`, which lost
contrast on any store whose accent was white or a dark brand colour. It is back to the
prototype's fixed `var(--link)` (`#7fb2ff`), with `--primary` reserved for fills.

Text fields are excluded from the ring by design decision — every input in the shop sits
inside a bordered wrapper that carries the icon, so the focus state belongs on the wrapper
(`:focus-within`), not on the bare input.

---

## 3. Layout system

| Property | Prototype | This repo | Delta |
| --- | --- | --- | --- |
| Shell max width | `1560px` | `1320px` | 240px narrower |
| Page gutter | `32px` (`16px` ≤640, `12px` ≤560) | `px-4` / `md:px-8` (16 / 32) | matches below `md`, matches at `md`, but no 12px step |
| Checkout max width | `1100px` | `1100px` | ✅ |
| Confirmation max width | `1080px` | `1080px` | ✅ |
| Header height | `74px` | `74px` | ✅ |
| Category bar sticky offset | `top: 74px` | `top-[74px]` | ✅ |
| Section `scroll-margin-top` | `100px` desktop, `210px` ≤640 | `scroll-mt-[150px]` fixed | anchors land wrong on both sizes |
| Category click scroll offset | derived from the sticky stack | hard-coded `138` | drifts from the CSS above |
| Menu grid | `1fr 1fr`, collapses at `≤760px` | `grid-cols-1 sm:grid-cols-2` (640px) | collapses 120px too late |
| Card photo | 172×150 → 132×124 (≤1180) → 104×104 (≤980) → 116×116 (≤760) | 132×124 → 172×150 at `md` | two steps instead of four |
| Checkout column | `1fr 380px`, stacks ≤900 | `lg:grid-cols-[1fr_380px]` (1024) | stacks 124px early |
| Confirmation column | `1.5fr 1fr`, stacks ≤900 | `lg:grid-cols-[1.5fr_1fr]` | same |

The width question (1560 vs 1320) is the single most visible difference on a large monitor:
the prototype's menu grid is noticeably wider and the cards keep their 172px photos. Decide
this deliberately — it is one constant in four files
(`MenuHeader`, `ShopHeaderMinimal`, `CategoryNavBar`, `HomeScreen`, `MenuHero`,
`MenuMetaBar`, `Footer`).

---

## 4. Auth screens

### Prototype (lines 132–271)

Three full-page states inside one centred `max-width: 1060px` card, radius 28,
`grid-template-columns: 1.05fr 1fr`, collapsing to a single column at ≤760px (the hero panel
is hidden entirely).

**Left panel (identical in all three):** cover photo, `linear-gradient(180deg, rgba(15,15,17,.55), rgba(15,15,17,.82))`,
Kaushan wordmark + "PIZZA & PASTA" line, Playfair headline 38/800, then three benefit rows
(clock / leaf / star icons in 38px translucent tiles).

**Right panel:**

| State | Content |
| --- | --- |
| `isLogin` | H1 "welcome to {brand}", name input, phone input, primary CTA, "or" divider, outlined guest-checkout button, terms/privacy footnote |
| `isOtp` | back button top-left, "Bestätigungscode", masked number, 4 digit boxes with a blinking caret (`wzblink`), error chip, "Bestätigen" CTA with spinner |
| `isAddrCheck` | green "LIEFERUNG & ABHOLUNG" pill, "Liefern wir zu dir?", address input + Google suggestions, "Aktuellen Standort verwenden", then one of: success panel + "Weiter zum Menü", out-of-zone panel + "Andere Adresse prüfen"/"Anrufen"/"Trotzdem Webshop entdecken", or "Liefergebiet prüfen" |

### Implementation

- **Zone check** — `components/onboarding/ZoneCheckGate.tsx` reproduces the split panel
  faithfully: hero with script wordmark, Playfair headline, three benefit rows, green pill,
  60px search field, suggestion dropdown, "Aktuellen Standort verwenden". ✅
- **Login / OTP** — `AuthenticationDialog` is a **centred modal**, not a full-page split
  panel, and it is reached from the account drawer rather than gating the shop. The steps
  live in `LoginDetailsStep`, `LoginOTPStep`, `RegistrationDetailsStep`. Firebase issues the
  OTP; the prototype's `1234` demo code obviously does not apply.

### Delta

The prototype gates the shop behind login-or-guest; this repo lets everyone browse and only
asks for identity at checkout. **That is a product decision, not a fidelity bug** — a QR at
a table cannot demand a login. What is worth aligning is the *visual* treatment: if the
login modal is going to stay a modal, it should at least carry the hero panel, the Playfair
headline and the "Als Gast bestellen" affordance so it reads as the same product.

---

## 5. Shop shell — header

### Prototype (lines 274–294)

```
sticky, top 0, z 40
background rgba(20,20,22,.92), backdrop-filter blur(14px)
border-bottom 1px rgba(255,255,255,.07)
inner: max-width 1560, padding 0 32, height 74, gap 26
```

Children, left to right: brand block (Kaushan 25px + "PIZZA & PASTA" 8.5px/`.18em`) →
address pill (44px tall, radius 22, `#1f1f22`, 34px circular icon tile, hover `#34363a`) →
search field (flex 1, 44px, radius 13, `#1f1f22`, focus-within: white border +
`0 0 0 3px rgba(255,255,255,.12)`) → cart button (white, radius 13, black count pill,
"Bestellung ansehen", subtotal; hover lifts 2px with shadow) → profile button (44×44,
radius 13, bordered).

On checkout and confirmation the search and cart are replaced by a flex spacer.

### Implementation

`MenuHeader.tsx` for the menu route, `ShopHeaderMinimal.tsx` for checkout/confirmation —
which is exactly the prototype's two shapes. `BrandMark.tsx` renders the store logo plus the
script brand name.

### Deltas

1. **Max width** 1320 vs 1560, **gap** `gap-4` (16px) vs 26px.
2. **Brand tagline** is hard-coded `ONLINE · ORDER` in `BrandMark.tsx`. The prototype's
   the sub-brand line belongs to the reference client — a per-store field is the faithful
   answer; the current generic string is a stand-in but should be a decision, not an
   accident.
3. **Search focus state** — the prototype adds a 3px translucent ring on `:focus-within`
   plus turns the magnifier white. The repo only changes the border colour.
4. **Cart button** uses `bg-primary` with a black count pill. If a store's primary is dark,
   black-on-dark disappears. Consider `bg-selected-text`-driven contrast for the pill.
5. **Address pill** is hidden below `sm` in the repo; the prototype keeps it at ≤560px but
   lets it flex and truncate (`.wzaddrbtn` rules, lines 78–81). On a phone the prototype
   still shows the address — the repo drops it.

---

## 6. Menu screen

### 6.1 Hero (lines 307–317)

| Property | Prototype | Repo |
| --- | --- | --- |
| Height | `260px` (`196px` ≤640) | `h-[196px] sm:h-[260px]` ✅ |
| Radius | `24px` | `rounded-3xl` ✅ |
| Background | **cover photo**, `contrast(1.04) saturate(1.05) brightness(.9)` | **`settings.logo`**, `brightness(.55)` ❌ |
| Scrim | `rgba(15,15,17,.32)` | same ✅ |
| Open badge | translucent pill, 7px dot with `wzpulse` | same ✅ |
| Wordmark | Kaushan 62px (42 ≤640) | same ✅ |
| Sub-brand | "PIZZA & PASTA" Baloo 21px | ❌ dropped |
| Tagline | "Steinofen-Pizza · Pasta · Burger · Genter Str. 69" | address only |

**The hero image is the biggest single fidelity problem.** The store payload has no cover
image field, so `MenuHero` stretches the *logo* across a 260px banner and dims it to 55 % to
hide the distortion. A logo is a square mark on a transparent or white ground; a hero wants a
16:6 photograph. This needs a backend field (see [§14](#14-data-the-design-needs-that-the-api-does-not-return)).

### 6.2 Meta bar (lines 319–338)

Prototype row: order-type toggle (`#1f1f22` track, radius 24, 5px padding, labels carry the
ETA — "Lieferung 30–40 Min." / "Abholung 5–15 Min.") · "Bis 23:45 geöffnet" · "MBW: 12,00 €"
· scooter icon + fee · "Restaurantdetails" link in `#7fb2ff` · right-aligned preorder button
(42px, radius 21, bordered).

`MenuMetaBar.tsx` reproduces all of it, driven by `postalRates` and `timings`. Deltas:

- Toggle labels omit the ETA. The prototype puts the delivery time **in the button**, which
  is a meaningful piece of information at the top of the page. `rate.deliveryTime` is already
  available in the component.
- Toggle button height 38 vs the prototype's ~40 inside a 5px-padded 48px track.
- At ≤640 the prototype makes the toggle full-width with equal-flex buttons and moves the
  preorder button to `align-self: flex-start` (`.wzmetarow`, `.wztoggle`, `.wzpre` rules).
  The repo just wraps.

### 6.3 Category nav (lines 340–366)

Prototype: sticky at 74px, 60px tall, 6px gaps, chips with a per-chip computed style;
gradient fade + 30px circular arrow button on each side when scrollable; a **mobile-only
search row** below the chips (`.wzmobsearch`, shown ≤640 when the header search is hidden).
Scroll-spy runs on a 240 ms interval, picks the last `[data-cat]` whose top ≤150px, and
re-centres the active chip.

`CategoryNavBar.tsx` matches this closely — same sticky offset, same fade+arrow treatment,
same chip centring, same mobile search row. It uses an `IntersectionObserver`
(in `HomeScreen`, `rootMargin: '-140px 0px -60% 0px'`) instead of a polling loop, which is
better. Deltas: chip height 42 vs the prototype's computed value, and the scroll offsets
noted in [§3](#3-layout-system).

### 6.4 Product card (lines 385–407)

```
radius 18, background #1f1f22, border 1px rgba(255,255,255,.06), padding 16, gap 16
hover: translateY(-3px), bg #26262a, border rgba(255,255,255,.16), shadow 0 12px 28px rgba(0,0,0,.38)
photo: 172×150, radius 14, image scales to 1.09 on card hover
```

Left column: optional "Beliebt" row (`#e8b24a` star, 12/700) → name 16/700 clamped to 2 lines
→ description 13/500 `#8a8d93` clamped to 2 → footer row with price 16/800 and the favourite
heart. Right column: photo with an add button (36px white circle, 3px `#1f1f22` ring,
overhanging `-8px/-8px`) that becomes a quantity badge and then a stepper. Products without a
photo put the add control under the text instead.

`ProductCard.tsx` reproduces all of this — including the three add-button states, the
photo/no-photo split, the shimmer placeholder and `flyToCart`.

**Deltas:**

1. **Card click adds to cart instead of opening the modal.** The prototype binds the card to
   `p.open` (open the product modal) and only the small "+" button to `add`. This repo binds
   the card root to `quickAdd` ([`ProductCard.tsx:79`](../components/ProductCard.tsx#L79)),
   so tapping anywhere on the card — the name, the description, the photo — adds an item.
   Products with a required option group still route to the modal, but everything else is a
   one-tap add with no way to reach the product detail. This is the most consequential
   behavioural divergence in the whole shop.
2. **"Beliebt" is hard-coded and untranslated.** `const POPULAR = /margherita|salami|hawaii|cheeseburger|bestseller/i`
   matches product *names*, and the label renders the literal string `Popular` even in German
   — while `t.popular` ("Beliebt") already exists in `lib/i18n.ts`. Needs a real backend flag
   and the i18n key.
3. Star colour `text-star` (`#ffb800`) vs the prototype's `#e8b24a` on this specific badge.

### 6.5 Empty state and error banner

- **"Nichts gefunden"** (lines 412–419): 78px circle, 19/800 heading, body quoting the query,
  "Suche zurücksetzen" button. ✅ reproduced in `HomeScreen`.
- **Menu load failure** (lines 370–376): the prototype shows an *inline warning banner above a
  partial menu* — "Speisekarte konnte nicht geladen werden / Du siehst gerade nur eine
  Auswahl" with a "Neu laden" button. This repo replaces the whole page with a centred error
  and a retry button. The prototype's degrade-in-place is friendlier; the repo's is simpler.
  The repo *does* have a banner in this style for pruned cart items — the pattern already
  exists, it just is not used for menu failures.

---

## 7. Product modal

### Prototype (lines 780–879)

560px wide, `max-height: 88vh`, radius 24, `wzscalein .22s`. Photo band on a **white**
background, `background-size: contain`, height 340 → **220 at `max-height:760px` → 150 at
`max-height:600px`** (`.pmimg`).

Body order: title (Baloo 28/800) → price → *editing banner* → description info row →
`Größe` radio group with a white "Pflicht" badge → `Soßen · optional` (per-row +/stepper) →
`Extras · optional` (checkbox rows) → `Anmerkung · optional` textarea → **"Oft gekauft mit"**
2-column card grid → **"Produktinfo"** disclosure. Footer: quantity stepper + full-width
"Hinzufügen · €" button.

The "Produktinfo" disclosure expands to three labelled blocks: **GTIN**, **Zusatzstoffe**,
**Allergene** (the last one a list).

### Implementation

`ProductModal.tsx` covers the core faithfully and generalises it correctly: the prototype's
hard-coded `SIZES()` / `SAUCES()` / `EXTRAS()` become `product.addOns` groups, with
`isMultipleSelectionAllowed` choosing between radio rows and stepper rows, and
`minimumQuantity` / `maximumQuantity` driving the "Pflicht" badge, the "Wähle genau N" hint,
validation and scroll-to-first-error. That is a better design than the prototype's fixed
three sections.

### Deltas

| Gap | Detail |
| --- | --- |
| ❌ "Oft gekauft mit" | The prototype upsells inside the product modal with a 2-up card grid (118px photo, "Beliebt" tag, corner add button, price above name, "Produktinfo" link). The repo only upsells in the cart. `fetchCartRecommendations` already exists and could be called with a single product id. |
| ❌ "Produktinfo" accordion | GTIN / Zusatzstoffe / Allergene. Legally relevant in DE for packaged goods and allergens. No backing fields today. |
| ❌ Edit an existing cart line | The prototype stores `cartConfig[id]` and reopens the modal pre-filled (`mEditId`), showing "Du bearbeitest gerade deine bestehende Auswahl." Today a customised line can only be deleted and re-added. |
| ⚠️ Photo height | Fixed `h-[340px]`. On a 700px-tall laptop viewport the prototype shrinks it to 220 so the options stay visible without scrolling. Worth adding — it is two `max-height` media queries. |
| ⚠️ Price display | The prototype shows the base price under the title and the computed total only on the CTA. Same here. ✅ |

---

## 8. Cart modal

### Prototype (lines 715–778)

600px, `max-height: 90vh`, radius 24. Header "Deine Bestellung" (Baloo 30/800). Rows: 58px
image, name 16/700, `descShort`, line total 15/800, optional italic note, and a stepper in a
`#2a2a2c` pill on the right; rows highlight on hover (`.wzrow`).

Then **"Für dich empfohlen"** — a horizontal strip of 170px cards with a zoom-on-hover photo
and a corner add button.

Footer, in two stacked blocks:
1. **"Nachricht für das Restaurant"** — a collapsed row showing a preview and an
   "Hinzufügen"/"Bearbeiten" button, expanding to a textarea with a "Speichern" button.
2. The checkout CTA: count pill + "Zur Kasse gehen" + **subtotal**, with a loading spinner
   state.

There is no totals block in the prototype cart.

### Implementation

`Cart/Cart.tsx` matches the structure, including the server-backed recommendations with a
menu-slice fallback and the "requires modal" guard on quick-add.

### Status — rebuilt to match

The dialog now follows the prototype block for block: 600px / `max-height: 90vh`, the Baloo
30/800 "Deine Bestellung" heading, 58px thumbnails, the `#2a2a2c` stepper pill, the
row hover highlight, the 170px recommendation strip with its zoom-on-hover photo, the
collapsed **"Nachricht für das Restaurant"** row and the count-pill CTA carrying the
subtotal.

Two deliberate departures, both because the repo has real data the prototype's mock lacked:

1. **Line subtitle** — the prototype prints a truncated product description. Here a line
   with chosen options lists them (`Extra Käse · Knoblauch-Dip`) and falls back to the
   description when there are none.
2. **Recommendations** come from `/recommendations/cart`, with a menu slice as fallback, and
   anything with a required option group opens the product modal instead of quick-adding.

**The totals block is gone**, per the design: the cart shows the subtotal on the CTA and
nothing else. The delivery fee and grand total now appear for the first time at checkout.
That is what the prototype does — flag it if the fee should surface earlier.

The order message lives in `CartProvider` (`orderMessage` / `setOrderMessage`, persisted at
`pos-order-message:<slug>`), so the cart writes it and checkout submits it as
`instructions`.

---

## 9. Checkout

### Prototype (lines 424–539)

**Hero:** 216px, cover photo at 62 % scrim, decorative concentric circles and a large
outlined scooter glyph at 16 % opacity, back pill top-left, uppercase eyebrow
"BESTELLUNG ABSCHLIESSEN", "Zur Kasse" in Baloo `clamp(30px, 9vw, 46px)`, then
the store name and address.

**Left column:** mode toggle → address card (140px static map + tappable row with an optional
label chip) → "Klingelname (Pflichtfeld)" → "Rückrufnummer (Pflichtfeld)" → driver-note
textarea → **Lieferzeit**: Standard / Priority (+1,99 €, lightning glyph) / Vorbestellen
(chevron, opens the modal) → **Zahlungsmethode** row → voucher row → **Trinkgeld** chips with
a "thanks" line.

**Right column:** sticky at `top: 98px`, "Bestellübersicht", scrollable item list capped at
`30vh`, then Zwischensumme / Liefergebühr (green "Gratis") / Priority / Trinkgeld / Gutschein,
an 18/800 total row, the place-order button, and an inline hint.

### Implementation

`CheckoutScreen.tsx` is a superset. Everything above exists, driven by `postalRates`
(`deliveryCharges`, `deliveryTime`, `minimumOrderAmount`, `priorityDeliveryCharges`,
`priorityDeliveryTime`), plus:

- a "Your details" card (name / email / phone) the prototype does not have — required by the
  `/login` guest call;
- dine-in handling (`tableInfo`), which hides the mode toggle, timing and tip entirely;
- minimum-order and out-of-zone guards folded into the CTA label;
- `moment-timezone` slot maths for pre-orders in `Europe/Berlin`.

### Deltas

The hero now carries the prototype's decorative layer (two hairline `rgba(255,255,255,.05)`
circles and the outlined scooter at 16 % opacity), the form is a column of standalone rows
rather than a bordered "your details" card, the columns stack at the prototype's 900px rather
than Tailwind's 1024, and the summary sticks at `top: 98px`.

**Remaining departures** (decided, do not revert):

| Item | Prototype | Here | Why |
| --- | --- | --- | --- |
| Hero image | cover photo | `settings.logo`, dimmed | No cover field on the store — see §14 |
| Name + email rows | absent | present | `/login` needs them to create the guest customer |
| Rückrufnummer | its own row | the phone row serves both | One number, asked once |
| Tip values | derived from the subtotal | fixed `0 / 1 / 2 / 3 €` | Needs a rule from the client |
| Restaurant message | in the cart | in the cart ✅ | Was duplicated on checkout; removed here |

---

## 10. Confirmation

### Prototype (lines 541–618)

Back button → success hero (84px double-ring, 54px green disc with `wzpop`, "Bestellung
bestätigt", sub-line) → two columns (`1.5fr 1fr`):

- **Left:** 260px route map with a live pill, ETA block (13/600 label + 30/800 value), a
  three-segment progress bar with `Zubereitung / … / …` labels, a "Kurier wird zugeteilt"
  spinner row (delivery only), a 2×2 grid of fact tiles (Bestellnummer / Geliefert an /
  Zahlung) and a "Problem mit der Bestellung?" row.
- **Right:** sticky order summary with 42px thumbnails, total, and "Zur Startseite".

### Implementation

`ConfirmationScreen.tsx` matches this block for block, and adds: a real store→customer route
line via `buildRouteMap`, reuse of the same screen for viewing *past* orders (`status` →
`getStatusMeta`), and scheduled-order labelling. The order is read from `sessionStorage`
(`pos-last-order:<slug>`) because confirmation is its own route.

**Deltas:** map height 240 vs 260; only three fact tiles rendered in a `sm:grid-cols-2` grid
(the prototype's fourth cell is empty too, so this is fine); the support row opens the
account drawer instead of a dedicated view.

---

## 11. Secondary sheets and modals

| Sheet | Prototype | Implementation | Delta |
| --- | --- | --- | --- |
| **Preorder** (620–641) | 500px, day chips in a horizontal scroller, time chips in a `max-height:150px` wrap, confirm CTA | `PreorderModal.tsx`, slots from `generateTimeSlotsWithinHours` | ✅ |
| **Restaurant info** (643–680) | 520px; logo + name + "Pizza · Pasta · Burger · €€"; rating · Lieferzeit · MBW; opening-hours table; address & phone tiles; description paragraph | `RestaurantInfoModal.tsx` | Rating `4,8 (820+)` and "30–40 Min." are **hard-coded**; no price level; no description paragraph; MBW row missing |
| **Order detail** (682–713) | 480px modal: header with status pill, line items, total, "Geliefert an", "Erneut bestellen" | `OrderDetailModal.tsx` | ✅ Matches. Opens from the drawer list instead of navigating to the confirmation route. |
| **Address sheet** (881–943) | 480px, two modes: **list** (saved addresses, radio, delete, "Neue Adresse hinzufügen") and **form** (autocomplete, out-of-zone panel with "Zur Abholung wechseln" + "Anrufen", label chips "Zuhause/Arbeit/…", Zurück/Speichern) | `DeliveryAddressModal.tsx` | ✅ Rebuilt to match. The address book is `localStorage`-backed via `AddressProvider` (`savedAddresses` / `saveAddress` / `removeSavedAddress`) — per browser, not per account. |
| **Payment** (945–957) | 440px radio list with icon tiles, name + sub-line | `PaymentSheet.tsx` | ✅ (2 methods vs the prototype's 4 — driven by `settings.paymentMethods`, correct) |
| **Voucher** (959–979) | 460px: applied-voucher card with a green border, code input + "Einlösen", then a **catalogue of available vouchers** with a 48px value tile | `VoucherSheet.tsx` → `VoucherSection.tsx` | No catalogue list — code entry only. Needs a "list vouchers" endpoint. |
| **Voucher flash** (981–993) | Full-screen celebration: 92px green disc, falling confetti, "Gutschein aktiviert!", "Code X · Y gespart" | — | ❌ Missing |
| **Placing loader** (995–1001) | Full-screen scrim, 52px spinner, "Bestellung wird aufgegeben…" | `CheckoutScreen.tsx` | ✅ |

The address sheet is the largest single regression. The prototype's out-of-zone panel in
particular is a conversion feature: rather than dead-ending, it offers pickup or a phone
call. `ZoneCheckGate` has that logic for onboarding — it is only the in-flow sheet that lacks
it.

---

## 12. Account drawer

Prototype (lines 1003–1135): 400px right drawer, `wzdrawer .28s`, 150px header filled with a
**rotated repeating brand watermark at 5 % opacity**, and five views switched by `acctView` —
`home`, `favorites`, `orders`, `invite`, `support`, `lang`.

`UserDrawer.tsx` reproduces the drawer, the watermark (48 tiles, `-rotate-12`, `text-white/[0.05]`),
the guest-vs-member split, the three quick-action tiles with the pulsing LIVE badge, the
Hilfe / Rechtliches / Konto groups, and the favourites / orders / invite / language views.

The `support` view now exists here too (hours line, "Anrufen" with the
`rgba(70,209,127,.14)` icon tile, "E-Mail schreiben"), the header gradient reaches
transparent at 40 %, the scroll pane uses `.thinbar`, and the Help/Legal rows carry no hover
— all matching the prototype.

**Agreed departures** (decided, do not revert):

| Item | Design | Here | Why |
| --- | --- | --- | --- |
| Footer | "Version 2.4.1" + logo tile | "Powered by PayPoint" link | Branding decision, not a design one |
| Profile row | absent | present, above "Abmelden" | Removing it leaves no route to `ProfileDialog` |
| Stacking | drawer at z-65/66 | z-50 | Favorites opens `ProductModal` (z-60); at z-66 the drawer would cover it |

Legal rows (Datenschutz / AGB / Impressum) just close the drawer in both — still stubs.

---

## 13. Global overlays

- **Add-to-cart toast** (1137–1160): 320px card, bottom 28px, 46px thumbnail with a white
  check badge, "Hinzugefügt" + product name, plus six confetti particles animating on
  `wzconf`. `CartToast.tsx` matches it particle for particle, and carries a useful comment
  about why it centres with auto margins rather than `translateX(-50%)` (the `.anim-fade`
  keyframe ends on `transform: none` and would discard the offset).
- **Body scroll lock**: prototype toggles `body.wz-noscroll` whenever any overlay is open.
  The repo defines `body.overlay-open` in `globals.css` — **but nothing sets it**; scroll lock
  currently relies on Radix/Base UI per-dialog behaviour. Worth deleting the dead class or
  wiring it up.
- **Escape handling**: the prototype has one keydown listener that closes overlays in a
  defined priority order. The repo delegates to each dialog primitive, which is fine, except
  `UserDrawer` hand-rolls its own.
- **Skip link**: the prototype has "Zum Inhalt springen" (line 130) targeting `#wzmain`.
  The repo has `role='main'` but **no skip link**. Small accessibility gap.

---

## 14. Data the design needs that the API does not return

This is the real blocker list — several "missing" UI features are missing because there is
nothing to render.

| Field | Needed by | Today |
| --- | --- | --- |
| Store **cover / hero image** | menu hero, checkout hero, auth panel | `settings.logo` stretched and dimmed |
| Store **rating + review count** | restaurant info modal, prototype hero | hard-coded `4.8 (820+)` |
| Store **price level** (`€€`) | restaurant info modal | absent |
| Store **short description** | restaurant info modal, hero tagline | absent |
| Store **sub-brand line** | brand mark ("PIZZA & PASTA") | hard-coded `ONLINE · ORDER` |
| Product **`isPopular`** | "Beliebt" badge | regex over product names |
| Product **GTIN** | product-info accordion | absent |
| Product **additives** (`Zusatzstoffe`) | product-info accordion | absent |
| Product **allergens** | product-info accordion | absent — **legally relevant in DE** |
| **Voucher catalogue** endpoint | voucher sheet list | code entry only |
| Saved **address book** (+ labels) | address sheet list mode | single address in `localStorage` |

`lib/types.ts` line 48 already carries a commented-out `popular_order` — the backend may
have part of this.

---

## 15. Prioritised gap backlog

### Done

- Orders list and single-order detail matched: the drawer list now splits into "Aktiv" and
  "Frühere Bestellungen" with the design's live-order card and empty state, and the detail is
  the prototype's 480px modal (`OrderDetailModal`) rather than a route change.
- Checkout matched to the design: hero decorative layer, standalone form rows in place of the
  details card, 900px stack point, `top: 98px` sticky summary, message row removed (the cart
  owns it now). Departures recorded in §9.
- Login / OTP rebuilt as the prototype's 1060px split-panel auth card, with a shared
  `AuthHero`. Sign-in now collects a name and posts it to `/user/login`.
- Account drawer matched to the design: dedicated support view, 40 % gradient stop,
  `.thinbar` scroll pane, no row hover. Three departures agreed and recorded in §12.
- Cart dialog rebuilt to the design, including the in-cart restaurant message (was P2.13).
- Address sheet rebuilt to the design, including the address book and the out-of-zone
  recovery panel (was P1.5 + P2.6).
- Colour sweep: the whole secondary palette tokenised from the prototype's inline styles,
  and the drift fixed — the two star colours, the `#2f3033` selected-row background, the
  `#232325` ghost hover, the `#b9bbbf` inactive segment labels, the `#ff8a5c` recommendation
  price, the `#ff6b5e` payment-error border, the `#7a7d83` disabled save label and the
  `rgba(255,255,255,.06)` category-chip hover (was P1.3 + P3.21).
- Focus ring restored to the prototype's fixed `#7fb2ff`; text fields excluded from it by
  decision, since their focus state belongs on the wrapper.

Store accents still win where a store sets them: `--primary` / `--selected-text` fall back to
the prototype's `#fff` / `#000` and are only overridden by `ThemeVars` when
`settings.themeColors` provides a value.


### P1 — behaviour and correctness

2. **Localise the "Beliebt" badge** — use `t.popular`, which already exists. *~10 min.*
3. **Restore the `#7fb2ff` focus ring**; keep `--primary` for fills. *~10 min.*
4. **Fix the scroll-anchor offsets** — `scroll-mt` and the `CategoryNavBar` scroll offset
   should derive from the same sticky stack (74 + 60 header, +mobile search row). *~1 h.*
5. **Address sheet: out-of-zone recovery panel** ("Zur Abholung wechseln" / "Anrufen").
   *~2 h.*

### P2 — missing features

6. **Address book in the address sheet** — saved list, radio select, delete, label chips.
   Needs a storage decision (local vs `/user/addresses`). *~1–2 d.*
7. **Product modal "Oft gekauft mit"** — reuse `fetchCartRecommendations` with a single id.
   *~0.5 d.*
8. **Edit an existing customised cart line** — reopen the modal pre-filled, replace the line.
   *~0.5–1 d.*
9. **Voucher catalogue list** in the voucher sheet — blocked on a backend endpoint. *~0.5 d
   after the API.*
10. **Voucher "activated" celebration overlay.** Pure front-end, `wzconf` already exists.
    *~2 h.*
11. **Product-info accordion** (GTIN / Zusatzstoffe / Allergene) — blocked on product fields.
    *~0.5 d after the API.*
12. **Menu-failure banner over a partial menu** instead of a full-page error. *~2 h.*
13. **Restaurant-message row inside the cart** (in addition to, or instead of, checkout).
    *~2 h.*

### P3 — fidelity polish

14. Shell max width 1320 → **1560** (decision first). *~1 h.*
15. Product-modal photo `max-height` breakpoints (340 / 220 / 150). *~15 min.*
16. Card photo responsive steps (172×150 / 132×124 / 104×104 / 116×116). *~30 min.*
17. Menu grid collapse at 760px rather than 640px. *~10 min.*
18. Delivery/pickup toggle labels should carry the ETA. *~30 min.*
19. Header search `:focus-within` ring; address pill visible on mobile. *~30 min.*
20. Cart row hover highlight; checkout sticky offset 98px. *~20 min.*
21. Promote the recurring raw hexes in [§2.2](#22-used-in-the-prototype-but-still-raw-hex-in-components)
    to tokens. *~2 h.*
22. Add the "Zum Inhalt springen" skip link; remove or wire up the dead `body.overlay-open`.
    *~30 min.*

### P4 — product decisions, not bugs

0. **Product card click adds to cart** rather than opening the modal, where the design opens
   the modal. **Decided: keep the current behaviour.** Quick-add from the card is the faster
   path for a menu of simple items; anything with a required option group still routes to the
   modal. Do not "fix" this back.

23. Login/OTP as a full-page split panel vs the current modal.
24. Whether the shop gates on login-or-guest at all (it must not, for dine-in QR).
25. Whether the cart CTA shows subtotal (prototype) or grand total (current).

---

## 16. Open questions

1. **Cover images.** Will the backend expose a store cover photo? Without one the hero is
   a stretched logo on every tenant. This is the highest-impact visual fix available.
2. **Rating and review count.** Real data, a static per-store value in the admin, or drop
   the row from the info modal? It is currently a hard-coded `4.8 (820+)` presented as fact,
   which is a claim we should not ship.
3. **Allergens and additives.** Legally sensitive in Germany. Is anyone modelling these on
   the product side, and is the webshop expected to display them?
4. **Address book.** Server-side per user, or local per browser? The prototype's list mode,
   labels and delete only make sense with persistence.
5. **Voucher catalogue.** Is there an endpoint that lists a store's active vouchers, or does
   the customer always have to know the code?
6. **Brand sub-line.** The prototype's sub-brand line belongs to the reference client.
   Should this be a per-store field, or does the generic fallback stay?
7. **Shell width.** 1560 (design) or 1320 (current)? Affects the menu grid density on
   desktop.
