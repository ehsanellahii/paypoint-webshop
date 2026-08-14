# Backend work the webshop is waiting on

Everything the front end cannot finish without an API or data change. Collected from both
design mappings so it can be worked through in one pass at the end.

Each item says what the UI does **today** without it, so nothing here is a blocker for
shipping — but several are visible compromises and one is a legal exposure.

---

## 1. Store fields

The shop is multi-tenant; all of these come from `GET /integration/slugs/:slug`
(`IStoreInfo` in [`lib/types.ts`](../lib/types.ts)).

| Field | Needed by | Today |
| --- | --- | --- |
| **`coverImage`** | Menu hero, checkout hero, auth panel | Falls back to `settings.logo` stretched across a 260px banner and dimmed. A logo is a square mark; a hero wants a ~16:6 photograph. **Highest-impact visual fix available.** |
| **`rating`, `ratingCount`** | Restaurant-info modal, auth hero benefit row | **Hard-coded `4.8` and `820+`** in [`RestaurantInfoModal`](../components/menu/RestaurantInfoModal.tsx) and the auth hero. This is presented to customers as fact — either make it real or drop the row. |
| **`priceLevel`** (`€`/`€€`/`€€€`) | Restaurant-info modal subtitle | Omitted |
| **`description`** | Info modal paragraph, hero tagline | Omitted; the hero shows the address instead |
| **`tagline` / sub-brand line** | Brand mark under the logo | The design's reference build has a per-restaurant sub-brand line. We dropped it rather than invent one |

## 2. Product fields

From `GET /integration/menu`.

| Field | Needed by | Today |
| --- | --- | --- |
| **`allergens`** | Product-modal info accordion | **Not shown at all.** Allergen disclosure is a legal requirement for food sold in Germany — this is the one item here with regulatory weight, not just polish |
| **`additives`** (`Zusatzstoffe`) | Same accordion | Not shown |
| **`gtin`** | Same accordion | Not shown |
| **`isPopular`** | "Popular" badge on product cards | Derived from a **hard-coded regex over product names** in [`ProductCard`](../components/ProductCard.tsx) — `/margherita|salami|hawaii|cheeseburger|bestseller/i`. Wrong for most menus and meaningless outside pizza. `lib/types.ts` already carries a commented-out `popular_order`, so this may be half-built |

## 3. Endpoints

| Endpoint | Needed by | Today |
| --- | --- | --- |
| **List a store's active vouchers** | Voucher sheet catalogue | Code entry only — a customer must already know the code. The design shows a browsable list with value tiles |
| **Saved addresses per customer** | Address book in the delivery sheet | Local only: `pos-address:<slug>` in `localStorage`, so the book is per browser and lost on a new device. The UI (list, labels, delete) is already built against the local store and would move over cleanly |

## 4. Done, pending deploy

- **`name` on `/user/login`.** The web shop's sign-in form now collects a name and posts it.
  `integrationLoginOnly` in
  [`auth.validator.ts`](../../../AdminAndServer/server/src/validators/auth.validator.ts) has
  had `name: Joi.string().optional()` added — without it, `stripUnknown: true` silently
  discarded the field before it reached the service, which already knew how to persist it.
  **The server change is committed but not deployed**; until it is, the name is still dropped.

## 5. Infrastructure / ops

Not backend code, but blocking or risky.

- **Firebase API key is suspended** — `auth/permission-denied: consumer api-key:… has been
  suspended`, so phone sign-in cannot issue an SMS. The shop currently runs a **mock OTP
  bypass** ([`lib/authMock.ts`](../lib/authMock.ts)) that accepts `000000` for any number.
  That is an authentication bypass and is on by default in every environment. Restore the key
  and delete the mock, or set `NEXT_PUBLIC_MOCK_OTP=false` on any real deployment.
- **One Firebase project serves every tenant** ([`lib/firebase.ts`](../lib/firebase.ts)), so
  this suspension took down sign-in for all stores at once.
- **The integration API key is hardcoded** in [`lib/api.ts`](../lib/api.ts) and ships to the
  browser. Should be an environment variable, ideally behind a server-side proxy route.
- **API base URL is chosen by `NODE_ENV`**, which makes staging awkward. An explicit
  `NEXT_PUBLIC_API_BASE_URL` would be better.

---

## Suggested order

1. **Product allergens / additives** — legal exposure, and the only item with a deadline that
   is not ours to set.
2. **Firebase key** — unblocks real sign-in and lets the auth bypass be deleted.
3. **Store cover image** — biggest visual gain for the least work.
4. **`isPopular`** — removes a hard-coded regex that is wrong for most menus.
5. **Rating / review count** — or a decision to drop the row rather than show invented numbers.
6. **Voucher list endpoint**, **server-side addresses** — features, not fixes.
7. **API key and base URL hygiene**.
