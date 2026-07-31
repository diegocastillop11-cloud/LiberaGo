import { useEffect, useRef } from "react";

const FALLBACK_MS = 2000;

export function useRevealOnScroll<T extends HTMLElement>(delayMs = 0) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reveal = () => el.classList.add("is-visible");

    if (typeof IntersectionObserver === "undefined") {
      reveal();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          window.setTimeout(reveal, delayMs);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(el);

    // Belt and suspenders: some environments (older WebViews, certain
    // embedded browsers) never fire IntersectionObserver callbacks. Content
    // must never stay permanently invisible because of that.
    const fallback = window.setTimeout(reveal, FALLBACK_MS);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, [delayMs]);

  return ref;
}
