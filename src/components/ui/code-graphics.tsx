"use client";

import React, { useEffect, useRef, useState, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// --- RetroGrid (Animated Perspective Grid) ---
export const RetroGrid = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "pointer-events-none absolute h-full w-full overflow-hidden opacity-40 [perspective:200px]",
        className
      )}
    >
      {/* Grid */}
      <div className="absolute inset-0 [transform:rotateX(35deg)]">
        <div
          className={cn(
            "animate-grid",
            "[background-repeat:repeat] [background-size:60px_60px] [height:300%] [inset:0%_0px] [margin-left:-50%] [transform-origin:100%_0_0] [width:200%]",
            "[background-image:linear-gradient(to_right,rgba(255,255,255,0.2)_1px,transparent_0),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_0)]"
          )}
        />
      </div>

      {/* Gradient Fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent to-90%" />
    </div>
  );
};

// --- BorderBeam (Fixed and Optimized) ---
export const BorderBeam = ({
  size = 200,
  duration = 15,
  anchor = 90,
  borderWidth = 1.5,
  colorFrom = "var(--primary)",
  colorTo = "var(--primary)",
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

// --- Spotlight (The "Cool Pointer") ---
export const Spotlight = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    const handleMouseEnter = () => setOpacity(1);
    const handleMouseLeave = () => setOpacity(0);

    window.addEventListener("mousemove", handleMouseMove);
    document.body.addEventListener("mouseenter", handleMouseEnter);
    document.body.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.body.removeEventListener("mouseenter", handleMouseEnter);
      document.body.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[100] transition-opacity duration-300"
      animate={{
        background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(0, 214, 50, 0.05), transparent 80%)`,
        opacity: opacity,
      }}
    />
  );
};

// --- Marquee ---
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
          "flex-col h-full": vertical,
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
          "w-16 h-16 rounded-full border-4 transition-all duration-700 ease-in-out z-10 bg-background",
          active
            ? "border-primary shadow-[0_0_30px_rgba(0,214,50,0.6)]"
            : "border-muted/30"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-all duration-500",
            active ? "opacity-100 scale-110" : "opacity-30 scale-100"
          )}
        >
          <span className="text-2xl font-black italic text-primary">Q</span>
        </div>
      </div>
      
      <AnimatePresence>
        {active && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1.4 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 rounded-full border border-primary/30 z-0"
            />
        )}
      </AnimatePresence>

      <motion.div
        initial={false}
        animate={
          active
            ? { scale: 1, opacity: 1, rotate: 45, x: 12, y: 12 }
            : { scale: 0, opacity: 0, rotate: 0, x: 0, y: 0 }
        }
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="absolute w-8 h-2.5 bg-primary rounded-full shadow-[0_0_15px_rgba(0,214,50,0.5)] z-20"
      />
    </div>
  );
};

// --- FloatingOrbs (Animated floating gradient orbs for parallax background) ---
export const FloatingOrbs = ({ className }: { className?: string }) => {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-[120px]"
        style={{ 
          background: 'radial-gradient(circle, rgba(0,214,50,0.4) 0%, transparent 70%)',
          top: '10%', 
          left: '10%',
          opacity: 0.2,
        }}
        animate={{
          x: [0, 100, 0],
          y: [0, -50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full blur-[100px]"
        style={{ 
          background: 'radial-gradient(circle, rgba(0,150,255,0.3) 0%, transparent 70%)',
          top: '50%', 
          right: '10%',
          opacity: 0.15,
        }}
        animate={{
          x: [0, -80, 0],
          y: [0, 80, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full blur-[80px]"
        style={{ 
          background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
          bottom: '10%', 
          left: '30%',
          opacity: 0.1,
        }}
        animate={{
          x: [0, 60, 0],
          y: [0, -100, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
};

// --- ScrollReveal (Component that animates on scroll) ---
export const ScrollReveal = ({ 
  children, 
  className,
  delay = 0,
  direction = 'up'
}: { 
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}) => {
  const directionMap = {
    up: { y: 40 },
    down: { y: -40 },
    left: { x: 40 },
    right: { x: -40 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directionMap[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// --- Card3DTilt (Card with 3D tilt effect on hover) ---
export const Card3DTilt = ({ 
  children, 
  className,
  tiltIntensity = 10
}: { 
  children: React.ReactNode;
  className?: string;
  tiltIntensity?: number;
}) => {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -tiltIntensity;
    const rotateY = ((x - centerX) / centerX) * tiltIntensity;
    
    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        transformStyle: 'preserve-3d',
      }}
      animate={{
        rotateX: rotate.x,
        rotateY: rotate.y,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.div>
  );
};

// --- GradientText (Text with animated gradient) ---
export const GradientText = ({ 
  children, 
  className,
  gradient = 'from-primary via-green-400 to-primary'
}: { 
  children: React.ReactNode;
  className?: string;
  gradient?: string;
}) => {
  return (
    <span className={cn(
      "bg-gradient-to-r bg-clip-text text-transparent animate-gradient",
      gradient,
      className
    )}>
      {children}
    </span>
  );
};

// --- AnimatedBeam ---
export const AnimatedBeam = ({
  className,
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  duration = 3,
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
  const [path, setPath] = useState("M0 0");
  const svgId = useId();
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const updatePath = () => {
      if (containerRef.current && fromRef.current && toRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const fromRect = fromRef.current.getBoundingClientRect();
        const toRect = toRef.current.getBoundingClientRect();

        if (containerRect.width === 0 || fromRect.width === 0 || toRect.width === 0) return;

        const startX = fromRect.left - containerRect.left + fromRect.width / 2;
        const startY = fromRect.top - containerRect.top + fromRect.height / 2;
        const endX = toRect.left - containerRect.left + toRect.width / 2;
        const endY = toRect.top - containerRect.top + toRect.height / 2;

        const controlY = startY + (endY - startY) / 2 + curvature;
        const controlX = startX + (endX - startX) / 2;
        
        setPath(`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`);
        setOpacity(1);
      }
    };

    updatePath();
    const interval = setInterval(updatePath, 100);
    setTimeout(() => clearInterval(interval), 2000);

    const observer = new ResizeObserver(updatePath);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener("resize", updatePath);
    
    return () => {
      clearInterval(interval);
      observer.disconnect();
      window.removeEventListener("resize", updatePath);
    };
  }, [containerRef, fromRef, toRef, curvature]);

  return (
    <svg
      fill="none"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("pointer-events-none absolute inset-0 z-0", className)}
      style={{ opacity: opacity, transition: "opacity 0.3s" }}
    >
      <defs>
        <linearGradient id={svgId} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0" />
          <stop offset="50%" stopColor="var(--primary)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={path}
        stroke="var(--primary)"
        strokeOpacity="0.1"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <motion.path
        d={path}
        stroke={`url(#${svgId})`}
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0.2, pathOffset: 0, opacity: 0 }}
        animate={{ 
            pathOffset: reverse ? [-1, 0] : [0, 1],
            opacity: [0, 1, 1, 0] 
        }}
        transition={{
          duration: duration,
          delay: delay,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.circle
        r="3"
        fill="var(--primary)"
        initial={{ offsetDistance: "0%", opacity: 0 }}
        animate={{ 
            offsetDistance: "100%",
            opacity: [0, 1, 0]
        }}
        style={{ offsetPath: `path('${path}')` }}
        transition={{
            duration: duration,
            delay: delay,
            repeat: Infinity,
            ease: "easeInOut",
        }}
        className="shadow-[0_0_10px_var(--primary)]"
      />
    </svg>
  );
};
