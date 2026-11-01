'use client';

/*
 * Root error boundary. German and generic, like app/[slug]/error.tsx: the
 * error's own message is for developers and is never shown to guests.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Etwas ist schiefgelaufen</h1>
      <p>Die Seite konnte gerade nicht geladen werden. Bitte versuche es gleich noch einmal.</p>

      <button onClick={reset}>Erneut versuchen</button>
    </div>
  );
}
