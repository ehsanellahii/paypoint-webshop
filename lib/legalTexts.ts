// TODO(legal): This privacy-policy template (and the imprint layout in components/legal/*) must be
// checked by a lawyer before go-live. It describes the shop as built on 01.11.2026; any new
// third-party service, tracking or cookie has to be added here first.

import type { Language } from './i18n';

/**
 * The privacy policy of a restaurant's web shop, as plain sections.
 *
 * A document rather than UI labels, so it lives here as one text per
 * language instead of as dozens of keys in `lib/i18n.ts`: a lawyer reviews it
 * as a whole, and a sentence split across keys is a sentence nobody reads in
 * context. The page only lays the sections out.
 *
 * Deliberately sober: it names what the shop really does (order data, sign-in,
 * address search, online payment where the store has it, browser storage) and
 * claims nothing it cannot back — no certifications, no addresses for
 * PayPoint, no tracking that does not exist.
 */

export type PrivacyContext = {
  /** The restaurant as the controller: name, address lines, contact lines. */
  controller: string[];
  /** Where data-protection requests go; empty when the store has no e-mail. */
  email: string;
  /** Online payment is switched on for this store (Stripe). */
  onlinePayment: boolean;
};

/** `list` and `address`, when present, are laid out after the first paragraph. */
export type LegalSection = { heading: string; paragraphs: string[]; list?: string[]; address?: string[] };

