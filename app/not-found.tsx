import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      style={{
        height: '100dvh',
        maxHeight: '100vh',
        overflow: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        // background: 'radial-gradient(1200px 600px at 50% 15%, rgba(99,102,241,0.12), transparent 60%), #f6f7fb',
        color: '#0f172a',
      }}>
      <section
        style={{
          width: '100%',
          maxWidth: 820,
          textAlign: 'center',
          padding: '56px 28px',
          borderRadius: 20,
          background: 'rgba(255,255,255,0.78)',
          border: '1px solid rgba(15, 23, 42, 0.10)',
          boxShadow: '0 22px 70px rgba(15, 23, 42, 0.12)',
          backdropFilter: 'blur(10px)',
        }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 999,
            background: 'rgba(15, 23, 42, 0.05)',
            border: '1px solid rgba(15, 23, 42, 0.08)',
            fontSize: 13,
            color: 'rgba(15, 23, 42, 0.7)',
            marginBottom: 18,
          }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: '#00afef',
              display: 'inline-block',
            }}
          />
          404 • Page not found
        </span>

        <h1
          style={{
            fontSize: 44,
            lineHeight: 1.1,
            margin: '0 0 12px',
            letterSpacing: -0.6,
          }}>
          Welcome to PayPoint Online Kiosk
        </h1>

        <p style={{ fontSize: 18, margin: '0 0 6px', color: 'rgba(15,23,42,0.8)' }}>Let your guests order faster from their own phones.</p>
        <p style={{ fontSize: 18, margin: '0 0 28px', color: 'rgba(15,23,42,0.8)' }}>Receive orders from any device, anytime. Increase your revenue and reduce costs!</p>

        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
          <Link
            href='https://YOUR-MAIN-WEBSITE.COM'
            style={{
              padding: '12px 18px',
              borderRadius: 12,
              background: '#00afef',
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 700,
              boxShadow: '0 10px 30px rgba(17,24,39,0.22)',
            }}>
            More information →
          </Link>
        </div>

        <p style={{ marginTop: 22, fontSize: 13, color: 'rgba(15,23,42,0.55)' }}>If you typed the address manually, please check the spelling.</p>
      </section>
    </main>
  );
}
