import { useEffect, useState } from 'react';

/**
 * Keyboard-aware viewport sizing for iOS/Android.
 *
 * Publishes two CSS variables on <html>:
 *   --app-height : usable height (shrinks when the soft keyboard opens on Android,
 *                  and tracks visualViewport height on iOS where the layout
 *                  viewport does not resize)
 *   --kb-inset   : how many px the keyboard covers at the bottom
 *
 * Returns the current keyboard inset so components can hide bottom chrome.
 */
export default function useKeyboardViewport() {
  const [kbInset, setKbInset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const vv = window.visualViewport;

    const apply = () => {
      const height = vv ? vv.height : window.innerHeight;
      // On iOS the page scrolls up behind the keyboard; offsetTop captures that.
      const offsetTop = vv ? vv.offsetTop : 0;
      const inset = Math.max(0, Math.round(window.innerHeight - height - offsetTop));
      root.style.setProperty('--app-height', `${Math.round(height)}px`);
      root.style.setProperty('--kb-inset', `${inset}px`);
      // Only treat it as a keyboard (not browser chrome) above a threshold.
      const keyboard = inset > 120 ? inset : 0;
      root.classList.toggle('keyboard-open', keyboard > 0);
      setKbInset((prev) => (prev === keyboard ? prev : keyboard));
    };

    apply();

    if (vv) {
      vv.addEventListener('resize', apply);
      vv.addEventListener('scroll', apply);
    }
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', apply);
        vv.removeEventListener('scroll', apply);
      }
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
      root.classList.remove('keyboard-open');
      root.style.removeProperty('--app-height');
      root.style.removeProperty('--kb-inset');
    };
  }, []);

  return kbInset;
}
