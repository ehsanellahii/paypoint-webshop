import { QrCode } from 'lucide-react';

/**
 * Shown when the slug resolves to no store — most often a stale or mistyped QR
 * link. Centred and fluid, so it works in both the desktop shell and the mobile
 * frame without branching on device.
 */
export default function NotFound() {
  return (
    <div className='flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-6 text-center'>
      <div className='flex h-[74px] w-[74px] items-center justify-center rounded-full bg-card'>
        <QrCode className='h-9 w-9 text-muted-foreground' strokeWidth={1.6} />
      </div>
      <h1 className='mt-1 text-[19px] font-extrabold text-white'>Invalid QR code</h1>
      <p className='max-w-[320px] text-[13.5px] font-medium leading-relaxed text-muted-foreground'>This link is expired or incorrect. Please scan the code again.</p>
    </div>
  );
}
