import { useEffect } from "react";

/**
 * Calls the callback on mount and when the page is restored from bfcache
 * (browser back/forward navigation).
 */
export function usePageShow(callback: () => void) {
  useEffect(() => {
    callback();

    const handler = (e: PageTransitionEvent) => {
      if (e.persisted) callback();
    };
    window.addEventListener("pageshow", handler);
    return () => window.removeEventListener("pageshow", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
