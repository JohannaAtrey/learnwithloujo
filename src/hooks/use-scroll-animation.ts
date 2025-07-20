'use client';

import { useInView, Transition } from 'framer-motion';
import { useRef } from 'react';

type AnimationVariants = {
  initial: { opacity: number; y: number };
  animate: { opacity: number; y: number };
  transition: Transition;
};

export const useScrollAnimation = (): { ref: React.RefObject<HTMLDivElement>; animation: AnimationVariants } => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return {
    ref,
    animation: {
      initial: { opacity: 0, y: 50 },
      animate: isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 },
      transition: { duration: 0.8, ease: 'easeOut' },
    },
  };
}; 