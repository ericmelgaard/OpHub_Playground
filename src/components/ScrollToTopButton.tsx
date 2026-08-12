import { useEffect, useRef, useState } from 'react';
import { ChevronUp } from 'lucide-react';

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const currentY = root.scrollTop;
        const nearTop = currentY < 100;

        if (nearTop) {
          setVisible(false);
        } else {
          const direction = currentY < lastScrollY.current ? 'up' : 'down';
          setVisible(direction === 'up');
        }

        lastScrollY.current = currentY;
        ticking.current = false;
      });
    };

    root.addEventListener('scroll', onScroll, { passive: true });
    return () => root.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    const root = document.getElementById('root');
    if (root) root.scrollTo({ top: 0, behavior: 'smooth' });
    setVisible(false);
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="Back to top"
      className={[
        'fixed bottom-6 right-6 z-40',
        'flex items-center justify-center',
        'h-12 w-12 rounded-full',
        'bg-white dark:bg-gray-800',
        'shadow-lg ring-1 ring-black/5 dark:ring-white/10',
        'text-gray-700 dark:text-gray-200',
        'transition-all duration-300 ease-out',
        'hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95',
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-3 pointer-events-none',
      ].join(' ')}
    >
      <ChevronUp className="h-6 w-6" />
    </button>
  );
}
