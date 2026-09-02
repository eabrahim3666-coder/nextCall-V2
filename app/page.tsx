"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";

import { SmoothScroll } from "@/components/SmoothScroll";
import { ScrollProgress } from "@/components/ScrollProgress";
import { SceneStack } from "@/components/landing/SceneStack";
import { Section3D } from "@/components/Section3D";
import { Navigation } from "@/components/navigation";
import { Hero } from "@/components/hero";
import { Features } from "@/components/features";
import { HowItWorks } from "@/components/how-it-works";
import IntegrationsSection from "@/components/IntegrationsSection";
import { Industries } from "@/components/industries";
import { Testimonials } from "@/components/testimonials";
import { Pricing } from "@/components/pricing";
import { Faq } from "@/components/faq";
import { Contact } from "@/components/contact";
import { FinalCta } from "@/components/final-cta";
import { Footer } from "@/components/footer";

const BG_DARK = "#050507";
const BG_PITCH = "#000000";
const BG_LIGHT = "#ffffff";

export default function Home() {
  const toastTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Clear any pending toast timers if the page unmounts mid-countdown.
  useEffect(() => () => { toastTimers.current.forEach(clearTimeout); }, []);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    topic: "general",
    message: "",
    _hp: "",
  });
  const [submissions, setSubmissions] = useState<
    Array<{
      id: number;
      name: string;
      email: string;
      topic: string;
      message: string;
      timestamp: string;
      status: string;
    }>
  >([]);
  // Read ?ref= AFTER mount so SSR and the first client render match (reading
  // window during render caused a hydration mismatch on ref links).
  const [refCode, setRefCode] = useState("");
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) setRefCode(ref);
  }, []);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<
    Array<{ id: number; message: string; type: "success" | "error" | "info" }>
  >([]);

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "success"
  ) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
    toastTimers.current.push(timer);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      showToast("Please fill in all fields", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        setFormData({
          name: "",
          email: "",
          topic: "general",
          message: "",
          _hp: "",
        });
        showToast("Question sent! We'll get back to you soon.", "success");
      } else {
        showToast("Failed to send. Please try again.", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const clearSubmissions = () => {
    setSubmissions([]);
    showToast("All submissions cleared", "info");
  };

  const toastColors: Record<string, string> = {
    success: "border-emerald-500/30 bg-emerald-500/10",
    error: "border-rose-500/30 bg-rose-500/10",
    info: "border-indigo-500/30 bg-indigo-500/10",
  };
  const toastIconColors: Record<string, string> = {
    success: "text-emerald-400",
    error: "text-rose-400",
    info: "text-indigo-400",
  };

  return (
    <SmoothScroll>
      <div className="relative bg-[#050507] text-white min-h-screen overflow-x-clip">
        <ScrollProgress />
        <Navigation />
        <main>
          <SceneStack
            scenes={[
              {
                id: "top",
                bg: "#050505",
                children: (
                  <Section3D intensity="subtle" bg="#050505" preserveOpacity minHeight="calc(64svh - 96px)">
                    <Hero />
                  </Section3D>
                ),
              },
              {
                id: "features",
                // nav target: #features (no inner-section id exists)
                anchor: "#features",
                bg: "#060606",
                children: (
                  <Section3D intensity="medium" bg="#060606">
                    <Features />
                  </Section3D>
                ),
              },
              {
                id: "how",
                anchor: "#how-it-works", // matches HowItWorks's own section id
                bg: BG_LIGHT,
                children: (
                  <Section3D intensity="medium" bg={BG_LIGHT}>
                    <HowItWorks />
                  </Section3D>
                ),
              },
              {
                id: "integrations",
                anchor: "#built-on", // matches IntegrationsSection's own id
                bg: BG_DARK,
                children: <IntegrationsSection />,
              },
              {
                bg: BG_PITCH,
                children: (
                  <Section3D intensity="medium" bg={BG_PITCH}>
                    <Industries />
                  </Section3D>
                ),
              },
              {
                bg: BG_PITCH,
                children: (
                  <Section3D intensity="medium" bg={BG_PITCH}>
                    <Testimonials />
                  </Section3D>
                ),
              },
              {
                // No wrapper id — the Pricing section itself is #pricing
                // (duplicate ids break getElementById + anchor semantics).
                bg: BG_PITCH,
                children: (
                  <Section3D intensity="medium" bg={BG_PITCH}>
                    <Pricing refCode={refCode} />
                  </Section3D>
                ),
              },
              {
                // No wrapper id — the Faq section itself is #faq
                bg: BG_PITCH,
                children: (
                  <Section3D intensity="medium" bg={BG_PITCH}>
                    <Faq />
                  </Section3D>
                ),
              },
              {
                // No wrapper id — the Contact section itself is #ask
                anchor: "#ask",
                bg: BG_PITCH,
                children: (
                  <Section3D intensity="subtle" bg={BG_PITCH} preserveOpacity>
                    <Contact
                      formData={formData}
                      setFormData={setFormData}
                      loading={loading}
                      handleSubmit={handleSubmit}
                      submissions={submissions}
                      showPanel={showPanel}
                      setShowPanel={setShowPanel}
                      clearSubmissions={clearSubmissions}
                    />
                  </Section3D>
                ),
              },
              {
                bg: "#0a0a0a",
                children: (
                  <Section3D intensity="subtle" bg="#0a0a0a">
                    <FinalCta />
                  </Section3D>
                ),
              },
            ]}
          />
        </main>
        <Footer />

        {/* TOASTS */}
        <div className="fixed bottom-6 right-6 z-[9998] flex flex-col gap-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border backdrop-blur-xl animate-toast-in ${toastColors[toast.type]}`}
            >
              <Icon
                icon={
                  toast.type === "success"
                    ? "lucide:check-circle"
                    : toast.type === "error"
                      ? "lucide:alert-circle"
                      : "lucide:info"
                }
                width={18}
                className={toastIconColors[toast.type]}
              />
              <span className="text-sm text-white">{toast.message}</span>
            </div>
          ))}
        </div>
      </div>
    </SmoothScroll>
  );
}
