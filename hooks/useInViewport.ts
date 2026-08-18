'use client';

import { useEffect, useState, type RefObject } from 'react';

/** True once `ref` enters viewport (plus rootMargin). Stays true after first intersect. */
export function useInViewport(
  ref: RefObject<Element | null>,
  rootMargin = '240px'
): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, visible]);

  return visible;
}
