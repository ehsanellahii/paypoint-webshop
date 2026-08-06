/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isFavorite, toggleFavorite } from '~/lib/favorites';
import { useStore } from '~/contexts/store-context';
import { useUser } from '~/contexts/user-context';

const HEART_PATH =
  'M12 20S3.5 14.5 3.5 8.8C3.5 6.2 5.5 4.3 7.9 4.3c1.5 0 2.9.8 3.6 2 .7-1.2 2.1-2 3.6-2 2.4 0 4.4 1.9 4.4 4.5C19.1 14.5 12 20 12 20z';

export default function FavoriteButton({
  storeKey,
  productId,
  name,
  image,
  price,
  size = 18,
}: {
  storeKey: string;
  productId: string;
  name?: string;
  image?: string;
  price?: number;
  size?: number;
}) {
  const storeInfo = useStore();
  const { user } = useUser();
  const customerId = user?._id;

  const [fav, setFav] = useState(false);
  const [justLiked, setJustLiked] = useState(false);
  const [breaking, setBreaking] = useState(false);
  const breakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const likeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncFav = useCallback(() => {
    const key = storeInfo?.slug ?? storeKey;
    setFav(isFavorite(key, productId));
  }, [storeInfo?.slug, storeKey, productId]);

  useEffect(() => {
    syncFav();
    window.addEventListener('favorites:changed', syncFav);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'favorites_v1') syncFav();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('favorites:changed', syncFav);
      window.removeEventListener('storage', onStorage);
    };
  }, [syncFav]);

  useEffect(
    () => () => {
      if (breakTimer.current) clearTimeout(breakTimer.current);
      if (likeTimer.current) clearTimeout(likeTimer.current);
    },
    []
  );

  const commitToggle = async () => {
    const slug = storeInfo?.slug ?? storeKey;
    const res = await toggleFavorite({
      adminId: storeInfo?.adminId,
      storeId: storeInfo?.storeId,
      customerId: customerId ?? undefined,
      slug,
      snapshot: { productId, name, image, price },
    });
    setFav(res.isNowFavorite);
    window.dispatchEvent(new Event('favorites:changed'));
  };

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (fav) {
      // play break animation, then remove
      if (breaking) return;
      setBreaking(true);
      breakTimer.current = setTimeout(() => {
        setBreaking(false);
        void commitToggle();
      }, 500);
    } else {
      setJustLiked(true);
      likeTimer.current = setTimeout(() => setJustLiked(false), 600);
      void commitToggle();
    }
  };

  return (
    <button
      type='button'
      aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
      className='relative flex h-[30px] w-[30px] items-center justify-center rounded-full bg-transparent transition active:scale-[0.82]'
      onClick={onClick}>
      {/* like-ring pop */}
      {justLiked && <span className='pointer-events-none absolute h-6 w-6 rounded-full border-2 border-[#ff6b5e]' style={{ animation: 'wzlikering .55s ease-out forwards' }} />}

      {breaking ? (
        <span className='relative block' style={{ width: size, height: size }}>
          <span className='absolute left-0 top-0 overflow-hidden' style={{ width: size / 2, height: size, animation: 'wzheartL .5s ease forwards, wzheartFade .5s ease forwards' }}>
            <svg width={size} height={size} viewBox='0 0 24 24' fill='#ff6b5e' className='block'>
              <path d={HEART_PATH} />
            </svg>
          </span>
          <span className='absolute right-0 top-0 overflow-hidden' style={{ width: size / 2, height: size, animation: 'wzheartR .5s ease forwards, wzheartFade .5s ease forwards' }}>
            <svg width={size} height={size} viewBox='0 0 24 24' fill='#ff6b5e' className='absolute right-0 block'>
              <path d={HEART_PATH} />
            </svg>
          </span>
        </span>
      ) : fav ? (
        <svg width={size} height={size} viewBox='0 0 24 24' fill='#ff6b5e' stroke='#ff6b5e' strokeWidth='1.7' strokeLinejoin='round' style={{ animation: 'wzheartIn .3s ease both' }}>
          <path d={HEART_PATH} />
        </svg>
      ) : (
        <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='#6b6d72' strokeWidth='1.9' strokeLinejoin='round'>
          <path d={HEART_PATH} />
        </svg>
      )}
    </button>
  );
}
