/* eslint-disable jsx-a11y/alt-text */
'use client';

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';

interface SmartImageProps extends Omit<ImageProps, 'onError' | 'onLoad'> {
  fallbackSrc?: string;
  fallbackOpacity?: number;
}

export default function SmartImage({ src, fallbackSrc, fallbackOpacity = 0.7, className, ...props }: SmartImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const showFallback = !isLoaded || hasError;

  return (
    <div className='relative w-full h-full'>
      {/* Fallback layer */}
      {fallbackSrc && showFallback && (
        <Image src={fallbackSrc} alt='fallback' fill sizes={props.sizes} className='object-contain' style={{ opacity: fallbackOpacity }} unoptimized />
      )}

      {/* Main image */}
      {!hasError && (
        <Image
          {...props}
          src={src}
          fill
          className={`object-contain transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className || ''}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          unoptimized
        />
      )}
    </div>
  );
}
