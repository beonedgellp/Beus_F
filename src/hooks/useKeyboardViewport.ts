import { useEffect } from 'react';

/**
 * Keeps the app usable when the on-screen keyboard opens on mobile.
 *
 * Uses the VisualViewport API: when the keyboard covers part of the screen,
 * we set --app-h to the *visible* height and add a `kb-open` class on <body>.
 * The app shell then shrinks to the visible area, so the message composer
 * stays right above the keyboard instead of being hidden behind it.
 */
export function useKeyboardViewport(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;

    function update() {
      const view = window.visualViewport;
      if (!view) return;
      const keyboard = Math.max(0, window.innerHeight - view.height - view.offsetTop);
      if (keyboard > 120) {
        root.style.setProperty('--app-h', `${view.height}px`);
        document.body.classList.add('kb-open');
      } else {
        root.style.removeProperty('--app-h');
        document.body.classList.remove('kb-open');
      }
    }

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      document.body.classList.remove('kb-open');
      root.style.removeProperty('--app-h');
    };
  }, []);
}
