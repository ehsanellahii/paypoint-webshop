import * as React from 'react';

import { cn } from '~/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot='textarea'
      className={cn(
        'rounded-[14px] border border-border bg-surface-1 text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-white/60 disabled:cursor-not-allowed disabled:opacity-50 flex field-sizing-content min-h-16 w-full px-4 py-3 text-base transition-colors outline-none md:text-sm',
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
