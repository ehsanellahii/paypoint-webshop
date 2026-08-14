'use client';

import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '~/lib/utils';

/** Width of the panel revealed behind the row, per the design. */
const REVEAL = 86;
/** Movement before we decide the gesture is horizontal rather than a scroll. */
const AXIS_THRESHOLD = 8;
/** Past this much drag (or this fast a flick) the row settles open. */
const OPEN_AT = REVEAL / 2;
const FLICK_VELOCITY = 0.5; // px per ms

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: () => void;
  removeLabel: string;
  /**
   * Also drive the gesture from a mouse. Off by default — on a phone the
   * pointer is a finger and a stray mouse drag would fight text selection.
   * The desktop cart turns it on, since there the mouse is the only pointer.
   */
  allowMouse?: boolean;
  /** Background of the sliding row; it has to be opaque to cover the panel. */
  surfaceClassName?: string;
  children: React.ReactNode;
};

/**
 * Swipe a row left to reveal a delete action.
 *
 * Two things make this awkward and are worth knowing before changing it:
 *
 * 1. **Axis conflict.** A horizontal drag inside a vertical scroller has to
 *    decide which gesture it is. `touch-action: pan-y` hands vertical panning
 *    back to the browser — so the list still scrolls natively at 60fps — while
 *    we take horizontal movement. We additionally wait `AXIS_THRESHOLD` px
 *    before committing, so a slightly-diagonal scroll is not stolen.
 *
 * 2. **Pointer capture.** Without it, dragging past the row's bounds (or off
 *    the screen edge) drops the `pointermove` stream and the row sticks
 *    half-open.
 *
 * The gesture is an accelerator, never the only way to delete: the panel's
 * button is removed from the tab order while closed, and the row's own stepper
 * still deletes at quantity 1. Nothing here is reachable only by swiping —
 * which is what makes it safe to offer on desktop, where a mouse user may never
 * discover it.
 */
export default function SwipeToRemove({ open, onOpenChange, onRemove, removeLabel, allowMouse = false, surfaceClassName = 'bg-background', children }: Props) {
  const [dragX, setDragX] = useState<number | null>(null);
  const start = useRef<{ x: number; y: number; time: number } | null>(null);
  const axis = useRef<'undecided' | 'horizontal' | 'vertical'>('undecided');

  const dragging = dragX !== null;
  const offset = dragging ? dragX : open ? -REVEAL : 0;

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && !allowMouse) return;
    start.current = { x: e.clientX, y: e.clientY, time: e.timeStamp };
    axis.current = 'undecided';
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;

    if (axis.current === 'undecided') {
      if (Math.abs(dx) < AXIS_THRESHOLD && Math.abs(dy) < AXIS_THRESHOLD) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        // A scroll — stand down for the rest of this gesture.
        axis.current = 'vertical';
        start.current = null;
        return;
      }
      axis.current = 'horizontal';
      e.currentTarget.setPointerCapture(e.pointerId);
      // A mouse drag would otherwise select the row's text as it moves.
      if (e.pointerType === 'mouse') window.getSelection()?.removeAllRanges();
    }

    // Rubber-band past the stop rather than allowing unbounded travel, and do
    // not let the row be dragged to the right of its resting position.
    const base = open ? -REVEAL : 0;
    const next = base + dx;
    setDragX(next > 0 ? next * 0.25 : Math.max(next, -REVEAL - 24));
  };

  const end = (e: React.PointerEvent) => {
    const from = start.current;
    start.current = null;
    axis.current = 'undecided';

    if (!from || dragX === null) {
      setDragX(null);
      return;
    }

    const dx = e.clientX - from.x;
    const velocity = Math.abs(dx) / Math.max(1, e.timeStamp - from.time);

    // A fast flick decides by direction; a slow drag decides by where it ended.
    const next = velocity > FLICK_VELOCITY ? dx < 0 : dragX < -OPEN_AT;

    setDragX(null);
    if (next !== open) onOpenChange(next);
  };

  return (
    <div className='relative' style={{ touchAction: 'pan-y' }}>
      {/* Revealed panel */}
      <div className='absolute inset-y-0 right-0 flex items-center justify-end overflow-hidden rounded-[14px] bg-brand-red' style={{ width: REVEAL + 24 }} aria-hidden={!open}>
        <button type='button' onClick={onRemove} tabIndex={open ? 0 : -1} aria-label={removeLabel} className='flex h-full items-center justify-center text-white' style={{ width: REVEAL }}>
          <Trash2 className='h-5 w-5' strokeWidth={2} />
        </button>
      </div>

      {/* The row itself, sliding over the panel. */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        className={cn('relative', surfaceClassName, !dragging && 'transition-transform duration-200 ease-out', dragging && 'select-none')}
        style={{ transform: `translateX(${offset}px)` }}>
        {children}
      </div>
    </div>
  );
}
