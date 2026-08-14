# New webshop design → implementation mapping

First pass over the `new_webshop_design` handover, written to answer one question: what does
this change for the code we already have?

**Design source:** `~/Downloads/new_webshop_design`. The handover is a single-restaurant
reference build; **our shop is multi-tenant**, so every brand name, address, delivery radius,
postal-code list and menu in it is sample data. Read it for layout, spacing and behaviour —
never carry its content across. Everything visible comes from the store payload
(`settings`, `brandName`, `timings`, `postalRates`) exactly as it does today.

The reference deployment supports `?view=desktop` / `?view=mobile` to force a version.

**Supersedes** [webshop-design-mapping.md](webshop-design-mapping.md) for the *mobile* side.
The desktop side is an evolution of that document, not a replacement — see §2.

---

## 0. The package, and how to read it

| File | What it is |
| --- | --- |
| `index.html` (884 KB) | **Desktop app**, complete |
| `mobile.html` (1.7 MB) | **Mobile app**, complete — a different application |
| `menu-data.json` | 14 categories, 67 items. Loaded by both via `fetch()` |
| `img/artikel/*.jpg` | 60 product photos, 800×800, named by item id (`i0.jpg`) |
| `img/logo.png`, `img/cover.jpg` | Brand logo (250×224) and cover (1200×675) |
| `netlify/edge-functions/device.ts` | User-Agent switch: phone → `mobile.html`, else `index.html` |
| `standalone/*.html` | Same two apps with every asset inlined (~10 MB each), for review only |
| `HANDOVER-DEVELOPER.html` | The spec. Read it first |

### Decoding

`node scripts/decode-design.mjs ~/Downloads/new_webshop_design` writes readable copies to
`.design-decoded/` (gitignored). The rest of this section explains what it does.

Neither HTML file is readable as-is. Each is a **bundler output**: the application is a
single JSON string inside `<script type="__bundler/template">`, next to a base64 asset map
(gzipped JS, woff2 fonts, and — in the standalone builds — the images).

```python
import re, json
src = open('index.html', encoding='utf-8').read()
tpl = re.search(r'<script type="__bundler/template">(.*?)</script>', src, re.S).group(1)
html = json.loads(tpl)          # ← the real markup
```

Decoded sizes: desktop 279,896 chars / 2,276 lines; mobile 281,542 chars / 2,829 lines.

The template constructs are the same family as the previous handoff — `<sc-if>`, `<sc-for>`,
`{{ }}`, `style-hover` / `style-active`, styling 100 % inline — with one new quirk: **SVG
attributes are camel-escaped**, so `viewBox` appears as `sc-camel-view-box` and `onClick` as
`sc-camel-on-click`. Normalise those before reading.

> **Editing warning from the handover:** if anyone edits inside the template string, newlines
> must stay escaped as `\n`, `</` must stay escaped, and the result must still parse as JSON —
> otherwise the app fails to boot.

---

## 1. The one fact that drives everything

> *"mobile.html (phones) and index.html (desktop) are two completely independent applications
> – this is NOT responsive design and they share no code."* — HANDOVER-DEVELOPER, §2

They share only `menu-data.json` and `img/`. They have different palettes, different screen
models, different navigation, and different pickers. The handover states the divergence in
the delivery-time picker is deliberate: *"Mobile = iOS-style scroll wheel; Desktop =
intentionally a different picker (day chips + time input), because it works better with a
mouse. This difference is by design, not a bug."*

Our implementation is a **single responsive Next.js app**. That is the central architectural
question this handover raises — see §4.

---

## 2. Desktop — an evolution, mostly already built

The desktop app keeps the previous structure section for section, and **keeps the previous
palette** (`#1c1c1e` / `#1f1f22` / `#2a2a2c` / `#26262a` / `#34363a`). It contains no trace of
the new Wolt colours. Confirmed as intentional: desktop received light touch-ups, mobile got
the work.

Section-by-section size delta against the design we implemented:

