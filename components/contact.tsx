"use client";

import { motion } from "framer-motion";
import { Clock, Mail, ArrowRight, Loader, Database, Inbox, X } from "lucide-react";

import { Reveal } from "@/components/Reveal";
import { PerspectiveCard } from "@/components/PerspectiveCard";
import { cn } from "@/lib/utils";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
}

interface Submission {
  id: number
  name: string
  email: string
  topic: string
  message: string
  timestamp: string
  status: string
}

interface ContactProps {
  formData: {
    name: string
    email: string
    topic: string
    message: string
    _hp: string
  }
  setFormData: React.Dispatch<
    React.SetStateAction<{
      name: string
      email: string
      topic: string
      message: string
      _hp: string
    }>
  >
  loading: boolean
  handleSubmit: (e: React.FormEvent) => Promise<void>
  submissions: Submission[]
  showPanel: boolean
  setShowPanel: React.Dispatch<React.SetStateAction<boolean>>
  clearSubmissions: () => void
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-[#E5E7EB] placeholder:text-zinc-500 transition-all duration-200 focus:border-white/30 focus:ring-4 focus:ring-white/10 focus:outline-none shadow-sm";

function Contact({
  formData,
  setFormData,
  loading,
  handleSubmit,
  submissions,
  showPanel,
  setShowPanel,
  clearSubmissions,
}: ContactProps) {
  return (
    <section
      id="ask"
      className="section-full relative overflow-hidden py-20 sm:py-24 flex flex-col justify-center"
    >
      {/* Ambient background — STATIC */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-5%] w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(190,195,205,0.14)_0%,transparent_70%)] blur-[56px] opacity-40" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(140,145,155,0.1)_0%,transparent_70%)] blur-[64px] opacity-40" />
      </div>

      {/* Grid lines backdrop — STATIC */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div className="grain" />

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 w-full">
        <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
          {/* Left — Info */}
          <div className="lg:col-span-2 flex flex-col justify-center">
            <Reveal>
              <span className="text-xs uppercase tracking-[0.25em] text-[#D3D8E2] font-medium">
                Got Questions?
              </span>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="section-headline-shine mt-3 text-4xl sm:text-5xl font-semibold tracking-tight leading-tight">
                Let&apos;s talk about it
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-4 text-base text-[#C3C9D6] leading-relaxed">
                Ask us anything about Next Call Chat. We&apos;ll get back to
                you within the hour.
              </p>
            </Reveal>

            <Reveal delay={0.15} className="mt-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <Clock className="w-4.5 h-4.5 text-purple-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#D3D8E2]">
                      Response time
                    </p>
                    <p className="text-xs text-[#C3C9D6]">
                      Within 1 hour — usually faster
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <Mail className="w-4.5 h-4.5 text-purple-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#D3D8E2]">Email</p>
                    <p className="text-xs text-[#C3C9D6]">
                      Support replies from our team mailbox instantly
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right — Form */}
          <div className="lg:col-span-3">
            <Reveal delay={0.1}>
              <PerspectiveCard
                maxTilt={0}
                scale={1}
                glare={false}
                hover={false}
                className="rounded-3xl border border-white/10 bg-white/[0.04] shadow-[0_20px_60px_-25px_rgba(0,0,0,0.6)] backdrop-blur-xl"
              >
                <motion.form
                  variants={fadeUp}
                  onSubmit={handleSubmit}
                  className="p-8 md:p-10"
                >
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="mb-2 block text-xs font-medium text-[#C3C9D6]"
                    >
                      Your Name
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      placeholder="John Doe"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="contact-email"
                      className="mb-2 block text-xs font-medium text-[#C3C9D6]"
                    >
                      Email
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                      placeholder="john@company.com"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="contact-topic"
                    className="mb-2 block text-xs font-medium text-[#C3C9D6]"
                  >
                    What&apos;s on your mind?
                  </label>
                  <select
                    id="contact-topic"
                    value={formData.topic}
                    onChange={(e) =>
                      setFormData({ ...formData, topic: e.target.value })
                    }
                    className={cn(inputClass, "appearance-none cursor-pointer")}
                  >
                    <option value="general">General Question</option>
                    <option value="pricing">Pricing & Plans</option>
                    <option value="integration">Integrations</option>
                    <option value="demo">Request a Demo</option>
                    <option value="support">Technical Support</option>
                    <option value="partnership">Partnership</option>
                  </select>
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="contact-message"
                    className="mb-2 block text-xs font-medium text-[#C3C9D6]"
                  >
                    Your Question
                  </label>
                  <textarea
                    id="contact-message"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    required
                    rows={4}
                    placeholder="Tell us what you'd like to know..."
                    className={cn(inputClass, "resize-none")}
                  />
                </div>

                <div className="hidden" aria-hidden="true">
                  <input
                    type="text"
                    name="_hp"
                    value={formData._hp}
                    onChange={(e) =>
                      setFormData({ ...formData, _hp: e.target.value })
                    }
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <div className="mt-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <p className="text-xs text-[#C3C9D6]">
                    We store this securely. No spam, ever.
                  </p>
                  <button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      "text-sm sm:text-base font-medium text-[#0B0C12] px-6 py-3 rounded-full inline-flex items-center justify-center gap-2 bg-[linear-gradient(180deg,#8B919E_0%,#5E6470_100%)] shadow-[0_8px_24px_-8px_rgba(94,100,112,0.5)] hover:brightness-110 transition-all",
                      loading && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {loading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin text-purple-300" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Question
                        <ArrowRight className="w-4 h-4 text-purple-300" />
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
              </PerspectiveCard>
            </Reveal>

            {/* View Submissions */}
            <Reveal delay={0.15} className="mt-6 text-center">
              <button
                onClick={() => setShowPanel(!showPanel)}
                className="inline-flex items-center gap-2 text-xs font-medium text-[#C3C9D6] transition-colors hover:text-[#D3D8E2]"
              >
                <Database className="w-3.5 h-3.5" />
                View Stored Submissions
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-[#C3C9D6]">
                  {submissions.length}
                </span>
              </button>
            </Reveal>

            {/* Submissions Panel */}
            {showPanel && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
              <PerspectiveCard
                maxTilt={0}
                scale={1}
                glare={false}
                hover={false}
                className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-lg backdrop-blur-xl"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-[#D3D8E2]">
                    <Inbox className="w-4 h-4 text-purple-300" />
                    Question Submissions
                  </h4>
                  <button
                    onClick={() => setShowPanel(false)}
                    className="text-[#C3C9D6] transition-colors hover:text-[#D3D8E2]"
                    aria-label="Close submissions panel"
                  >
                    <X className="w-4 h-4 text-purple-300" />
                  </button>
                </div>
                <div className="max-h-64 space-y-3 overflow-y-auto">
                  {submissions.length === 0 ? (
                    <p className="py-4 text-center text-xs text-[#C3C9D6]">
                      No submissions yet
                    </p>
                  ) : (
                    [...submissions]
                      .reverse()
                      .map((q) => (
                        <div
                          key={q.id}
                          className="rounded-xl border border-white/10 bg-black/20 p-4"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-[#D3D8E2]">
                                {q.name}
                              </span>
                              <span className="text-xs text-[#C3C9D6]">
                                {q.email}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs",
                                  q.status === "new"
                                    ? "bg-emerald-500/15 text-emerald-400"
                                    : "border border-white/10 text-[#C3C9D6]"
                                )}
                              >
                                {q.status}
                              </span>
                              <span className="text-xs text-[#C3C9D6]">
                                {new Date(q.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="mb-1 text-xs font-medium text-[#C3C9D6] uppercase tracking-wider">
                            {q.topic}
                          </div>
                          <p className="text-sm text-[#C3C9D6] leading-relaxed">
                            {q.message}
                          </p>
                        </div>
                      ))
                  )}
                </div>
                <div className="mt-4 flex justify-end border-t border-white/10 pt-4">
                  <button
                    onClick={clearSubmissions}
                    className="text-xs font-medium uppercase tracking-wider text-rose-400 transition-colors hover:opacity-80"
                  >
                    Clear All
                  </button>
                </div>
              </PerspectiveCard>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export { Contact };
