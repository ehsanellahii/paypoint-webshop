# Checkout flow

How the web shop takes an order, from menu to confirmation, and where the
payment branch splits.

The server side of this — Stripe Connect, repricing, the webhook — is
documented in `AdminAndServer/server/docs/stripe-payments.md`. This file covers
the storefront only.

---

## 1. Shape of the app

Routes live under `app/[slug]/`, where `[slug]` names the store:

```
/[slug]              menu
/[slug]/product      one item, with customizations
/[slug]/cart         basket review
/[slug]/checkout     the form
/[slug]/confirmation after ordering
/[slug]/account      past orders, addresses
```

A `?t=<token>` query parameter identifies a table and puts the whole store into
**dine-in** mode. `useStoreNavigation` carries that token across every internal
navigation, so a customer who scanned a table QR stays a table order for the
whole session.

### Server component, then one of two screens

Every page is a server component that fetches the store and then renders one of
two client screens based on `getDevice()`:

```tsx
{device === 'mobile' ? <MobileCheckoutScreen /> : <CheckoutScreen />}
```

They are different layouts of the same transaction. All the logic they share
lives in `hooks/useCheckout.ts` — the order payload, the pricing, the pre-order
slot maths and the submit sequence exist once, because two copies would drift
and only one would ever be tested.

### Contexts

| Context | Holds |
|---|---|
| `store-context` | The server-fetched store. Read-only for the session. |
| `cart-context` | Lines, quantities, customizations, voucher, discount |
| `address-context` | Order type (delivery/pickup) and the delivery address |
| `user-context` | The customer and their verified state |
| `language-context` | Active language and the `t` dictionary |
| `device-context` | Mobile vs desktop, resolved server-side |

## 2. Store data is allow-listed

`getStoreData` in `lib/api.ts` does **not** spread the API response. It names
every field it passes through, because the endpoint returns the whole store
document — bank details included — and only what is listed reaches the browser.

`webShopSettings` is remapped to `settings` on the way through, which is what
`PaymentSheet` reads for `paymentMethods.cash` and `paymentMethods.ecCardReader`.

> **Consequence worth remembering:** a new backend field is invisible to the
> storefront until it is added to that list, however correctly the API sends it.
> Anything the storefront needs to gate on has to be added there first.

### The tenant key comes from here too

The payload carries `apiKey` — the tenant key for **this** store, minted by the
server per request. Every other storefront call sends it via `apiHeaders()`, so
the server resolves the right restaurant.

This replaced a single key hardcoded in the bundle, which named one fixed tenant
for every store: customers were filed under the wrong restaurant and voucher
codes were looked up against the wrong one, so they never resolved.

Two rules follow:

- **Build headers per call.** `apiHeaders({ apiKey, adminId, storeId })` returns
  a fresh object. The previous shared constant was *mutated* with the current
  tenant by five different functions, so whatever the last caller set leaked
  into every later request that reused it.
- **The key is public.** Anyone can fetch a slug and read it. It says which
  restaurant a call concerns; it does not authenticate anybody.

## 3. Checkout state

`useCheckout()` owns everything that is not layout.

**Mode** — three shapes, each asking for different things:

| Mode | Asks for |
|---|---|
| Dine-in | Nothing. The table identifies the order. |
| Delivery | Bell name, callback number, address |
| Pickup | A number to call when it is ready |

**Timing** — three mutually exclusive choices backed by one persisted slot:
`standard`, `priority` (delivery only, when the store defines a surcharge), or
`scheduled` (a pre-order window, which may have been chosen back on the menu).

**Pricing** — computed in the browser as:

```
subtotal − discount + deliveryCharges + priorityFee + tip
```

This is a **display estimate only**. The server reprices every line from the
database and recomputes the total; if the two disagree, the server wins. Never
treat the client figure as authoritative.

The server also owns the rules behind those numbers: delivery charges and the
priority surcharge come from the store's postal rate, and the discount is
derived from the voucher itself — its type, rate, cap and `minimumOrderValue`.
A basket that drops below a voucher's minimum after the code was applied is
refused at order time, not silently discounted.

**Validation** — inline, never an alert. A `missing[]` array drives both the
button label (`Still missing: 2`) and the hint beneath it, so the customer can
always see what is outstanding while filling the form in.

## 4. Placing the order

```
placeOrder()
    │
    ├─ !canPlace ────────────> button already says what is missing
    │
    ├─ not verified ─────────> AuthenticationDialog
    │      (non dine-in)        └─ on verify, placeOrder re-runs by itself
    │
    ├─ loginCustomer()  ─────> skipped for dine-in
    │
    ├─ build orderData
    │
    ├─ cash / EC reader ─────> POST /order
    │                          └─> savePlacedOrder() → /confirmation
    │
    └─ Apple Pay/PayPal/Klarna
            └─> POST /order/unconfirmed        (reserve the basket)
                └─> POST /payments/create-payment-intent
                    └─> setPayNow({...})       (mounts the Stripe sheet)
```

### The verification gate

An unverified customer who presses *Place order* gets the sign-in dialog, and
`resumeAfterVerify` makes the order continue on its own once they come back
verified. They press the button once, not twice. Dine-in skips this entirely —
the guest is already physically at a table.

### Why two endpoints

The branch is the important part of this file.

**Cash and EC reader** go to `POST /order`. The order is real immediately: the
kitchen sees it, and the customer pays a human.

