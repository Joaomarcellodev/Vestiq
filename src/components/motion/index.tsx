"use client";

/**
 * Small, restrained motion primitives (built on `motion`, inspired by
 * reactbits.dev). Every one degrades to a plain element when the user prefers
 * reduced motion.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useInView, useMotionValue, useSpring, type Variants } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * Hydration-safe reduced-motion check. O `useReducedMotion` da lib lê a
 * preferência do sistema de forma síncrona já na primeira renderização do
 * cliente, mas o servidor nunca sabe essa preferência — o `getServerSnapshot`
 * abaixo garante que os dois concordam (`false`) na primeira renderização,
 * evitando o descompasso de `useId()` no formulário de login.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

/** Fade + rise on mount. */
export function Reveal({
  children,
  delay = 0,
  y = 12,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "ul" | "section";
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    if (as === "ul") return <ul className={className}>{children}</ul>;
    if (as === "section") return <section className={className}>{children}</section>;
    return <div className={className}>{children}</div>;
  }
  const M = as === "ul" ? motion.ul : as === "section" ? motion.section : motion.div;
  return (
    <M
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: EASE }}
    >
      {children}
    </M>
  );
}

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
};

/** `<ul>` that staggers its `<RevealItem>` children into view. */
export function RevealList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <ul className={className}>{children}</ul>;
  return (
    <motion.ul className={className} variants={listVariants} initial="hidden" animate="show">
      {children}
    </motion.ul>
  );
}

export function RevealItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <li className={className}>{children}</li>;
  return (
    <motion.li className={className} variants={itemVariants}>
      {children}
    </motion.li>
  );
}

/** `<div>` grid/flow that staggers `<RevealItem as="div">`-style children. */
export function RevealGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={listVariants} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

export function RevealCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

/** Animated number that counts from 0 → `value` when scrolled into view. */
export function CountUp({
  value,
  format = (n) => String(Math.round(n)),
  className,
  duration = 1.1,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: duration * 1000, bounce: 0 });
  const [display, setDisplay] = useState(() => format(0));

  useEffect(() => {
    if (reduce) return;
    if (inView) mv.set(value);
    const unsub = spring.on("change", (v) => setDisplay(format(v)));
    return () => unsub();
  }, [inView, value, reduce, mv, spring, format]);

  return (
    <span ref={ref} className={className}>
      {reduce ? format(value) : display}
    </span>
  );
}
