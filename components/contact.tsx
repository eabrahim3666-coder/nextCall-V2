"use client"

import { motion } from "framer-motion"
import { Icon } from "@iconify/react"

import { cn } from "@/lib/utils"

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
      className="relative bg-ds-bg-primary py-24 md:py-32 overflow-hidden"
    >
      <div className="pointer-events-none absolute bottom-[-10%] left-[-5%] h-[500px] w-[500px] rounded-full bg-ds-accent-primary/[0.02] blur-[100px]" />
      <div className="pointer-events-none absolute top-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-ds-accent-highlight/[0.015] blur-[80px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
          {/* Left — Info */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-80px" }}
            variants={{
              animate: { transition: { staggerChildren: 0.1 } },
            }}
            className="lg:col-span-2 flex flex-col justify-center"
          >
            <motion.span
              variants={fadeUp}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-ds-overline font-medium text-ds-accent-primary uppercase tracking-[0.08em]"
            >
              Got Questions?
            </motion.span>
            <motion.h2
              variants={fadeUp}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 text-ds-section-heading text-ds-text-primary"
            >
              Let&apos;s{" "}
              <span className="bg-linear-to-r from-ds-accent-primary via-ds-accent-secondary to-ds-accent-highlight bg-clip-text text-transparent">
                talk about it
              </span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 text-ds-body text-ds-text-secondary leading-relaxed"
            >
              Ask us anything about Next Call Chat. We&apos;ll get back to you
              within the hour.
            </motion.p>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg border border-ds-accent-primary/20 bg-ds-accent-primary/10">
                  <Icon
                    icon="lucide:clock"
                    width={18}
                    className="text-ds-accent-primary"
                  />
                </div>
                <div>
                  <p className="text-ds-label text-ds-text-primary">
                    Response time
                  </p>
                  <p className="text-ds-caption text-ds-text-muted">
                    Within 1 hour — usually faster
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg border border-ds-accent-secondary/20 bg-ds-accent-secondary/10">
                  <Icon
                    icon="lucide:mail"
                    width={18}
                    className="text-ds-accent-secondary"
                  />
                </div>
                <div>
                  <p className="text-ds-label text-ds-text-primary">Email</p>
                  <p className="text-ds-caption text-ds-text-muted">
                    hello@nextcallchat.com
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right — Form */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-80px" }}
            variants={{
              animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
            }}
            className="lg:col-span-3"
          >
            <motion.form
              variants={fadeUp}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              onSubmit={handleSubmit}
              className="rounded-xl border border-ds-border-primary bg-ds-bg-card p-8 shadow-ds-sm md:p-10"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="contact-name"
                    className="mb-2 block text-ds-caption font-medium text-ds-text-primary"
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
                    className="w-full rounded-lg border border-ds-border-primary bg-ds-bg-primary px-4 py-3 text-ds-small-body text-ds-text-primary placeholder:text-ds-text-muted transition-all duration-200 focus:border-ds-border-hover focus:ring-2 focus:ring-ds-accent-primary/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="contact-email"
                    className="mb-2 block text-ds-caption font-medium text-ds-text-primary"
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
                    className="w-full rounded-lg border border-ds-border-primary bg-ds-bg-primary px-4 py-3 text-ds-small-body text-ds-text-primary placeholder:text-ds-text-muted transition-all duration-200 focus:border-ds-border-hover focus:ring-2 focus:ring-ds-accent-primary/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-5">
                <label
                  htmlFor="contact-topic"
                  className="mb-2 block text-ds-caption font-medium text-ds-text-primary"
                >
                  What&apos;s on your mind?
                </label>
                <select
                  id="contact-topic"
                  value={formData.topic}
                  onChange={(e) =>
                    setFormData({ ...formData, topic: e.target.value })
                  }
                  className="w-full rounded-lg border border-ds-border-primary bg-ds-bg-primary px-4 py-3 text-ds-small-body text-ds-text-primary transition-all duration-200 focus:border-ds-border-hover focus:ring-2 focus:ring-ds-accent-primary/20 focus:outline-none appearance-none cursor-pointer"
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
                  className="mb-2 block text-ds-caption font-medium text-ds-text-primary"
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
                  className="w-full rounded-lg border border-ds-border-primary bg-ds-bg-primary px-4 py-3 text-ds-small-body text-ds-text-primary placeholder:text-ds-text-muted transition-all duration-200 focus:border-ds-border-hover focus:ring-2 focus:ring-ds-accent-primary/20 focus:outline-none resize-none"
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
                <p className="text-ds-caption text-ds-text-muted">
                  We store this securely. No spam, ever.
                </p>
                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-3.5 text-ds-button font-medium transition-all duration-200 sm:w-auto",
                    loading
                      ? "bg-ds-text-primary/50 text-ds-bg-primary cursor-not-allowed"
                      : "bg-ds-text-primary text-ds-bg-primary hover:opacity-90"
                  )}
                >
                  {loading ? (
                    <>
                      <Icon
                        icon="lucide:loader"
                        width={16}
                        className="animate-spin"
                      />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Question
                      <Icon icon="lucide:arrow-right" width={16} />
                    </>
                  )}
                </button>
              </div>
            </motion.form>

            {/* View Submissions */}
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 text-center"
            >
              <button
                onClick={() => setShowPanel(!showPanel)}
                className="inline-flex items-center gap-2 text-ds-caption font-medium text-ds-text-muted transition-colors hover:text-ds-text-primary"
              >
                <Icon icon="lucide:database" width={14} />
                View Stored Submissions
                <span className="rounded-full border border-ds-accent-primary/20 bg-ds-accent-primary/10 px-2 py-0.5 text-ds-caption text-ds-accent-primary">
                  {submissions.length}
                </span>
              </button>
            </motion.div>

            {/* Submissions Panel */}
            {showPanel && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6 rounded-xl border border-ds-border-primary bg-ds-bg-card p-6 shadow-ds-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="flex items-center gap-2 text-ds-label text-ds-text-primary">
                    <Icon
                      icon="lucide:inbox"
                      width={16}
                      className="text-ds-accent-primary"
                    />
                    Question Submissions
                  </h4>
                  <button
                    onClick={() => setShowPanel(false)}
                    className="text-ds-text-muted transition-colors hover:text-ds-text-primary"
                    aria-label="Close submissions panel"
                  >
                    <Icon icon="lucide:x" width={16} />
                  </button>
                </div>
                <div className="max-h-64 space-y-3 overflow-y-auto">
                  {submissions.length === 0 ? (
                    <p className="py-4 text-center text-ds-caption text-ds-text-muted">
                      No submissions yet
                    </p>
                  ) : (
                    [...submissions]
                      .reverse()
                      .map((q) => (
                        <div
                          key={q.id}
                          className="rounded-lg border border-ds-border-primary bg-ds-bg-primary p-4"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-ds-caption font-medium text-ds-text-primary">
                                {q.name}
                              </span>
                              <span className="text-ds-caption text-ds-text-muted">
                                {q.email}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-ds-caption",
                                  q.status === "new"
                                    ? "bg-ds-state-success/10 text-ds-state-success"
                                    : "border border-ds-border-primary text-ds-text-muted"
                                )}
                              >
                                {q.status}
                              </span>
                              <span className="text-ds-caption text-ds-text-muted">
                                {new Date(q.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="mb-1 text-ds-caption font-medium text-ds-accent-primary uppercase tracking-wider">
                            {q.topic}
                          </div>
                          <p className="text-ds-small-body text-ds-text-secondary leading-relaxed">
                            {q.message}
                          </p>
                        </div>
                      ))
                  )}
                </div>
                <div className="mt-4 flex justify-end border-t border-ds-border-primary pt-4">
                  <button
                    onClick={clearSubmissions}
                    className="text-ds-caption font-medium uppercase tracking-wider text-ds-state-danger transition-colors hover:opacity-80"
                  >
                    Clear All
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export { Contact }
