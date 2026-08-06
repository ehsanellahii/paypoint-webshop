import { useEffect, useState, RefObject } from 'react';

interface ScrollState {
  canScrollUp: boolean;
  canScrollDown: boolean;
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

/**
 * Hook to detect scroll boundaries in a container
 */
export function useScrollDetection(
  ref: RefObject<HTMLElement | null>,
  direction: 'vertical' | 'horizontal' | 'both' = 'both'
): ScrollState {
  const [state, setState] = useState<ScrollState>({
    canScrollUp: false,
    canScrollDown: false,
    canScrollLeft: false,
    canScrollRight: false,
  });

  useEffect(() => {
    const container = ref.current;

    if (!container) {
      // Poll for container to become available
      const intervalId = setInterval(() => {
        const retryContainer = ref.current;
        if (retryContainer) {
          clearInterval(intervalId);
          // Trigger re-run by forcing a state update (hack but works)
          setupScrollDetection(retryContainer);
        }
      }, 50);
      
      // Also try after a delay
      const timeoutId = setTimeout(() => {
        const retryContainer = ref.current;
        if (retryContainer) {
          clearInterval(intervalId);
          setupScrollDetection(retryContainer);
        }
      }, 200);
      
      return () => {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      };
    }
    
    setupScrollDetection(container);
    
    function setupScrollDetection(container: HTMLElement) {
      const checkScroll = () => {
      // Ensure container is still valid and has dimensions
      if (!container || container.clientHeight === 0 || container.clientWidth === 0) {
        return;
      }

      const newState: ScrollState = {
        canScrollUp: false,
        canScrollDown: false,
        canScrollLeft: false,
        canScrollRight: false,
      };

      if (direction === 'vertical' || direction === 'both') {
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        const threshold = 1;
        
        // Check if content is actually scrollable
        const isScrollable = scrollHeight > clientHeight;
        const maxScroll = scrollHeight - clientHeight;
        const canScrollDownValue = isScrollable && scrollTop < maxScroll - threshold;
        const canScrollUpValue = isScrollable && scrollTop > threshold;
        
        newState.canScrollUp = canScrollUpValue;
        newState.canScrollDown = canScrollDownValue;
      }

      if (direction === 'horizontal' || direction === 'both') {
        const scrollLeft = container.scrollLeft;
        const scrollWidth = container.scrollWidth;
        const clientWidth = container.clientWidth;
        const threshold = 1;
        
        const isScrollable = scrollWidth > clientWidth;
        
        newState.canScrollLeft = isScrollable && scrollLeft > threshold;
        newState.canScrollRight = isScrollable && scrollLeft < scrollWidth - clientWidth - threshold;
      }

      setState(() => newState);
    };

    // Initial check with multiple RAF calls to catch layout changes
    const rafId1 = requestAnimationFrame(() => {
      checkScroll();
      // Check again after a second frame to catch delayed layout
      requestAnimationFrame(() => {
        checkScroll();
        // One more check for images loading
        requestAnimationFrame(() => {
          checkScroll();
        });
      });
    });

    container.addEventListener('scroll', () => {
      checkScroll();
    }, { passive: true });
    
    // Handle image loads that might change scroll height
    const handleImageLoad = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(checkScroll);
      });
    };
    
    // Find all images in the container and listen for load events
    const images = container.querySelectorAll('img');
    images.forEach((img, index) => {
      if (img.complete) {
        // Image already loaded, check immediately
        handleImageLoad();
      } else {
        img.addEventListener('load', () => {
          handleImageLoad();
        }, { once: true });
        img.addEventListener('error', () => {
          handleImageLoad();
        }, { once: true });
      }
    });
    
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(checkScroll);
      });
    });
    resizeObserver.observe(container);

    // Observe mutations to catch content changes
    const mutationObserver = new MutationObserver((mutations) => {
      // Check if any images were added
      const hasNewImages = mutations.some(mutation => {
        return Array.from(mutation.addedNodes).some(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            return el.tagName === 'IMG' || el.querySelector('img') !== null;
          }
          return false;
        });
      });
      
      
      if (hasNewImages) {
        // Wait for images to potentially load
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const newImages = container.querySelectorAll('img');
            let loadedCount = 0;
            const totalImages = newImages.length;
            
            if (totalImages === 0) {
              checkScroll();
              return;
            }
            
            newImages.forEach(img => {
              if (img.complete) {
                loadedCount++;
              } else {
                img.addEventListener('load', () => {
                  loadedCount++;
                  if (loadedCount === totalImages) {
                    requestAnimationFrame(checkScroll);
                  }
                }, { once: true });
                img.addEventListener('error', () => {
                  loadedCount++;
                  if (loadedCount === totalImages) {
                    requestAnimationFrame(checkScroll);
                  }
                }, { once: true });
              }
            });
            
            if (loadedCount === totalImages) {
              requestAnimationFrame(checkScroll);
            }
          });
        });
      } else {
        requestAnimationFrame(checkScroll);
      }
    });
    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

      return () => {
        cancelAnimationFrame(rafId1);
        container.removeEventListener('scroll', checkScroll);
        resizeObserver.disconnect();
        mutationObserver.disconnect();
        images.forEach(img => {
          img.removeEventListener('load', handleImageLoad);
          img.removeEventListener('error', handleImageLoad);
        });
      };
    }
  }, [ref, direction]);

  return state;
}

/**
 * Hook to smoothly scroll a container
 */
export function useSmoothScroll(ref: RefObject<HTMLElement | null>) {
  const scrollBy = (amount: number, direction: 'horizontal' | 'vertical' = 'horizontal') => {
    const container = ref.current;
    if (!container) return;

    container.scrollBy({
      [direction === 'horizontal' ? 'left' : 'top']: amount,
      behavior: 'smooth',
    });
  };

  return { scrollBy };
}