const de = (c: PrivacyContext): LegalSection[] => [
  {
    heading: '1. Verantwortlicher',
    address: c.controller,
    paragraphs: [
      'Verantwortlich für die Verarbeitung personenbezogener Daten in diesem Online-Shop ist das Restaurant:',
      c.email
        ? `Bei Fragen zum Datenschutz oder zu deinen Rechten erreichst du uns unter ${c.email}.`
        : 'Bei Fragen zum Datenschutz oder zu deinen Rechten wende dich an die oben genannten Kontaktdaten.',
    ],
  },
  {
    heading: '2. Aufruf der Website',
    paragraphs: [
      'Beim Aufruf dieser Website werden technisch notwendige Daten verarbeitet, damit die Seite ausgeliefert werden kann und sicher bleibt – zum Beispiel deine IP-Adresse, Datum und Uhrzeit, die aufgerufene Seite und Angaben zu deinem Browser. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse ist der sichere und fehlerfreie Betrieb der Website.',
    ],
  },
  {
    heading: '3. Bestellungen und Kontaktdaten',
    paragraphs: [
      'Wenn du bestellst, verarbeiten wir die Daten, die für die Bestellung nötig sind:',
      'Wir nutzen diese Daten, um deine Bestellung zuzubereiten, sie zu liefern oder zur Abholung bereitzustellen und dich bei Rückfragen zu erreichen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertrag bzw. vorvertragliche Maßnahmen). Bestelldaten bewahren wir auf, solange gesetzliche Aufbewahrungspflichten (insbesondere aus Handels- und Steuerrecht) es verlangen, Art. 6 Abs. 1 lit. c DSGVO; danach werden sie gelöscht.',
    ],
    list: [
      'Name, Telefonnummer und – falls angegeben – E-Mail-Adresse',
      'bei Lieferung deine Lieferadresse, Klingelname und Hinweise für den Fahrer',
      'Inhalt der Bestellung, Anmerkungen, gewünschte Zeit, Bestellart und Zahlungsart',
    ],
  },
  {
    heading: '4. Technischer Dienstleister',
    paragraphs: [
      'Den Online-Shop und das Bestellsystem stellt die PayPoint POS UG (haftungsbeschränkt) als technischer Dienstleister bereit. Sie verarbeitet die Daten aus Abschnitt 2 und 3 in unserem Auftrag und nach unserer Weisung, um den Shop zu betreiben und Bestellungen an unsere Kasse zu übermitteln (Auftragsverarbeitung nach Art. 28 DSGVO).',
    ],
  },
  {
    heading: '5. Anmeldung',
    paragraphs: [
      'Du kannst ohne Konto als Gast bestellen. Wenn du dich anmeldest – per SMS-Code, mit Google oder mit Apple –, nutzen wir dafür Google Firebase Authentication der Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland. Dabei werden deine Telefonnummer bzw. die E-Mail-Adresse und der Name aus deinem Google- oder Apple-Konto sowie technische Angaben zur Anmeldung verarbeitet. Bei der Anmeldung mit Apple ist zusätzlich die Apple Inc. bzw. ihre europäische Gesellschaft beteiligt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Eine Übermittlung von Daten in die USA ist dabei nicht ausgeschlossen.',
      'Mit deinem Konto speichern wir deine Bestellungen und Favoriten, damit du sie wiederfindest.',
    ],
  },
  {
    heading: '6. Adresssuche und Karten (Google Maps)',
    paragraphs: [
      'Für die Adresssuche, die Prüfung des Liefergebiets und Kartenansichten nutzen wir die Google Maps Platform der Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland. Dabei werden die eingegebene Adresse, deine IP-Adresse und – nur wenn du „Aktuellen Standort verwenden“ wählst und es in deinem Browser erlaubst – dein Standort an Google übermittelt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit die Adresse für die Lieferung nötig ist, im Übrigen Art. 6 Abs. 1 lit. f DSGVO (eine korrekte, schnell auffindbare Lieferadresse). Eine Übermittlung von Daten in die USA ist dabei nicht ausgeschlossen.',
    ],
  },
  ...(c.onlinePayment
    ? [
        {
          heading: '7. Online-Zahlung (Stripe)',
          paragraphs: [
            'Nur wenn du online bezahlst (z. B. mit Karte, Apple Pay oder Google Pay), wird die Zahlung über Stripe abgewickelt, Anbieter ist die Stripe Payments Europe, Limited, Dublin, Irland. Stripe verarbeitet dafür deine Zahlungsdaten, den Betrag und technische Angaben zu deinem Gerät und kann zur Betrugsvermeidung eigene Cookies setzen. Deine vollständigen Kartendaten erhalten wir nicht. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Eine Übermittlung von Daten in die USA ist dabei nicht ausgeschlossen. Bei Barzahlung oder Kartenzahlung vor Ort ist Stripe nicht beteiligt.',
          ],
        },
      ]
    : []),
  {
    heading: `${c.onlinePayment ? 8 : 7}. Speicherung in deinem Browser`,
    paragraphs: [
      'Damit der Shop funktioniert, speichert er Angaben im Speicher deines Browsers (Local Storage, Session Storage und für die Anmeldung IndexedDB): deinen Warenkorb, deine Lieferadresse, die gewählte Sprache, eine gewählte Vorbestellzeit und deinen Anmeldestatus. Diese Angaben bleiben auf deinem Gerät, bis du sie löschst oder dich abmeldest. Das ist für den von dir gewünschten Dienst unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG).',
      'Wir setzen keine Tracking- oder Analyse-Cookies ein und erstellen keine Nutzungsprofile.',
    ],
  },
  {
    heading: `${c.onlinePayment ? 9 : 8}. Deine Rechte`,
    paragraphs: [
      'Du hast das Recht auf Auskunft über deine gespeicherten Daten (Art. 15 DSGVO), auf Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18) und Datenübertragbarkeit (Art. 20). Einer Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO kannst du aus Gründen, die sich aus deiner besonderen Situation ergeben, widersprechen (Art. 21). Eine erteilte Einwilligung kannst du jederzeit mit Wirkung für die Zukunft widerrufen.',
      'Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77 DSGVO), zum Beispiel bei der Behörde deines Wohnorts oder der für den Sitz des Restaurants zuständigen Behörde.',
    ],
  },
];