**Online methods** go to `POST /order/unconfirmed`, which *reserves* the basket
without telling the kitchen. Only once Stripe reports the money arrived does the
server's webhook turn that reservation into a real order. Placing it first would
have the kitchen cooking for a payment that may never come.

`ONLINE_METHODS` in `useCheckout.ts` is the list that decides which branch a
method takes.

## 5. The payment sheet

`PaymentSheet` picks the method; `StripePaymentSheet` collects the payment.

Note the method chosen in **our** sheet is largely a flag meaning "settle
online". The Stripe element that follows offers whatever the connected account
actually has enabled — which is why picking Apple Pay can still end in paying by
card.

`StripePaymentSheet`:

- loads Stripe.js **scoped to the restaurant's connected account**, since
  charges are created directly on it (cached per account id, so switching
  stores in one session does not refetch the library)
- renders `<PaymentElement>` with the intent's client secret
- confirms with `redirect: 'if_required'` — cards stay on the page, PayPal and
  Klarna leave for their own flows
- navigates to `/{slug}/confirmation?order={reservationId}`

The promise resolving is **not** proof the money arrived. The order is confirmed
by the webhook, server-side. This screen only knows the customer got that far.

## 6. Confirmation

Both screens are driven by `hooks/useConfirmation.ts`. It resolves to exactly
one of five mutually exclusive states, and the receipt is only one of them —
each earlier state exists because rendering the receipt in it would have claimed
an order that did not exist.

| State | Screen |
|---|---|
| not hydrated | spinner |
| `paymentFailed` | Payment failed — basket intact, *Try again* |
| `unresolved` | Could not confirm — reference and a call button |
| `waiting` | Confirming payment — spinner and reference |
| `!order` | Order not found |
| otherwise | the receipt |

Three questions decide which.

**Did the payment fail?** Stripe appends `redirect_status` to the return URL
when a method takes the customer off-site — PayPal and Klarna do, cards
confirmed with `redirect: 'if_required'` do not. `failed` renders a payment
failure with a *Try again* button, not a receipt. Nothing is cleared, so the
customer can retry the same basket.

**Does the order exist yet?** The order is created by the webhook, not the
browser, so arriving a moment early is normal. The hook polls
`fetchPlacedOrder` every 1.5s for up to 20 attempts, showing the session
snapshot meanwhile with a *Confirming payment* state instead of a success tick.
After that it gives up and leaves the customer with a reference number.

**What happens to the basket?** See below — this is the part with a trap in it.

**And if it never arrives?** After 20 attempts the hook gives up and reports
`unresolved` rather than falling back to the snapshot. That snapshot was written
*before* the customer paid, so presenting it as a receipt told people their food
was being prepared when nothing had reached the kitchen.

The reference in the URL is the customer-facing **collection code** (`91CD6765`),
not a Mongo id — the order endpoint accepts either, and a database id is
meaningless to someone ringing the restaurant about their food.

## 7. When the basket is cleared

Not where you would expect, and deliberately so.

| Branch | Snapshot written | Cart cleared |
|---|---|---|
| Cash / EC reader | After `POST /order` succeeds | Immediately after |
| Online | Before the Stripe sheet opens | On the confirmation screen, once the order is confirmed to exist |

The online branch **must not** clear the cart when it reserves the order. The
customer can still dismiss the Stripe sheet or have the card declined, and
emptying the basket at that point loses an order they are still trying to
place. So `rememberOrder()` writes the snapshot and the prefill up front — the
confirmation screen needs something to paint when they return — but the cart
survives until `useConfirmation` sees a real order come back from the API.

`clearPreorderSlot` follows the same rule, and the clear is guarded by a ref so
it fires exactly once even though the effect may settle several times.

## 8. Known gaps

- **Delivery and pickup send a placeholder customer name** (`********`), because
  checkout collects no name and the server requires one for those order types.
  Those customers show as asterisks in the POS order list, the admin customer
  list and on receipts. Dine-in no longer does this — a table order carries no
  customer at all.
- **`coverImage` is never populated.** No cover field exists server-side yet;
  `lib/storeMedia.ts` falls back to the logo. See `docs/backend-pending.md`.

## 9. File map

| Concern | File |
|---|---|
| All checkout logic | `hooks/useCheckout.ts` |
| Confirmation lookup, polling, cart clear | `hooks/useConfirmation.ts` |
| Desktop layout | `app/components/CheckoutScreen.tsx` |
| Mobile layout | `app/components/mobile/MobileCheckoutScreen.tsx` |
| Method picker + online gate | `components/checkout/PaymentSheet.tsx` |
| Stripe element | `components/checkout/StripePaymentSheet.tsx` |
| Voucher entry | `components/checkout/VoucherSheet.tsx` |
| API calls, allow-list, `apiHeaders()` | `lib/api.ts` |
| Order snapshot / lookup | `lib/lastOrder.ts` |
| Cart line maths | `lib/cartLine.ts`, `contexts/cart-context.tsx` |
| Pre-order slot | `lib/preorderSlot.ts` |
| Token-aware navigation | `hooks/useStoreNavigation.ts` |

### Environment

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY   publishable key for the environment
NEXT_PUBLIC_PAYMENT_API_KEY          must equal the server's PAYMENT_API_KEY
```

Both live in `.env.local`. The second reaches the browser, so it is a
rate-limiting speed bump rather than a real secret — safe only because the
server never takes an amount from the client.

There is no third key. The tenant key is not configured here at all: it arrives
in the store payload per request (§2).
