/* eslint-disable jsx-a11y/alt-text */
'use client';

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';

import { cn } from '~/lib/utils';

interface SmartImageProps extends Omit<ImageProps, 'onError' | 'onLoad'> {
  /** Shown only if the image fails to load — never while it is still loading. */
  fallbackSrc?: string;
  fallbackOpacity?: number;
  /** Extra classes for the wrapper, e.g. its corner radius. */
  wrapperClassName?: string;
}

/**
 * A picture with the design's loading treatment.
 *
 * While it loads, the frame shimmers; the picture then fades in over it. The
 * store logo is a failure state, not a placeholder — standing it in during
 * loading made every list flash the same logo before resolving into food.
 */
export default function SmartImage({ src, fallbackSrc, fallbackOpacity = 0.7, className, wrapperClassName, ...props }: SmartImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <div className={cn('relative h-full w-full overflow-hidden', status === 'loading' && 'img-shimmer', wrapperClassName)}>
      {status === 'error' && fallbackSrc && <Image src={fallbackSrc} alt='' fill sizes={props.sizes} className='object-contain' style={{ opacity: fallbackOpacity }} unoptimized />}

      {status !== 'error' && (
        <Image
          {...props}
          src={src}
          fill
          // `cn` resolves the object-fit conflict, so a caller passing
          // `object-cover` wins over the default rather than both landing.
          className={cn('object-contain', status === 'loaded' ? 'img-fade-in' : 'opacity-0', className)}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          unoptimized
        />
      )}
    </div>
  );
}
