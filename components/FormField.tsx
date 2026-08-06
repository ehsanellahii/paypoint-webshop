'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '~/lib/utils';

interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  inputClassName?: string;
}

export default function FormField({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  helperText,
  inputClassName,
}: FormFieldProps) {
  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>
        {label}
        {required && <span className='text-red-500 ml-1'>*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn('focus:outline-none focus:ring-0', inputClassName, error ? 'border-red-500' : '')}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className='text-sm text-brand-red' role='alert'>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${id}-helper`} className='text-xs text-muted-foreground-2'>
          {helperText}
        </p>
      )}
    </div>
  );
}
