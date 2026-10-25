"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Entrance animation for a block: the content is always visible without
 * JavaScript. Once the script runs, blocks that are still below the fold are
 * hidden and revealed with a short rise as they enter the viewport.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"init" | "hidden" | "in">("init");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
    if (alreadyVisible || typeof IntersectionObserver === "undefined") {
      setState("in");
      return;
    }

    setState("hidden");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setState("in");
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={state}
      style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
      className={cn("reveal", state === "in" ? "animate-rise-in" : null, className)}
    >
      {children}
    </div>
  );
}