| Section | Old | New | Δ |
| --- | ---: | ---: | ---: |
| PAYMENT SHEET | 1,997 | 6,872 | **+4,875** |
| TOAST (trailing block) | 78,455 | 79,928 | +1,473 |
| PREORDER MODAL | 2,653 | 3,700 | **+1,047** |
| CONFIRM | 9,596 | 10,296 | **+700** |
| MENU | 22,261 | 22,623 | +362 |
| ADDRESS SHEET | 9,503 | 9,809 | +306 |
| PRODUCT MODAL | 12,790 | 13,070 | +280 |
| CART MODAL | 9,005 | 9,179 | +174 |
| VOUCHER SHEET | 4,431 | 4,575 | +144 |
| RESTAURANT INFO | 4,510 | 4,591 | +81 |
| CHECKOUT | 17,754 | 17,747 | −7 |
| ORDER DETAIL | 4,555 | 4,425 | −130 |
| ACCOUNT DRAWER | 29,467 | 29,010 | −457 |
| AUTH | 28,391 | 27,161 | −1,230 |
| PLACING LOADER | 562 | 562 | 0 |

Most of the small deltas are branding swaps and decode noise. The **real** changes:

### 2.1 Payment sheet — redesigned ❗

Was a radio list of methods. Now a Wolt-style sheet in two groups:

- **Cards group** — `payCards`, each row a 46×32 brand tile (`{{ po.tileBg }}`) with the
  real brand mark (VISA in `#1a1f71`, Apple Pay, EC in `#004a93`, PayPal in `#003087`/`#009cde`,
  Klarna in `#0a0b09`), name 15/700, optional sub 12.5/500 — then an **add-card** row with a
  `+` tile.
- **Other methods group** — `payOthers`, same row shape (Apple Pay, cash, EC/girocard,
  PayPal, Klarna).
- Selection is a **green `#46d17f` check mark**, not a radio dot.
- Rows are borderless — `padding: 12px 4px`, transparent background.

Our [PaymentSheet.tsx](../components/checkout/PaymentSheet.tsx) is the old radio list with two
methods. This is the single biggest desktop rebuild.

### 2.2 Pre-order modal — time chips → time input

The wrap of time chips is replaced by a **58px input row** (radius 16, `#141416`,
1.5px border on `{{ poTimeBorder }}`) with a clock icon, and the time label now carries the
store's opening-hours range on the right (12/600 `#6b6d72`). Day chips stay.

### 2.3 Confirmation — success hero → receipt header

The centred 84px green disc and "Bestellung bestätigt" are replaced by a **`wzconfhead`
receipt-style header**: a green "accepted" status pill (`rgba(70,209,127,.12)` on a
`rgba(70,209,127,.3)` border, 11.5/800, `.06em`, `#7fd083`) in a two-column row with a
`rgba(255,255,255,.08)` bottom border.

### 2.4 Layout — wider, with a 3-column tier

`max-width` goes **1560px → `min(2160px, 100%)`** in all five shell places, and a new
breakpoint appears:

```css
@media (min-width: 1700px) {
  .menugrid { grid-template-columns: 1fr 1fr 1fr !important; }
  .wzpad    { padding-left: 48px !important; padding-right: 48px !important; }
}
```

So the menu grid is 1 / 2 / **3** columns. We currently cap the shell at **1320px** with a
fixed 2-column grid — two steps behind.

### 2.5 Branding — image logo replaces the typographic wordmark

Both the auth hero and the menu hero drop the Kaushan script wordmark + "PIZZA & PASTA"
sub-brand in favour of the store logo (76px tall, radius 14) — for us, `settings.logo`. The
auth headline becomes a per-store tagline. The auth cover switches to
`background-size: 100% auto; background-position: center top; no-repeat`.

This retires the `BrandMark` script-font treatment and the hard-coded `ONLINE · ORDER`
tagline — the store logo becomes the brand mark everywhere.

---

## 3. Mobile — a new application

