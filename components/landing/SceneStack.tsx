"use client";

import { ReactNode, useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { activeLenis } from "@/components/SmoothScroll";

interface Scene { id?: string; anchor?: string; bg: string; children: ReactNode; }

export function SceneStack({ scenes }: { scenes: Scene[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [sceneSpaces, setSceneSpaces] = useState<number[]>(scenes.map(() => 1));
  const [isTouch, setIsTouch] = useState(false);

  // On touch devices (Android/iOS) native scrolling is used, so the custom
  // transform-based slide system is skipped entirely. This fixes "can't scroll
  // up" on Android and keeps scrolling 1:1 and buttery on phones.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: coarse)");
    const apply = () => setIsTouch(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Measure each scene's content → allocate scroll space (tall scenes get 2+ viewports)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const measure = () => {
      const viewport = window.innerHeight;
      const scenesEls = ref.current?.querySelectorAll<HTMLDivElement>(":scope > div > div") || [];
      const newSpaces: number[] = [];
      scenesEls.forEach((scene, idx) => {
        const inner = (scene as HTMLElement | null)?.querySelector(":scope > div") ?? null;
        const contentH = inner ? inner.scrollHeight : viewport;
        let spaces = Math.max(1, Math.ceil(contentH / viewport));
        // Hero is short (64svh) — give it minimal scroll so first wheel isn't dead
        if (idx === 0 && contentH < viewport) spaces = 0.35;
        newSpaces.push(spaces);
      });
      if (newSpaces.length > 0) setSceneSpaces(newSpaces);
    };
    const t1 = setTimeout(measure, 200);
    const t2 = setTimeout(measure, 1000);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener("resize", measure); };
  }, [scenes.length]);

  const totalSpaces = sceneSpaces.reduce((sum, s) => sum + s, 0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  // Desktop anchor navigation: scenes live inside transformed containers, so
  // native hash-jumps can't reach them. Navigation dispatches `nav-scroll`
  // with the target hash; here we translate it into the pixel offset where
  // that scene becomes the active viewport, and drive Lenis (or a native
  // smooth scroll fallback) to it. Keep refs to the latest measurements so
  // the listener never goes stale.
  const spacesRef = useRef(sceneSpaces);
  spacesRef.current = sceneSpaces;
  useEffect(() => {
    const onNavScroll = (e: Event) => {
      const hash = (e as CustomEvent<{ hash?: string }>).detail?.hash;
      if (!hash) return;
      const idx = scenes.findIndex((s) => s.anchor === hash || `#${s.id}` === hash);
      if (idx === -1) return;

      const spaces = spacesRef.current;
      const total = spaces.reduce((sum, s) => sum + s, 0);
      const before = spaces.slice(0, idx).reduce((sum, s) => sum + s, 0);
      const targetEl = document.getElementById(hash.slice(1));
      const innerOffset = targetEl?.offsetTop ?? 0;
      // Scroll a touch past the slide-up so the scene is fully in view, plus
      // any offset of the anchor element inside the scene's content.
      const progress = (before + Math.min(spaces[idx] || 1, 1) * 0.15) / total;
      const y = progress * (ref.current?.offsetHeight ?? 0) + innerOffset;

      if (activeLenis) {
        activeLenis.scrollTo(y, { duration: 1.4 });
      } else {
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    };
    window.addEventListener("nav-scroll", onNavScroll as EventListener);
    return () => window.removeEventListener("nav-scroll", onNavScroll as EventListener);
  }, [scenes]);

  // Mobile / touch: render scenes as a normal stacked document so the browser's
  // native touch scroll works flawlessly (no transforms, no sticky tricks).
  if (isTouch) {
    return (
      <div className="relative w-full">
        {scenes.map((scene, i) => (
          <div
            key={i}
            id={scene.id}
            className="relative w-full"
            style={{ background: scene.bg }}
          >
            {scene.children}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} style={{ height: `${totalSpaces * 100}svh` }} className="relative">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {scenes.map((scene, i) => (
          <SceneSlide key={i} index={i} sceneSpaces={sceneSpaces} totalSpaces={totalSpaces}
            scrollYProgress={scrollYProgress} bg={scene.bg} id={scene.id}>
            {scene.children}
          </SceneSlide>
        ))}
      </div>
    </div>
  );
}

function SceneSlide({ index, sceneSpaces, totalSpaces, scrollYProgress, bg, id, children }: {
  index: number; sceneSpaces: number[]; totalSpaces: number;
  scrollYProgress: MotionValue<number>; bg: string; id?: string; children: ReactNode;
}) {
  const spacesBefore = sceneSpaces.slice(0, index).reduce((sum, s) => sum + s, 0);
  const mySpaces = sceneSpaces[index] || 1;
  const startProgress = spacesBefore / totalSpaces;
  const endProgress = (spacesBefore + mySpaces) / totalSpaces;
  const slideEndProgress = startProgress + 1 / totalSpaces;

  // Slide-up: 100% → 0% during [startProgress, slideEndProgress]
  // Base scene (i=0) is always at 0% (must call useTransform unconditionally for rules-of-hooks)
  const sceneY = useTransform(
    scrollYProgress,
    index === 0 ? [0, 0] : [startProgress, slideEndProgress],
    index === 0 ? ["0%", "0%"] : ["100%", "0%"]
  );

  return (
    <motion.div id={id} className="absolute inset-0 overflow-hidden"
      style={{ y: index === 0 ? undefined : sceneY, background: bg, isolation: "isolate" }}>
      <InnerScroll scrollYProgress={scrollYProgress} startProgress={startProgress}
        endProgress={endProgress} slideEndProgress={slideEndProgress} isBase={index === 0}>
        {children}
      </InnerScroll>
    </motion.div>
  );
}

function InnerScroll({ scrollYProgress, startProgress, endProgress, slideEndProgress, isBase, children }: {
  scrollYProgress: MotionValue<number>; startProgress: number; endProgress: number;
  slideEndProgress: number; isBase?: boolean; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [maxScroll, setMaxScroll] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const measure = () => {
      if (ref.current) {
        setMaxScroll(Math.max(0, ref.current.scrollHeight - window.innerHeight));
      }
    };
    const t1 = setTimeout(measure, 200);
    const t2 = setTimeout(measure, 1000);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener("resize", measure); };
  }, []);

  // After slide-up completes, content scrolls internally from 0 → -maxScroll
  const innerY = useTransform(
    scrollYProgress,
    isBase ? [startProgress, endProgress] : [slideEndProgress, endProgress],
    [0, -maxScroll]
  );

  // Base scene with no overflow shouldn't consume scroll — render static but keep hook order
  if (isBase && maxScroll === 0) {
    return <div ref={ref as any} className="w-full">{children}</div>;
  }

  return <motion.div ref={ref} style={{ y: innerY, willChange: "transform" }} className="w-full">{children}</motion.div>;
}
