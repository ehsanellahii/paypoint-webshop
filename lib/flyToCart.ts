/**
 * Fly-to-cart animation (ported from the Little Italy prototype `flyAdd`).
 * Animates a thumbnail of the product from the tapped add-button along a
 * parabolic arc into the cart button, then bounces the cart + emits a ring
 * burst and a floating "+1". Pure DOM / Web Animations API — call on click.
 */
export function flyToCart(sourceEl: HTMLElement | null, imageUrl: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!sourceEl) return;

  // Respect reduced-motion preference.
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  try {
    const start = sourceEl.getBoundingClientRect();

    const cartBtn =
      [...document.querySelectorAll<HTMLElement>('[data-cart-target]')].find((el) => el.offsetParent !== null) ||
      document.querySelector<HTMLElement>('[data-cart-target]');
    const anchor = document.querySelector<HTMLElement>('[data-cart-anchor]');

    let end: { left: number; top: number; width: number; height: number };
    if (cartBtn) {
      end = cartBtn.getBoundingClientRect();
    } else if (anchor) {
      // Cart button not rendered yet (empty cart) — aim just left of the profile button.
      const a = anchor.getBoundingClientRect();
      end = { left: a.left - 64, top: a.top, width: 44, height: a.height };
    } else {
      end = { left: start.left, top: 8, width: 44, height: 44 };
    }

    const sx = start.left + start.width / 2;
    const sy = start.top + start.height / 2;
    const ex = end.left + end.width / 2;
    const ey = end.top + end.height / 2;
    const dx = ex - sx;
    const dy = ey - sy;

    const lift = Math.min(180, Math.max(90, Math.abs(dx) * 0.32 + 70));
    const mx = dx * 0.5 + (dx > 0 ? -26 : 26);
    const my = dy * 0.42 - lift;

    const fly = document.createElement('div');
    fly.style.cssText =
      `position:fixed;z-index:9999;left:${sx - 27}px;top:${sy - 27}px;width:54px;height:54px;` +
      `border-radius:16px;background:#fff center/cover url(${imageUrl});` +
      `box-shadow:0 16px 34px rgba(0,0,0,.6),0 0 0 3px rgba(255,255,255,.85);pointer-events:none;will-change:transform,opacity;`;
    document.body.appendChild(fly);

    const anim = fly.animate(
      [
        { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1, offset: 0, easing: 'cubic-bezier(.34,1.56,.64,1)' },
        { transform: `translate(${mx * 0.55}px,${my}px) scale(1.22) rotate(-12deg)`, opacity: 1, offset: 0.28, easing: 'cubic-bezier(.2,.6,.3,1)' },
        { transform: `translate(${mx}px,${my}px) scale(1.05) rotate(8deg)`, opacity: 1, offset: 0.55, easing: 'cubic-bezier(.55,.05,.7,.4)' },
        { transform: `translate(${dx}px,${dy}px) scale(.18) rotate(26deg)`, opacity: 0.5, offset: 1 },
      ],
      { duration: 720, fill: 'forwards' }
    );

    anim.onfinish = () => {
      fly.remove();
      if (cartBtn) {
        cartBtn.style.transformOrigin = 'center';
        cartBtn.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.38)' }, { transform: 'scale(.86)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }],
          { duration: 480, easing: 'cubic-bezier(.2,.8,.3,1)' }
        );
      }
      // Ring burst
      const ring = document.createElement('div');
      ring.style.cssText = `position:fixed;z-index:9998;left:${ex - 10}px;top:${ey - 10}px;width:20px;height:20px;border-radius:50%;border:3px solid rgba(95,193,99,.9);pointer-events:none;`;
      document.body.appendChild(ring);
      ring.animate([{ transform: 'scale(.4)', opacity: 0.9 }, { transform: 'scale(3.4)', opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => ring.remove();

      // Floating +1
      const plus = document.createElement('div');
      plus.textContent = '+1';
      plus.style.cssText = `position:fixed;z-index:9999;left:${ex - 12}px;top:${ey - 14}px;font:800 17px 'Baloo 2',system-ui,sans-serif;color:#5fc163;text-shadow:0 2px 8px rgba(0,0,0,.5);pointer-events:none;`;
      document.body.appendChild(plus);
      plus
        .animate(
          [
            { transform: 'translateY(0) scale(.6)', opacity: 0 },
            { transform: 'translateY(-6px) scale(1.1)', opacity: 1, offset: 0.3 },
            { transform: 'translateY(-30px) scale(1)', opacity: 0 },
          ],
          { duration: 720, easing: 'cubic-bezier(.3,.7,.3,1)' }
        ).onfinish = () => plus.remove();
    };
  } catch {
    /* animation is non-critical */
  }
}
