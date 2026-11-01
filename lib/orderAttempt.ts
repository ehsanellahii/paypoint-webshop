/**
 * The Idempotency-Key of the order being placed, per store, for this tab.
 *
 * Server 0051 answers a repeated `Idempotency-Key` (same store, same body,
 * within 24 h) with the first order instead of creating a second one. The key
 * used to live in a React ref, so a reload after a timeout — the moment a
 * guest is least sure the order went through — sent the same basket under a
 * new key and could place it twice. Kept in session storage instead: a reload
 * or a remount of the checkout finds it again, another tab does not share it.
 *
 * The key belongs to one payload (`fingerprint`): any change to the order is a
 * new attempt with a new key, because the server refuses a known key with a
 * different body (`IDEMPOTENCY_KEY_REUSED`). It is dropped once the order is
 * placed (or refused for good), and after 24 h, when the server releases it.
 */
export type OrderAttempt = { fingerprint: string; key: string; createdAt: number };

export const ORDER_ATTEMPT_TTL_MS = 24 * 60 * 60 * 1000;

const storageKey = (slug: string) => `pos-order-attempt:${slug || 'default'}`;

/** A fresh key for one order attempt. */
export function newIdempotencyKey(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    /* not a secure context */
  }
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${hex(3)}-${hex(12)}`;
}

/** This page's copy, for when session storage cannot be used (private mode, blocked storage). */
const memory = new Map<string, OrderAttempt>();

const fresh = (v: Partial<OrderAttempt> | null | undefined, now: number): OrderAttempt | null => {
  if (!v || typeof v.fingerprint !== 'string' || typeof v.key !== 'string' || typeof v.createdAt !== 'number') return null;
  if (now - v.createdAt >= ORDER_ATTEMPT_TTL_MS || v.createdAt > now + 60_000) return null;
  return { fingerprint: v.fingerprint, key: v.key, createdAt: v.createdAt };
};

function read(slug: string, now: number): OrderAttempt | null {
  try {
    const raw = sessionStorage.getItem(storageKey(slug));
    return raw ? fresh(JSON.parse(raw) as Partial<OrderAttempt>, now) : null;
  } catch {
    return fresh(memory.get(storageKey(slug)), now);
  }
}

/**
 * The key for this payload: the stored one when it is for the same payload
 * and younger than 24 h, otherwise a new one, stored.
 */
export function orderAttemptKey(slug: string, fingerprint: string, now: number = Date.now()): string {
  const held = read(slug, now);
  if (held && held.fingerprint === fingerprint) return held.key;
  const next: OrderAttempt = { fingerprint, key: newIdempotencyKey(), createdAt: now };
  memory.set(storageKey(slug), next);
  try {
    sessionStorage.setItem(storageKey(slug), JSON.stringify(next));
  } catch {
    /* storage unavailable: the page's own copy still covers its retries */
  }
  return next.key;
}

/** Forget the attempt: the order went through, or was refused for good. */
export function clearOrderAttempt(slug: string) {
  memory.delete(storageKey(slug));
  try {
    sessionStorage.removeItem(storageKey(slug));
  } catch {
    /* non-critical */
  }
}
