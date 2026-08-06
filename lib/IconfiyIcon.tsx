'use client';

import { Icon } from '@iconify/react';

import { cn } from './utils';

export function IconifyIcon({
  icon,
  className,
  ...props
}: {
  icon: string;
  className?: string;
  [key: string]: any;
}) {
  return <Icon icon={icon} className={cn(className)} {...props} ssr={true} />;
}
