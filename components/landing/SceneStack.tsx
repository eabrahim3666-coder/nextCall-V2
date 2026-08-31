"use client";

import { ReactNode, useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";

interface Scene { id?: string; bg: string; children: ReactNode; }

export function SceneStack({ scenes }: { scenes: Scene[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [sceneSpaces, setSceneSpaces] = useState<number[]>(scenes.map(() => 1));

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

  return (
    <div ref={ref} style={{ height: `${totalSpaces * 100}vh` }} className="relative">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
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
