"use client";

import { useEffect, useState } from "react";
import { PulseMark } from "@/components/ui/PulseMark";

const KEY = "pp-enter";
const HOLD_MS = 1800;

export function PageEnter({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShow(false);
      return;
    }
    try {
      if (sessionStorage.getItem(KEY) === "1") {
        setShow(false);
        return;
      }
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* private mode */
    }
    setShow(true);
    const t = window.setTimeout(() => setShow(false), HOLD_MS);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      {children}
      {show ? (
        <div
          className="page-enter"
          aria-hidden
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) setShow(false);
          }}
        >
          <div className="page-enter-inner">
            <PulseMark size={56} splash />
            <p className="page-enter-word">Portfolio Pulse</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
