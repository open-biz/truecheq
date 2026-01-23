"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useAnimation, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

// --- BackgroundBeams (Inspired by Aceternity) ---
export const BackgroundBeams = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "absolute inset-0 z-0 h-full w-full [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]",
        className
      )}
    >
      <svg
        className="absolute h-full w-full opacity-30"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="white"
              strokeWidth="0.5"
              strokeOpacity="0.1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F14] via-transparent to-transparent" />
    </div>
  );
};

// --- BorderBeam (Inspired by Magic UI) ---
export const BorderBeam = ({
  size = 200,
  duration = 15,
  anchor = 90,
  borderWidth = 1.5,
  colorFrom = "#00D632",
  colorTo = "#00D632",
  delay = 0,
  className,
}: {
  size?: number;
  duration?: number;
  anchor?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
  className?: string;
}) => {
  return (
    <div
      style={
        {
          "--size": size,
          "--duration": duration,
          "--anchor": anchor,
          "--border-width": borderWidth,
          "--color-from": colorFrom,
          "--color-to": colorTo,
          "--delay": delay,
        } as React.CSSProperties
      }
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] [border:calc(var(--border-width)*1px)_solid_transparent]",
        "![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(white,white)]",
        "after:absolute after:aspect-square after:w-[calc(var(--size)*1px)] after:animate-border-beam after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)] after:[offset-anchor:calc(var(--anchor)*1%)_50%] after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))]",
        className
      )}
    />
  );
};

// --- Marquee (Inspired by Magic UI) ---
export const Marquee = ({
  className,
  reverse,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  ...props
}: {
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  children?: React.ReactNode;
  vertical?: boolean;
  repeat?: number;
}) => {
  return (
    <div
      {...props}
      className={cn(
        "group flex overflow-hidden p-2 [--duration:40s] [--gap:1rem] [gap:var(--gap)]",
        {
          "flex-row": !vertical,
          "flex-col": vertical,
        },
        className
      )}
    >
      {Array(repeat)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            className={cn("flex shrink-0 justify-around [gap:var(--gap)]", {
              "animate-marquee flex-row": !vertical,
              "animate-marquee-vertical flex-col": vertical,
              "group-hover:[animation-play-state:paused]": pauseOnHover,
              "[animation-direction:reverse]": reverse,
            })}
          >
            {children}
          </div>
        ))}
    </div>
  );
};

// --- TruCheqCoin ---
export const TruCheqCoin = ({ active }: { active: boolean }) => {
  return (
    <div className="relative flex items-center justify-center">
      <div
        className={cn(
          "w-16 h-16 rounded-full border-4 transition-all duration-700 ease-in-out",
          active
            ? "border-primary shadow-[0_0_20px_rgba(0,214,50,0.5)] bg-primary/10"
            : "border-muted/50 bg-transparent"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-opacity duration-500",
            active ? "opacity-100" : "opacity-30"
          )}
        >
          <span className="text-xl font-bold italic">Q</span>
        </div>
      </div>
      <motion.div
        initial={false}
        animate={
          active
            ? { scale: 1, opacity: 1, rotate: 45 }
            : { scale: 0, opacity: 0, rotate: 0 }
        }
        className="absolute w-6 h-2 bg-primary rounded-full origin-top-left translate-x-3 translate-y-3"
      />
    </div>
  );
};

// --- AnimatedBeam (Simplified Logic for Bento) ---
export const AnimatedBeam = ({
  className,
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  duration = Math.random() * 3 + 4,
  delay = 0,
}: {
  className?: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  fromRef: React.RefObject<HTMLDivElement | null>;
  toRef: React.RefObject<HTMLDivElement | null>;
  curvature?: number;
  reverse?: boolean;
  duration?: number;
  delay?: number;
}) => {
  const [path, setPath] = useState("");

  useEffect(() => {
    const updatePath = () => {
      if (containerRef.current && fromRef.current && toRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const fromRect = fromRef.current.getBoundingClientRect();
        const toRect = toRef.current.getBoundingClientRect();

        const startX = fromRect.left - containerRect.left + fromRect.width / 2;
        const startY = fromRect.top - containerRect.top + fromRect.height / 2;
        const endX = toRect.left - containerRect.left + toRect.width / 2;
        const endY = toRect.top - containerRect.top + toRect.height / 2;

        const controlY = startY + (endY - startY) / 2 + curvature;
        setPath(`M ${startX} ${startY} Q ${(startX + endX) / 2} ${controlY} ${endX} ${endY}`);
      }
    };

    updatePath();
    window.addEventListener("resize", updatePath);
    return () => window.removeEventListener("resize", updatePath);
  }, [containerRef, fromRef, toRef, curvature]);

  return (
    <svg
      fill="none"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("pointer-events-none absolute inset-0", className)}
    >
      <path
        d={path}
        stroke="var(--primary)"
        strokeOpacity="0.2"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <motion.path
        d={path}
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          duration: duration,
          delay: delay,
          repeat: Infinity,
          ease: "linear",
          repeatType: reverse ? "reverse" : "loop",
        }}
      />
    </svg>
  );
};
