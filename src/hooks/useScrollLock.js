import { useLayoutEffect } from 'react';

// Recuento por elemento: cerrar un diálogo anidado no desbloquea el anterior.
const locks = new WeakMap();
export function useScrollLock() {
  useLayoutEffect(() => {
    const targets = [document.body, document.querySelector('.main')].filter(Boolean);
    for (const target of targets) {
      const lock = locks.get(target) || { count: 0, overflow: target.style.overflow };
      lock.count++; locks.set(target, lock); target.style.overflow = 'hidden';
    }
    return () => {
      for (const target of targets) {
        const lock = locks.get(target);
        if (--lock.count === 0) { target.style.overflow = lock.overflow; locks.delete(target); }
      }
    };
  }, []);
}
