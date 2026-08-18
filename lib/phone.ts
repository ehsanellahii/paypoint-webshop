/** Default dialling code, matching the sign-in form's own default. */
export const DEFAULT_PHONE_CODE = '+49';

/**
 * Split a number as typed into a dialling code and a subscriber number.
 *
 * Checkout collects the phone in a single free-text field, so it arrives in
 * whatever shape the customer wrote it — `0151 234567`, `+49151234567`,
 * `0049151234567`. The verification step needs the two halves separately, and
 * has to send E.164 to Firebase.
 *
 * The heuristics are deliberately shallow: anything already in international
 * form is trusted, a national trunk `0` is replaced by the store's code, and
 * everything else is assumed to be a local number. Nothing here tries to be a
 * phone-number library — a wrong guess is visible and editable in the field.
 */
export function splitPhone(raw: string | undefined | null, fallbackCode = DEFAULT_PHONE_CODE): { code: string; number: string } {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return { code: fallbackCode, number: '' };

  // `00…` is the same thing as `+…`.
  const international = trimmed.startsWith('+') ? trimmed : trimmed.startsWith('00') ? `+${trimmed.slice(2)}` : '';

  if (international) {
    const digits = international.slice(1).replace(/\D/g, '');
    const bare = fallbackCode.replace(/\D/g, '');
    // Prefer the store's own code when the number carries it, so the split is
    // right for the overwhelmingly common case without guessing lengths.
    if (bare && digits.startsWith(bare)) return { code: fallbackCode, number: digits.slice(bare.length) };
    // Otherwise assume a two-digit code, the most common length.
    return { code: `+${digits.slice(0, 2)}`, number: digits.slice(2) };
  }

  const digits = trimmed.replace(/\D/g, '');
  // A leading trunk `0` is national notation and is not part of the number.
  return { code: fallbackCode, number: digits.replace(/^0+/, '') };
}
