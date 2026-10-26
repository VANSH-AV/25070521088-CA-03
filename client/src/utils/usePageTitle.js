import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} — FLEXI` : 'FLEXI';

    return () => {
      document.title = previous;
    };
  }, [title]);
}