Not a narrow desktop. It is the **mobile-app design language** from the very first handoff
(`dz*` keyframes, phone-frame prototype chrome, `data-screen-label` screens), rebuilt for
this handover.

### 3.1 New palette — nothing in common with desktop

| Hex | Uses | Role |
| --- | ---: | --- |
| `#0c0f1c` | 56 | page background |
| `#191c2e` | 72 | cards |
| `#151827` / `#111424` / `#171a2b` | 19 | surface elevations |
| `#22263c` / `#262b42` | 11 | raised rows |
| `#303650` / `#3d4360` | 27 | borders, controls |
| `#06131f` | 13 | deep / inset |
| `#8ad0f2` | 17 | **CTA blue** |
| `#46d17f` | 17 | success, selection check |
| `#ff6b5e` / `#ff8a7e` | 23 | danger / error text |
| `#8a8d93` `#6b6d72` `#b9bbbf` `#a9adb3` `#e7e8ea` `#cfd0d4` `#9596b4` | — | text ramp |

Desktop keeps white CTAs on near-black greys; mobile is navy with a light-blue CTA. **These
are two palettes, not one theme with variants.**

### 3.2 Screens

Full-screen routes via `data-screen-label`, not modals:

Splash → login → OTP → delivery-zone check → menu → product → cart → checkout →
confirmation, plus favorites, orders, vouchers and invite.

Note what this means structurally: on desktop, favorites / orders / vouchers / invite are
**views inside the account drawer**. On mobile they are **top-level screens**. Same for the
cart and product — modals on desktop, screens on mobile.

### 3.3 Distinctive mobile components

- **Splash screen** — no desktop equivalent.
- **Delivery-time wheel picker** — `#wheelday` / `#wheeltime`, two columns (day `flex: 1.3`),
  220px tall, `scroll-snap-type: y mandatory`, `padding: 88px 0`, with a fixed 44px
  `rgba(255,255,255,.07)` highlight band centred at 50 %. An iOS-style wheel, not a select.
- **Shared status bar** — a faux phone status bar across screens.
- **Motion library** — `dzpop dzspin dzpulse dzfade dzblink dzradar dzbob dzburst dzconf
  dzslideup dzslidedown dzemerge dzlive dztoast dzremove dzshakeA dzshakeB`. Our
  `globals.css` carries the desktop `wz*` set; this is a second, overlapping-but-different
  library.

### 3.4 Navigation model — a hub, not a tab bar

There is **no bottom tab bar** (`dznav`, `tabbar`, `position:fixed;bottom` — none present).
Navigation is a screen stack over one `screen` state, and the menu is the hub: of the 17
`setState({ screen: … })` calls, **8 return to `menu`**. Every other screen is pushed on top
and comes back.

That maps cleanly onto routes, which is what I'd recommend over in-page state — a phone user
expects the Android back button and the iOS swipe-back to work, and a screen stack held only
in React state breaks both:

| Screen | Route | Design label |
| --- | --- | --- |
| Menu (hub) | `/[slug]` — exists | `Menü` |
| Product | `/[slug]/product/[id]` — new | `Produkt` |
| Cart | `/[slug]/cart` — new | `Warenkorb` |
| Checkout | `/[slug]/checkout` — exists | `Checkout` |
| Confirmation | `/[slug]/confirmation` — exists | `Bestätigung` |
| Favorites · Orders · Vouchers · Invite | `/[slug]/account/*` — new | `Favoriten` · `Bestellungen` · `Gutscheine` · `Einladen` |
| Splash · Login · OTP · Delivery-zone check | gates over `/[slug]`, not routes | `Splash` · `Login` · `OTP` · `Liefergebiet` |

The design's `data-screen-label` values are German because the reference client's UI is
German. **Our components, routes, props and comments stay English** — customer-facing German
lives in `lib/i18n.ts` like every other string.

Desktop keeps product and cart as modals on `/[slug]` — same routes, different presentation,
which is exactly what the device split is for.