const en = (c: PrivacyContext): LegalSection[] => [
  {
    heading: '1. Controller',
    address: c.controller,
    paragraphs: [
      'The restaurant is responsible for processing personal data in this online shop:',
      c.email
        ? `For questions about data protection or your rights, contact us at ${c.email}.`
        : 'For questions about data protection or your rights, please use the contact details above.',
    ],
  },
  {
    heading: '2. Visiting the website',
    paragraphs: [
      'When you open this website, technically necessary data is processed so the page can be delivered and kept secure — for example your IP address, date and time, the page requested and details of your browser. The legal basis is Art. 6(1)(f) GDPR; our legitimate interest is running the website securely and without errors.',
    ],
  },
  {
    heading: '3. Orders and contact details',
    paragraphs: [
      'When you place an order, we process the data the order needs:',
      'We use this data to prepare your order, deliver it or have it ready for pickup, and to reach you if there are questions. The legal basis is Art. 6(1)(b) GDPR (contract or pre-contractual steps). We keep order data for as long as statutory retention duties (in particular under commercial and tax law) require, Art. 6(1)(c) GDPR, and delete it afterwards.',
    ],
    list: [
      'name, phone number and — if given — e-mail address',
      'for delivery, your delivery address, doorbell name and notes for the driver',
      'what you ordered, notes, the requested time, order type and payment method',
    ],
  },
  {
    heading: '4. Technical service provider',
    paragraphs: [
      'The online shop and the ordering system are provided by PayPoint POS UG (haftungsbeschränkt) as technical service provider. It processes the data in sections 2 and 3 on our behalf and on our instructions, to run the shop and pass orders to our till (processing on behalf under Art. 28 GDPR).',
    ],
  },
  {
    heading: '5. Signing in',
    paragraphs: [
      'You can order as a guest without an account. If you sign in — with an SMS code, with Google or with Apple — we use Google Firebase Authentication by Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland. Your phone number, or the e-mail address and name of your Google or Apple account, and technical sign-in data are processed. Signing in with Apple also involves Apple Inc. or its European company. The legal basis is Art. 6(1)(b) GDPR. A transfer of data to the USA cannot be ruled out.',
      'With your account we keep your orders and favourites so you can find them again.',
    ],
  },
  {
    heading: '6. Address search and maps (Google Maps)',
    paragraphs: [
      'For the address search, the delivery-area check and map views we use the Google Maps Platform by Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland. The address you type, your IP address and — only if you choose “Use current location” and allow it in your browser — your location are sent to Google. The legal basis is Art. 6(1)(b) GDPR where the address is needed for delivery, otherwise Art. 6(1)(f) GDPR (a correct delivery address that is quick to find). A transfer of data to the USA cannot be ruled out.',
    ],
  },
  ...(c.onlinePayment
    ? [
        {
          heading: '7. Online payment (Stripe)',
          paragraphs: [
            'Only if you pay online (for example by card, Apple Pay or Google Pay) is the payment handled by Stripe, provided by Stripe Payments Europe, Limited, Dublin, Ireland. Stripe processes your payment details, the amount and technical details of your device for this and may set its own cookies to prevent fraud. We do not receive your full card details. The legal basis is Art. 6(1)(b) GDPR. A transfer of data to the USA cannot be ruled out. Stripe is not involved when you pay in cash or by card on site.',
          ],
        },
      ]
    : []),
  {
    heading: `${c.onlinePayment ? 8 : 7}. Storage in your browser`,
    paragraphs: [
      'To work, the shop keeps information in your browser’s storage (local storage, session storage and, for signing in, IndexedDB): your cart, your delivery address, the chosen language, a chosen pre-order time and whether you are signed in. It stays on your device until you delete it or sign out. This is strictly necessary for the service you asked for (§ 25(2) no. 2 TDDDG).',
      'We use no tracking or analytics cookies and build no usage profiles.',
    ],
  },
  {
    heading: `${c.onlinePayment ? 9 : 8}. Your rights`,
    paragraphs: [
      'You have the right of access to your data (Art. 15 GDPR), to rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18) and data portability (Art. 20). You may object to processing based on Art. 6(1)(f) GDPR on grounds relating to your particular situation (Art. 21). You can withdraw any consent you gave at any time with effect for the future.',
      'You may also lodge a complaint with a data protection supervisory authority (Art. 77 GDPR), for example the authority where you live or the one responsible for the restaurant’s location.',
    ],
  },
];

export function privacySections(language: Language, ctx: PrivacyContext): LegalSection[] {
  return language === 'en' ? en(ctx) : de(ctx);
}
