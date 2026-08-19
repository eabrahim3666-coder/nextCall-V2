"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

import { SmoothScroll } from "@/components/SmoothScroll";
import { ScrollProgress } from "@/components/ScrollProgress";
import { Section3D } from "@/components/Section3D";
import { Navigation } from "@/components/navigation";
import { Hero } from "@/components/hero";
import { Features } from "@/components/features";
import { HowItWorks } from "@/components/how-it-works";
import { Integrations } from "@/components/integrations";
import { Industries } from "@/components/industries";
import { Testimonials } from "@/components/testimonials";
import { Pricing } from "@/components/pricing";
import { Faq } from "@/components/faq";
import { Contact } from "@/components/contact";
import { FinalCta } from "@/components/final-cta";
import { Footer } from "@/components/footer";

const BG_DARK = "#0C0C0C";

export default function Home() {
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
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const refCode = searchParams?.get("ref") || "";
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
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
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
      <div className="relative bg-[#0C0C0C] text-white min-h-screen overflow-x-clip">
        <ScrollProgress />
        <Navigation />
        <main>
          {/* Hero — subtle 3D so its internal parallax stays the star */}
          <Section3D id="top" intensity="subtle" bg={BG_DARK}>
            <Hero />
          </Section3D>

          {/* Feature grid — medium 3D slide */}
          <Section3D id="features" intensity="medium" bg={BG_DARK}>
            <Features />
          </Section3D>

          {/* How it works — medium 3D */}
          <Section3D id="how-it-works" intensity="medium" bg={BG_DARK}>
            <HowItWorks />
          </Section3D>

          {/* Integrations — dark editorial section */}
          <Section3D id="built-on" intensity="medium" bg={BG_DARK}>
            <Integrations />
          </Section3D>

          {/* Industries — back to dark immersive */}
          <Section3D intensity="medium" bg={BG_DARK}>
            <Industries />
          </Section3D>

          {/* Testimonials — dark */}
          <Section3D intensity="medium" bg={BG_DARK}>
            <Testimonials />
          </Section3D>

          {/* Pricing — dark, center card elevated */}
          <Section3D id="pricing" intensity="medium" bg={BG_DARK}>
            <Pricing refCode={refCode} />
          </Section3D>

          {/* FAQ — dark accordion */}
          <Section3D id="faq" intensity="medium" bg={BG_DARK}>
            <Faq />
          </Section3D>

          {/* Contact — dark editorial */}
          <Section3D id="ask" intensity="medium" bg={BG_DARK}>
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

          {/* Final CTA — subtle */}
          <Section3D intensity="subtle" bg={BG_DARK}>
            <FinalCta />
          </Section3D>
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