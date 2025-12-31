'use client';

import { ReactNode } from 'react';
import { useIntersectionOnce } from '@/lib/hooks/useIntersectionOnce';

interface LazySectionProps {
  children: (hasIntersected: boolean) => ReactNode;
  className?: string;
  sectionName: string;
}

export function LazySection({ children, className, sectionName }: LazySectionProps) {
  const { ref, hasIntersected } = useIntersectionOnce({ sectionName });

  return (
    <div ref={ref} className={className} style={{ minHeight: '200px', padding: '1px' }}>
      {children(hasIntersected) || <div style={{ height: '200px' }} />}
    </div>
  );
}