### 3.5 Prototype chrome that must not ship

**The "SHARED STATUS BAR" is not app UI.** It is `class="dzfake"` — a mock iPhone status bar
(9:41, the notch pill, signal/wifi/battery glyphs) drawn so the prototype screenshots look
like a phone. It must not be built. Same for the bezel:

```css
.dzwrap  .dzbezel  .dzscreen  .dzpage  .dzlabel  .dzfake  .dzdrawerclose
```

Below 900px it goes full-bleed (`width: 100vw`, `max-width: 440px`, radius and shadow
removed). **`.dzbezel`, `.dzlabel` and `.dzfake` are presentation scaffolding** — the real app
is the `.dzscreen` content at ≤440px.

Two accessibility rules worth keeping: a 44px hit area injected via
`.dzscreen button::after` under `@media (pointer: coarse)`, and `font-size: 16px` on all
inputs to stop iOS zoom (we already do the latter).

---

## 4. The decision this forces

The handover ships two independent apps. We have one responsive Next.js app at
`app/[slug]`. Three ways to land this:

1. **Stay responsive, one component tree.** Cheapest, and keeps one codebase — but the two
   designs disagree on palette, navigation model (modals vs screens) and pickers, so this
   means overriding roughly half the mobile design. It would not "look and behave exactly
   like" the reference the handover points at.
2. **One app, two rendering paths.** Keep the routes, contexts and API layer shared; branch
   the presentation on a breakpoint or on the server-detected device — desktop components
   under `md:` and up, a mobile screen stack below. Shared state, two UIs. Closest to the
   handover's intent without a second deployment.
3. **Two apps, as delivered.** Mirror the handover literally: a device switch in the proxy
   and two component trees. Highest fidelity, and the handover's own warning applies —
   *"every change must be applied to both, otherwise the two versions will drift apart."*

My recommendation is **(2)**: the divergence is real and worth honouring, but a second app
doubles the maintenance of every future change, and A Next.js proxy plus a device-scoped
layout gets the same result inside one deployment. Worth deciding before any code is written,
because it determines whether the mobile palette becomes a second token set or a `data-device`
scope on the existing one.

---

## 5. What this costs us against what is already built

| Area | Status |
| --- | --- |
| Desktop menu / cart / product / address / drawer / orders | ✅ Still valid |
| Desktop checkout | ✅ Still valid |
| Desktop payment sheet | ✅ Rebuilt — grouped rows, brand tiles, green check |
| Desktop pre-order | ✅ Time chips → time input with the opening window |
| Desktop confirmation | ✅ Success hero → receipt header |
| Desktop shell width | ✅ `.shell` / `.shell-pad`, 2160 + 3-column tier at 1700px |
| Brand mark | ✅ `BrandMark` renders the store logo at 48 / 76 / 150px |
| Mobile, all screens | ❌ New — nothing reusable beyond contexts and the API layer |

**Desktop delta from this handover is complete.** What remains on desktop is the older
backlog carried over in [webshop-design-mapping.md](webshop-design-mapping.md) §15 — product
card click behaviour, the untranslated "popular" badge, scroll-anchor offsets, the product
modal's upsell / info accordion / edit-line, the voucher catalogue and celebration, and the
light-theme status pills in `getStatusMeta`.

The desktop work is a short list. The mobile app is the project.

---

## 6. Open questions

1. **Architecture** — which of the three options in §4?
2. **Is the desktop palette really final?** It is unchanged from the previous design, while
   the handover's own summary describes the new colours. Confirmed verbally; worth one line
   in writing from the designer before we lock tokens.
3. **Payment methods** — the sheet shows card / Apple Pay / PayPal / Klarna / cash / EC, but
   the handover says these are *"UI only, with no real payment processing"*, and our store
   payload only offers `cash` and `ecCardReader`. Which are real for launch?
4. **Order submission** — the prototype posts nowhere. Our flow is wired to `/order`; nothing
   in the new design should change that.
