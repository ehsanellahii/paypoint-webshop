'use client';

import { AlertCircle, RotateCcw } from 'lucide-react';

/**
 * Route error boundary.
 *
 * Deliberately free of context and translation: this renders when something
 * below it has already failed, and reading from a provider that may itself be
 * the failure would turn one error into a blank page. The layout supplies the
 * dark shell, so tokens are safe — hooks are not.
 *
 * German and generic on purpose: the guests are German, and `error.message`
 * is a developer's English (or a server's) that says nothing to them — and
 * may say more about the backend than a guest should read.
 *
 * Centred and fluid, so it reads correctly in both the desktop shell and the
 * mobile frame without branching on device.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className='flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-6 text-center'>
      <div className='flex h-[74px] w-[74px] items-center justify-center rounded-full bg-card'>
        <AlertCircle className='h-9 w-9 text-destructive' strokeWidth={1.8} />
      </div>
      <h1 className='mt-1 text-[19px] font-extrabold text-white'>Etwas ist schiefgelaufen</h1>
      <p className='max-w-[320px] text-[13.5px] font-medium leading-relaxed text-muted-foreground'>Die Seite konnte gerade nicht geladen werden. Bitte versuche es gleich noch einmal.</p>
      <button
        onClick={reset}
        className='mt-2 inline-flex h-12 items-center gap-2 rounded-[14px] bg-primary px-5 text-sm font-extrabold text-selected-text transition active:scale-[0.97]'>
        <RotateCcw className='h-4 w-4' strokeWidth={2.4} />
        Erneut versuchen
      </button>
    </div>
  );
}
