"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

const GLOW = "46, 109, 180";
const MOBILE_BREAKPOINT = 768;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

/** React Bits Magic Bento glow, light-themed, no particles/tilt/magnetism. */
export function MagicBentoGrid({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const mobile = useIsMobile();
  const disable = reduced || mobile;
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || disable) return;

    const onMove = (e: MouseEvent) => {
      const cards = grid.querySelectorAll<HTMLElement>("[data-bento-card]");
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        const glow = dist < 280 ? Math.max(0, 1 - dist / 280) : 0;
        card.style.setProperty("--glow-x", `${x}%`);
        card.style.setProperty("--glow-y", `${y}%`);
        card.style.setProperty("--glow-intensity", glow.toFixed(3));
      }
    };
    const onLeave = () => {
      grid.querySelectorAll<HTMLElement>("[data-bento-card]").forEach((card) => {
        card.style.setProperty("--glow-intensity", "0");
      });
    };
    grid.addEventListener("mousemove", onMove);
    grid.addEventListener("mouseleave", onLeave);
    return () => {
      grid.removeEventListener("mousemove", onMove);
      grid.removeEventListener("mouseleave", onLeave);
    };
  }, [disable]);

  return (
    <div
      ref={gridRef}
      className={`bento-section grid grid-cols-1 gap-3 md:grid-cols-3 md:grid-flow-dense ${className}`}
      style={
        {
          "--glow-color": GLOW,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

export function MagicBentoCard({
  label,
  children,
  className = "",
  href,
  span = "1x1",
}: {
  label?: string;
  children: ReactNode;
  className?: string;
  href?: string;
  span?: "1x1" | "2x2" | "1x2" | "2x1" | "3x1";
}) {
  const style = {
    "--glow-x": "50%",
    "--glow-y": "50%",
    "--glow-intensity": "0",
    "--glow-radius": "220px",
  } as CSSProperties;

  const inner = (
    <>
      {label ? (
        <div
          className="kicker mb-2"
          style={
            className.includes("text-white")
              ? { color: "rgba(255,255,255,0.7)" }
              : undefined
          }
        >
          {label}
        </div>
      ) : null}
      {children}
    </>
  );

  const spanClass =
    span === "2x2"
      ? "md:col-span-2 md:row-span-2"
      : span === "1x2"
        ? "md:row-span-2"
        : span === "2x1"
          ? "md:col-span-2"
          : span === "3x1"
            ? "md:col-span-3"
            : "";

  const cls = `card relative overflow-hidden rounded-[12px] border border-[var(--hairline)] p-3.5 md:p-4 ${spanClass} ${
    className.includes("bg-") ? className : `bg-[var(--surface)] ${className}`
  }`;

  if (href) {
    return (
      <a data-bento-card href={href} className={cls} style={style}>
        {inner}
      </a>
    );
  }
  return (
    <section data-bento-card className={cls} style={style}>
      {inner}
    </section>
  );
}
