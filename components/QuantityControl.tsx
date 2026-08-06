'use client';

import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';
import { cn } from '~/lib/utils';

interface QuantityControlProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact';
}

export default function QuantityControl({ value, onChange, min = 1, max = 99, size = 'md', variant = 'default' }: QuantityControlProps) {
  const handleDecrease = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrease = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  const textSizeClasses = {
    sm: 'text-sm w-6',
    md: 'text-base w-8',
    lg: 'text-lg w-10',
  };

  if (variant === 'compact') {
    return (
      <div className='flex items-center gap-2' role='group' aria-label='Quantity controls'>
        <Button
          onClick={handleDecrease}
          size='icon'
          variant='outline'
          className={cn('text-black', sizeClasses[size], value <= min ? 'cursor-not-allowed opacity-50' : '')}
          aria-label='Decrease quantity'
          disabled={value <= min}>
          <Minus className='h-4 w-4' aria-hidden='true' />
        </Button>
        <span className={`font-semibold text-center ${textSizeClasses[size]}`} aria-label={`Quantity: ${value}`}>
          {value}
        </span>
        <Button
          onClick={handleIncrease}
          size='icon'
          variant='outline'
          className={cn('text-black', sizeClasses[size], value >= max ? 'cursor-not-allowed opacity-50' : '')}
          aria-label='Increase quantity'
          disabled={value >= max}>
          <Plus className='h-4 w-4' aria-hidden='true' />
        </Button>
      </div>
    );
  }

  return (
    <div className='flex items-center gap-3 bg-gray-100 rounded-full px-4 py-2' role='group' aria-label='Quantity controls'>
      <Button
        onClick={handleDecrease}
        size='icon'
        variant='ghost'
        className={cn('h-8 w-8 rounded-full', value > 0 && 'text-(--selected-text)', value <= min ? 'cursor-not-allowed opacity-50' : '')}
        aria-label='Decrease quantity'
        disabled={value <= min}>
        <Minus className='h-4 w-4' aria-hidden='true' />
      </Button>
      <span className='font-bold text-lg w-8 text-center' aria-label={`Quantity: ${value}`}>
        {value}
      </span>
      <Button
        onClick={handleIncrease}
        size='icon'
        variant='ghost'
        className={cn('h-8 w-8 rounded-full', value <= min ? 'cursor-not-allowed opacity-50' : '')}
        aria-label='Increase quantity'
        disabled={value >= max}>
        <Plus className='h-4 w-4' aria-hidden='true' />
      </Button>
    </div>
  );
}
