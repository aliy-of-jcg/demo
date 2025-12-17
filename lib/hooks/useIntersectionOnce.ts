import { useRef, useState, useEffect } from 'react';

interface UseIntersectionOnceOptions {
  threshold?: number;
  rootMargin?: string;
  sectionName?: string;
}

export function useIntersectionOnce(options: UseIntersectionOnceOptions = {}) {
  const { threshold = 0.1, rootMargin = '50px 0px', sectionName } = options;
  const ref = useRef<HTMLDivElement>(null);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || hasIntersected) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasIntersected(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, hasIntersected, sectionName]);

  return { ref, hasIntersected };
}

