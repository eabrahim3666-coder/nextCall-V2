"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden transition-all duration-300 hover:border-white/[0.12]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <span className="text-sm font-medium text-white pr-4">{question}</span>
        <span className={`text-neutral-500 transition-transform duration-300 flex-shrink-0 ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="px-6 pb-6 pt-0">
          <p className="text-sm text-neutral-400 leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
}


export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
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
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const refCode = searchParams?.get('ref') || '';
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
      // Send email
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        setFormData({ name: "", email: "", topic: "general", message: "", _hp: "" });
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

  const animRefs = useRef<HTMLElement[]>([]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            element.style.opacity = "1";
            element.style.transform = "translateY(0)";
            element.style.filter = "blur(0)";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    animRefs.current.forEach((el) => {
      if (el) {
        el.style.opacity = "0";
        el.style.transform = "translateY(24px)";
        el.style.filter = "blur(4px)";
        el.style.transition = "all 0.8s cubic-bezier(0.16,1,0.3,1)";
        observer.observe(el);
      }
    });
    return () => observer.disconnect();
  }, []);

  const addAnimRef = (el: HTMLElement | null) => {
    if (el && !animRefs.current.includes(el)) animRefs.current.push(el);
  };

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.background = `radial-gradient(600px circle at ${e.clientX - rect.left}px ${e.clientY - rect.top}px, rgba(255,255,255,0.06), transparent 40%)`;
  };
  const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.background = "transparent";
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
    <div className="grain text-white antialiased">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-6 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Next Call" className="h-8 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-xs font-medium text-neutral-400 hover:text-white transition-colors duration-300">Features</a>
            <a href="#how-it-works" className="text-xs font-medium text-neutral-400 hover:text-white transition-colors duration-300">How It Works</a>
            <a href="#built-on" className="text-xs font-medium text-neutral-400 hover:text-white transition-colors duration-300">Built On</a>
            <a href="#ask" className="text-xs font-medium text-neutral-400 hover:text-white transition-colors duration-300">Ask Us</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="hidden sm:inline-flex items-center gap-2 text-xs font-medium bg-white text-black px-4 py-2 rounded-full hover:bg-neutral-200 transition-colors">
              Go to Dashboard <Icon icon="lucide:arrow-right" width={14} />
            </Link>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-neutral-400 hover:text-white transition-colors">
              <Icon icon="lucide:menu" width={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-[#050505]/95 backdrop-blur-xl flex flex-col items-center justify-center gap-6">
          <a href="#features" onClick={() => setMenuOpen(false)} className="text-lg font-medium text-neutral-300 hover:text-white">Features</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="text-lg font-medium text-neutral-300 hover:text-white">How It Works</a>
          <a href="#built-on" onClick={() => setMenuOpen(false)} className="text-lg font-medium text-neutral-300 hover:text-white">Built On</a>
          <a href="#ask" onClick={() => setMenuOpen(false)} className="text-lg font-medium text-neutral-300 hover:text-white">Ask Us</a>
          <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="text-lg font-medium text-indigo-400 hover:text-indigo-300">Go to Dashboard →</Link>
        </div>
      )}

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 grid-bg overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] float-1" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] float-2" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <div className="anim-up inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">AI-Powered Lead Capture</span>
          </div>

          <h1 className="anim-up delay-100 text-4xl md:text-7xl font-medium tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Never miss a lead,
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">even after hours</span>
          </h1>

          <p className="anim-up delay-200 mt-6 text-sm md:text-base font-light text-neutral-400 max-w-xl mx-auto leading-relaxed">
            Next Call Chat answers every call and chat when you can&apos;t. Capture leads, book appointments, and grow your business — 24/7.
          </p>

          <div className="anim-up delay-300 mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard" className="inline-flex items-center gap-2 bg-white text-black text-sm font-medium px-8 py-3.5 rounded-full hover:bg-neutral-200 transition-colors">
              Start Free Trial <Icon icon="lucide:arrow-right" width={16} />
            </Link>
            <a href="#how-it-works" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors px-6 py-3.5">
              <Icon icon="lucide:play-circle" width={18} /> See How It Works
            </a>
          </div>

          <div className="anim-up delay-400 mt-16 flex items-center justify-center gap-8 md:gap-16">
            <div className="text-center">
              <div className="text-sm md:text-base font-medium text-neutral-300">AI Phone Receptionist</div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 mt-1">24/7 Call Coverage</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-sm md:text-base font-medium text-neutral-300">Connect in Minutes</div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 mt-1">No Hardware Required</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-sm md:text-base font-medium text-neutral-300">Train With Your Data</div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 mt-1">No Coding Needed</div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <Icon icon="lucide:mouse" width={20} className="text-neutral-600 animate-bounce" />
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-400">Features</span>
            <h2 className="mt-4 text-3xl md:text-6xl font-semibold tracking-tight">Everything you <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">need</span></h2>
            <p className="mt-4 text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">Your AI receptionist that never sleeps, never takes a day off, and never misses an opportunity.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div ref={addAnimRef} className="group relative p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.05] transition-all duration-500" onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <Icon icon="lucide:phone-call" width={22} className="text-indigo-400" />
              </div>
              <h3 className="text-lg font-medium mb-3">AI Call Answering</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">Answers inbound calls with natural conversation. Captures caller info, intent, and schedules follow-ups automatically.</p>
            </div>

            <div ref={addAnimRef} className="group relative p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.05] transition-all duration-500" onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <Icon icon="lucide:message-circle" width={22} className="text-purple-400" />
              </div>
              <h3 className="text-lg font-medium mb-3">Live Chat AI</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">Engages website visitors in real-time. Qualifies leads, answers FAQs, and routes hot prospects straight to your team.</p>
            </div>

            <div ref={addAnimRef} className="group relative p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.05] transition-all duration-500" onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <Icon icon="lucide:calendar-check" width={22} className="text-emerald-400" />
              </div>
              <h3 className="text-lg font-medium mb-3">Auto Scheduling</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">Books appointments directly into your calendar. Syncs with Google, Outlook, and Calendly — zero back-and-forth.</p>
            </div>

            <div ref={addAnimRef} className="group relative p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.05] transition-all duration-500" onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}>
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <Icon icon="lucide:zap" width={22} className="text-rose-400" />
              </div>
              <h3 className="text-lg font-medium mb-3">Instant Lead Scoring</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">Every interaction is analyzed and scored. High-intent leads get flagged so you can prioritize the hottest opportunities.</p>
            </div>

            <div ref={addAnimRef} className="group relative p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.05] transition-all duration-500" onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <Icon icon="lucide:mail" width={22} className="text-amber-400" />
              </div>
              <h3 className="text-lg font-medium mb-3">Smart Follow-Ups</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">Sends personalized emails and texts after every conversation. No lead falls through the cracks — ever.</p>
            </div>

            <div ref={addAnimRef} className="group relative p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.05] transition-all duration-500" onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <Icon icon="lucide:bar-chart-3" width={22} className="text-cyan-400" />
              </div>
              <h3 className="text-lg font-medium mb-3">Real-Time Dashboard</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">See every call, chat, and lead in one place. Analytics that show what&apos;s working and where to improve.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] font-medium uppercase tracking-wider text-purple-400">How It Works</span>
            <h2 className="mt-4 text-3xl md:text-6xl font-semibold tracking-tight">Live in <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">5 minutes</span></h2>
            <p className="mt-4 text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">Three steps. Zero technical skills required. Seriously.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div ref={addAnimRef} className="relative text-center p-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 border border-indigo-500/20 text-indigo-400 text-lg font-semibold mb-6">1</div>
              <h3 className="text-lg font-medium mb-3">Connect Your Number</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">Forward your business line or add our chat widget to your site. Takes 2 clicks.</p>
            </div>
            <div ref={addAnimRef} className="relative text-center p-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20 text-purple-400 text-lg font-semibold mb-6">2</div>
              <h3 className="text-lg font-medium mb-3">Train Your AI</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">Upload your FAQs, services, and branding. The AI learns your business in minutes.</p>
            </div>
            <div ref={addAnimRef} className="relative text-center p-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-lg font-semibold mb-6">3</div>
              <h3 className="text-lg font-medium mb-3">Capture Every Lead</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">Go live and watch leads roll in — even at 2am. Your AI never stops.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PROUDLY BUILT ON */}
      <section id="built-on" className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] bg-indigo-500/[0.04] rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-400">Infrastructure</span>
            <h2 className="mt-4 text-3xl md:text-6xl font-semibold tracking-tight">Proudly Built <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">On</span></h2>
            <p className="mt-4 text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">Powered by the most reliable names in AI and communications.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-4xl mx-auto">
            <div ref={addAnimRef} className="glow-card group relative p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/40 transition-all duration-500 hover:-translate-y-1 text-center cursor-default" style={{ "--glow-color": "rgba(99,102,241,0.4)" } as React.CSSProperties}>
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors duration-500">
                <Icon icon="lucide:brain" width={24} className="text-indigo-400" />
              </div>
              <div className="text-sm font-medium text-white">OpenAI</div>
              <div className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">Conversational AI</div>
            </div>
            <div ref={addAnimRef} className="glow-card group relative p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-purple-500/40 transition-all duration-500 hover:-translate-y-1 text-center cursor-default" style={{ "--glow-color": "rgba(168,85,247,0.4)" } as React.CSSProperties}>
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors duration-500">
                <Icon icon="lucide:phone" width={24} className="text-purple-400" />
              </div>
              <div className="text-sm font-medium text-white">Twilio</div>
              <div className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">Voice & SMS</div>
            </div>
            <div ref={addAnimRef} className="glow-card group relative p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-emerald-500/40 transition-all duration-500 hover:-translate-y-1 text-center cursor-default" style={{ "--glow-color": "rgba(16,185,129,0.4)" } as React.CSSProperties}>
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors duration-500">
                <Icon icon="lucide:database" width={24} className="text-emerald-400" />
              </div>
              <div className="text-sm font-medium text-white">Supabase</div>
              <div className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">Database & Auth</div>
            </div>
            <div ref={addAnimRef} className="glow-card group relative p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-cyan-500/40 transition-all duration-500 hover:-translate-y-1 text-center cursor-default" style={{ "--glow-color": "rgba(6,182,212,0.4)" } as React.CSSProperties}>
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors duration-500">
                <Icon icon="lucide:cloud" width={24} className="text-cyan-400" />
              </div>
              <div className="text-sm font-medium text-white">Vercel</div>
              <div className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">Edge Hosting</div>
            </div>
          </div>

          <div className="mt-16 relative overflow-hidden marquee-mask">
            <div className="flex marquee-track whitespace-nowrap">
              <div className="flex items-center gap-12 px-6">
                <span className="text-neutral-600 text-sm font-medium flex items-center gap-2"><Icon icon="lucide:shield-check" width={16} className="text-neutral-700" />SOC 2 Compliant</span>
                <span className="text-neutral-600 text-sm font-medium flex items-center gap-2"><Icon icon="lucide:lock" width={16} className="text-neutral-700" />End-to-End Encrypted</span>
                <span className="text-neutral-600 text-sm font-medium flex items-center gap-2"><Icon icon="lucide:globe" width={16} className="text-neutral-700" />99.9% Uptime SLA</span>
                <span className="text-neutral-600 text-sm font-medium flex items-center gap-2"><Icon icon="lucide:zap" width={16} className="text-neutral-700" />&lt; 200ms Response</span>
                <span className="text-neutral-600 text-sm font-medium flex items-center gap-2"><Icon icon="lucide:server" width={16} className="text-neutral-700" />Edge Computing</span>
                <span className="text-neutral-600 text-sm font-medium flex items-center gap-2"><Icon icon="lucide:git-branch" width={16} className="text-neutral-700" />CI/CD Pipeline</span>
              </div>
              <div className="flex items-center gap-12 px-6">
                <span className="text-neutral-600 text-sm font-medium flex items-center gap-2"><Icon icon="lucide:shield-check" width={16} className="text-neutral-700" />SOC 2 Compliant</span>
                <span className="text-neutral-600 text-sm font-medium flex items-center gap-2"><Icon icon="lucide:lock" width={16} className="text-neutral-700" />End-to-End Encrypted</span>
                <span className="text-neutral-600 text-sm font-medium flex items-center gap-2"><Icon icon="lucide:globe" width={16} className="text-neutral-700" />99.9% Uptime SLA</span>
                <span className="text-neutral-600 text-sm font-medium flex items-center gap-2"><Icon icon="lucide:zap" width={16} className="text-neutral-700" />&lt; 200ms Response</span>
                <span className="text-neutral-600 text-sm font-medium flex items-center gap-2"><Icon icon="lucide:server" width={16} className="text-neutral-700" />Edge Computing</span>
                <span className="text-neutral-600 text-sm font-medium flex items-center gap-2"><Icon icon="lucide:git-branch" width={16} className="text-neutral-700" />CI/CD Pipeline</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ASK US */}

      {/* WHY NEXT CALL */}
      <section className="relative py-32 px-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-400">Why NextCall</span>
            <h2 className="mt-4 text-3xl md:text-6xl font-semibold tracking-tight">Built for <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">service businesses</span></h2>
            <p className="mt-4 text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">Plumbers, electricians, HVAC companies, roofers, cleaners, and local service pros who can't afford to miss a call.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="group relative p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 transition-all duration-500">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                <Icon icon="lucide:phone-call" width={20} className="text-indigo-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Never Miss a Call</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">AI answers every call within two rings — 24/7, even during lunch, after hours, and weekends. When a caller hangs up within 10 seconds, they get an automatic SMS so you don't lose the lead.</p>
            </div>

            <div className="group relative p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 transition-all duration-500">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                <Icon icon="lucide:calendar" width={20} className="text-purple-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Turn Calls Into Appointments</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">AI captures preferred dates and times from callers and creates Google Calendar events automatically. Customers get SMS and email reminders so they show up.</p>
            </div>

            <div className="group relative p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 transition-all duration-500">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                <Icon icon="lucide:message-circle" width={20} className="text-emerald-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Follow Up Automatically</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">After every call, customers get a branded email summary with what was discussed. Hot leads trigger instant notifications so you can follow up immediately.</p>
            </div>
          </div>

          {/* Capabilities bar */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
              <p className="text-sm font-medium text-white">24/7 AI Call Coverage</p>
              <p className="text-[10px] uppercase tracking-wider text-neutral-500 mt-1">Always On, Always Ready</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
              <p className="text-sm font-medium text-white">Google Calendar Booking</p>
              <p className="text-[10px] uppercase tracking-wider text-neutral-500 mt-1">Auto-Scheduled Appointments</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
              <p className="text-sm font-medium text-white">AI-Powered Lead Capture</p>
              <p className="text-[10px] uppercase tracking-wider text-neutral-500 mt-1">Sentiment & Intent Scoring</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
              <p className="text-sm font-medium text-white">Facebook & Instagram DM</p>
              <p className="text-[10px] uppercase tracking-wider text-neutral-500 mt-1">Auto-Replies Included</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="relative py-32 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-500/[0.04] rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-400">Pricing</span>
            <h2 className="mt-4 text-3xl md:text-6xl font-semibold tracking-tight">Simple, <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">transparent</span> pricing</h2>
            <p className="mt-4 text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">No hidden fees. No contracts. Cancel anytime. 3-day free trial included.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Standard Plan */}
            <div className="relative p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white">Standard</h3>
                <p className="text-xs text-neutral-500 mt-1">For small businesses getting started with AI</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-semibold text-white">$299</span>
                  <span className="text-sm text-neutral-500">/month</span>
                </div>
                <p className="text-xs text-neutral-600 mt-1">200 minutes included + $0.50/min overage</p>
              </div>

              <div className="space-y-3 mb-8">
                {[
                  "AI answers calls 24/7",
                  "Follow-up emails after every call",
                  "Appointment booking + email reminders",
                  "1 phone number",
                  "Call dashboard & basic analytics",
                  "Knowledge base training",
                  "Custom greeting",
                  "Emergency call routing",
                  "Daily summary emails",
                  "Email support",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-emerald-400 text-xs mt-0.5 flex-shrink-0">+</span>
                    <span className="text-sm text-neutral-300">{item}</span>
                  </div>
                ))}
              </div>

              <a href={`/dashboard${refCode ? `?ref=${refCode}` : ''}`} className="block w-full text-center bg-white/[0.05] border border-white/[0.1] text-white text-sm font-medium px-6 py-3.5 rounded-full hover:bg-white/[0.1] transition-colors">
                Start Free Trial
              </a>
            </div>

            {/* Premium Plan */}
            <div className="relative p-8 rounded-2xl bg-white/[0.03] border border-indigo-500/30 backdrop-blur-xl overflow-hidden">
              {/* Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[50px] pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Premium</h3>
                    <p className="text-xs text-neutral-500 mt-1">For growing businesses that need more power</p>
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">Popular</span>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-semibold text-white">$399</span>
                    <span className="text-sm text-neutral-500">/month</span>
                  </div>
                  <p className="text-xs text-neutral-600 mt-1">500 minutes included + $0.40/min overage</p>
                </div>

                <div className="space-y-3 mb-8">
                  {[
                    "Everything in Standard, plus:",
                    "3 phone numbers",
                    "Priority call routing rules",
                    "Advanced analytics dashboard",
                    "Lead value & revenue tracking",
                    "Call source breakdown",
                    "Conversion funnel",
                    "Peak hours heatmap",
                    "AI performance score",
                    "Priority support chat",
                  ].map((item, i) => (
                    <div key={i} className={`flex items-start gap-3 ${i === 0 ? "" : ""}`}>
                      <span className={`${i === 0 ? "text-indigo-400" : "text-emerald-400"} text-xs mt-0.5 flex-shrink-0`}>+</span>
                      <span className={`text-sm ${i === 0 ? "text-indigo-300 font-medium" : "text-neutral-300"}`}>{item}</span>
                    </div>
                  ))}
                </div>

                <a href={`/dashboard${refCode ? `?ref=${refCode}` : ''}`} className="block w-full text-center bg-white text-black text-sm font-medium px-6 py-3.5 rounded-full hover:bg-neutral-200 transition-colors">
                  Start Free Trial
                </a>
              </div>
            </div>
          </div>

          {/* Bottom note */}
          <div className="mt-8 text-center">
            <p className="text-xs text-neutral-600">Both plans include a 3-day free trial. No credit card required to start. Overage billed monthly.</p>
          </div>
        </div>
      </section>


      {/* FAQ */}
      <section className="relative py-32 px-6">
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] font-medium uppercase tracking-wider text-purple-400">FAQ</span>
            <h2 className="mt-4 text-3xl md:text-6xl font-semibold tracking-tight">Common <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">questions</span></h2>
            <p className="mt-4 text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">Everything you need to know before getting started.</p>
          </div>

          <div className="space-y-3">
            <FaqItem
              question="How does the AI answer calls?"
              answer="Next Call Chat connects to your business phone number. When a call comes in, our AI picks up within 2 rings, greets the caller naturally, and handles the conversation based on your business information. It can answer questions about your services, hours, and pricing, book appointments, and capture lead details — all in a natural voice that sounds like your front desk."
            />
            <FaqItem
              question="Will callers know it's an AI?"
              answer="Most callers can't tell the difference. The AI speaks naturally with appropriate pauses, tone variations, and conversational flow. It knows your business inside and out, so it responds with real answers — not robotic scripts. If a caller asks something the AI can't handle, it smoothly offers to take a message or transfer the call."
            />
            <FaqItem
              question="What happens after the call ends?"
              answer="You get an instant notification with the full call summary, caller details, sentiment analysis, and any appointments booked. If it's a hot lead, we flag it for you. The AI also sends a follow-up text or email to the caller automatically, so they feel taken care of even after hanging up."
            />
            <FaqItem
              question="Can I customize what the AI says?"
              answer="Absolutely. You control the AI's knowledge base — your services, pricing, hours, special offers, tone of voice, and more. Update it anytime from your dashboard. The AI adapts immediately. You can also set rules like 'always offer free estimates' or 'transfer emergency calls to my cell.'"
            />
            <FaqItem
              question="How many calls can it handle at once?"
              answer="Unlimited. Unlike a human receptionist who can only take one call at a time, Next Call Chat handles multiple calls simultaneously. During peak hours, holidays, or after hours — every single caller gets answered immediately. No hold music, no voicemail."
            />
            <FaqItem
              question="What's included in the $200/month plan?"
              answer="500 minutes of AI call time per month, unlimited chat conversations, SMS follow-ups, appointment scheduling, real-time analytics dashboard, sentiment tracking, and priority support. Additional minutes are $0.40 each. Most small businesses use 200-400 minutes per month, so 500 covers you comfortably."
            />
            <FaqItem
              question="Can I cancel anytime?"
              answer="Yes. No contracts, no commitments, no cancellation fees. Cancel from your dashboard with one click. We also include a 7-day free trial so you can see the results before paying anything."
            />
          </div>
        </div>
      </section>

      <section id="ask" className="relative py-32 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-500/[0.05] rounded-full blur-[120px] pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[10px] font-medium uppercase tracking-wider text-purple-400">Got Questions?</span>
            <h2 className="mt-4 text-3xl md:text-6xl font-semibold tracking-tight">Let&apos;s <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">talk about it</span></h2>
            <p className="mt-4 text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">Ask us anything about Next Call Chat. We&apos;ll get back to you within the hour.</p>
          </div>

          <div className="question-glow">
            <form onSubmit={handleSubmit} className="relative p-8 md:p-10 rounded-2xl bg-white/[0.03] backdrop-blur-xl">
              <div className="grid md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Your Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="John Doe" className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required placeholder="john@company.com" className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all" />
                </div>
              </div>
              <div className="mb-5">
                <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-2">What&apos;s on your mind?</label>
                <select value={formData.topic} onChange={(e) => setFormData({ ...formData, topic: e.target.value })} className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all appearance-none cursor-pointer">
                  <option value="general" className="bg-neutral-900">General Question</option>
                  <option value="pricing" className="bg-neutral-900">Pricing & Plans</option>
                  <option value="integration" className="bg-neutral-900">Integrations</option>
                  <option value="demo" className="bg-neutral-900">Request a Demo</option>
                  <option value="support" className="bg-neutral-900">Technical Support</option>
                  <option value="partnership" className="bg-neutral-900">Partnership</option>
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Your Question</label>
                <textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} required rows={4} placeholder="Tell us what you'd like to know..." className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none" />
              </div>
              <div className="hidden" aria-hidden="true">
                <input type="text" name="_hp" value={formData._hp} onChange={(e) => setFormData({ ...formData, _hp: e.target.value })} tabIndex={-1} autoComplete="off" />
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-[10px] text-neutral-600">We store this securely. No spam, ever.</p>
                <button type="submit" disabled={loading} className="inline-flex items-center gap-2 bg-white text-black text-sm font-medium px-8 py-3.5 rounded-full hover:bg-neutral-200 transition-colors w-full sm:w-auto justify-center disabled:opacity-30">
                  {loading ? "Sending..." : "Send Question"}
                </button>
              </div>
            </form>
          </div>

          <div className="mt-8 text-center">
            <button onClick={() => setShowPanel(!showPanel)} className="inline-flex items-center gap-2 text-xs font-medium text-neutral-500 hover:text-white transition-colors">
              <Icon icon="lucide:database" width={14} />
              View Stored Submissions
              <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-2 py-0.5 rounded-full">{submissions.length}</span>
            </button>
          </div>

          {showPanel && (
            <div className="mt-6 p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Icon icon="lucide:inbox" width={16} className="text-indigo-400" />
                  Question Submissions
                </h4>
                <button onClick={() => setShowPanel(false)} className="text-neutral-500 hover:text-white transition-colors">
                  <Icon icon="lucide:x" width={16} />
                </button>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {submissions.length === 0 ? (
                  <p className="text-xs text-neutral-600 text-center py-4">No submissions yet</p>
                ) : (
                  [...submissions].reverse().map((q) => (
                    <div key={q.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-white">{q.name}</span>
                          <span className="text-[10px] text-neutral-600">{q.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${q.status === "new" ? "bg-emerald-500/20 text-emerald-400" : "bg-neutral-500/20 text-neutral-400"}`}>{q.status}</span>
                          <span className="text-[10px] text-neutral-600">{new Date(q.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-indigo-400 mb-1">{q.topic}</div>
                      <p className="text-xs text-neutral-400 leading-relaxed">{q.message}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-white/[0.06] flex justify-end">
                <button onClick={clearSubmissions} className="text-[10px] uppercase tracking-wider text-rose-400 hover:text-rose-300 transition-colors">Clear All</button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA BAND */}
      <section className="relative py-24 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="relative p-12 md:p-16 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-white/[0.08] overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-6xl font-semibold tracking-tight">Ready to never<br /><span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">miss a lead?</span></h2>
              <p className="mt-4 text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">Start your free trial today. No credit card required. Set up in under 5 minutes.</p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/dashboard" className="inline-flex items-center gap-2 bg-white text-black text-sm font-medium px-8 py-3.5 rounded-full hover:bg-neutral-200 transition-colors">
                  Get Started Free <Icon icon="lucide:arrow-right" width={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12">
            <div>
              <div className="mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Next Call" className="h-8 w-auto" />
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed">AI-powered call & chat receptionist. Never miss another lead.</p>
            </div>
            <div>
              <h4 className="text-[10px] uppercase tracking-wider text-neutral-500 mb-4">Product</h4>
              <div className="space-y-2.5">
                <a href="#features" className="block text-sm text-neutral-400 hover:text-white transition-colors">Features</a>
                <Link href="/dashboard/settings" className="block text-sm text-neutral-400 hover:text-white transition-colors">Settings</Link>
                <a href="#built-on" className="block text-sm text-neutral-400 hover:text-white transition-colors">Integrations</a>
                <Link href="/dashboard" className="block text-sm text-neutral-400 hover:text-white transition-colors">Dashboard</Link>
              </div>
            </div>
            <div>
              <h4 className="text-[10px] uppercase tracking-wider text-neutral-500 mb-4">Company</h4>
              <div className="space-y-2.5">
                <a href="#how-it-works" className="block text-sm text-neutral-400 hover:text-white transition-colors">About</a>
                <a href="#ask" className="block text-sm text-neutral-400 hover:text-white transition-colors">Contact</a>
              </div>
            </div>
            <div>
              <h4 className="text-[10px] uppercase tracking-wider text-neutral-500 mb-4">Legal</h4>
              <div className="space-y-2.5">
                <Link href="/privacy" className="block text-sm text-neutral-400 hover:text-white transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="block text-sm text-neutral-400 hover:text-white transition-colors">Terms of Service</Link>
                <Link href="/pricing-policy" className="block text-sm text-neutral-400 hover:text-white transition-colors">Pricing</Link>
                <Link href="/terms#refund-policy" className="block text-sm text-neutral-400 hover:text-white transition-colors">Refund Policy</Link>
                <Link href="/privacy#security" className="block text-sm text-neutral-400 hover:text-white transition-colors">Security</Link>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-neutral-600">© 2025 Next Call Chat. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-neutral-600 hover:text-white transition-colors"><Icon icon="lucide:twitter" width={16} /></a>
              <a href="#" className="text-neutral-600 hover:text-white transition-colors"><Icon icon="lucide:github" width={16} /></a>
              <a href="#" className="text-neutral-600 hover:text-white transition-colors"><Icon icon="lucide:linkedin" width={16} /></a>
            </div>
          </div>
        </div>
      </footer>

      {/* TOASTS */}
      <div className="fixed bottom-6 right-6 z-[9998] flex flex-col gap-3">
        {toasts.map((toast) => (
          <div key={toast.id} className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border backdrop-blur-xl animate-toast-in ${toastColors[toast.type]}`}>
            <Icon icon={toast.type === "success" ? "lucide:check-circle" : toast.type === "error" ? "lucide:alert-circle" : "lucide:info"} width={18} className={toastIconColors[toast.type]} />
            <span className="text-sm text-white">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
