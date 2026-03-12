import { useEffect, type RefObject } from 'react';

/** Close handler triggered when clicking outside the referenced element. */
export function useClickOutside(ref: RefObject<HTMLElement | null>, onClose: () => void): void {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [ref, onClose]);
}
