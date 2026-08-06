import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '2rem',
      }}>
      <h1 style={{ fontSize: '4rem' }}>404</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>This page doesn’t exist, but something better awaits you.</p>

      <Link
        href='https://example.com'
        style={{
          padding: '0.75rem 1.5rem',
          background: '#000',
          color: '#fff',
          borderRadius: '6px',
          textDecoration: 'none',
        }}>
        Go to Main Website →
      </Link>
    </div>
  );
}
