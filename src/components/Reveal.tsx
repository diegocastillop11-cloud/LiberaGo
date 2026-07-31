import type { ReactNode } from "react";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRevealOnScroll<HTMLDivElement>(delay);
  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}
