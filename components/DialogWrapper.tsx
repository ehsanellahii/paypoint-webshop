import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '~/lib/utils';
import { X } from 'lucide-react';

const DialogWrapper = ({
  isOpen,
  handleOpenChange,
  children,
  title,
  ContentClassName,
  HeaderClassName,
  TitleClassName,
  isWithCrossIcon = false,
}: {
  isOpen: boolean;
  handleOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title: string;
  ContentClassName?: string;
  HeaderClassName?: string;
  TitleClassName?: string;
  isWithCrossIcon?: boolean;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn('flex h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-5xl flex-col rounded-3xl border border-border bg-card p-0 text-foreground', ContentClassName)}>
        {isWithCrossIcon ? (
          <DialogHeader className={cn('border-b-0 p-6 pb-0', HeaderClassName)}>
            <DialogTitle className={cn('flex justify-between border-b border-border py-4 text-center font-display text-3xl font-extrabold md:py-8', TitleClassName)}>
              <div></div>
              {title}
              <button className='rounded-full p-2 text-white hover:bg-white/10' onClick={() => handleOpenChange(false)} aria-label='Close'>
                <X className='h-5 w-5' />
              </button>
            </DialogTitle>
          </DialogHeader>
        ) : (
          <DialogHeader className={cn('border-b-0 p-6 pb-0', HeaderClassName)}>
            <DialogTitle className={cn('border-b border-border py-4 text-center font-display text-3xl font-extrabold md:py-8', TitleClassName)}>{title}</DialogTitle>
          </DialogHeader>
        )}

        {children}
      </DialogContent>
    </Dialog>
  );
};

export default DialogWrapper;
