'use client';

import { useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */

type ColorKey =
  | 'blue' | 'red' | 'green' | 'amber' | 'pink'
  | 'indigo' | 'sky' | 'violet' | 'orange' | 'whatsapp';

interface IconMeta {
  color: ColorKey;
  tag: string;
  title: string;
  sub: string;
  desc: string;
  /** Colorful icon shown in the arc */
  arcSvg: string;
  /** Simplified icon (usually white-on-gradient) shown in the glass card */
  cardSvg: string;
  label: string;
}

const META: Record<string, IconMeta> = {
  call: {
    color: 'blue',
    tag: 'Live integration',
    label: 'Phone Calls',
    title: 'Phone Calls',
    sub: '24/7 answering · Smart routing',
    desc: 'AI answers every inbound call 24/7 in 2 rings with a human-like voice (custom name/tone). It transcribes the full conversation, captures caller name, phone, email and intent, and does smart routing. If it detects emergency keywords you defined, it forwards instantly to your cell. Every call gets a 1-sentence summary, sentiment and recording saved to calls. Benefits: zero missed calls, unlimited simultaneous calls, no voicemail.',
    arcSvg: `<svg viewBox="0 0 24 24" fill="none"><path d="M19.5 14.5v3a2 2 0 0 1-2.2 2 19.7 19.7 0 0 1-8.6-3.06A19.5 19.5 0 0 1 3.6 12 19.7 19.7 0 0 1 .55 3.4 2 2 0 0 1 2.54 1.2h3a2 2 0 0 1 2 1.72c.13.95.36 1.88.7 2.77a2 2 0 0 1-.45 2.11L6.6 9.04a16 16 0 0 0 6.36 6.36l1.24-1.19a2 2 0 0 1 2.11-.45c.89.34 1.82.57 2.77.7a2 2 0 0 1 1.72 2.04z" transform="translate(2 2)" fill="#2563eb"/></svg>`,
    cardSvg: `<svg viewBox="0 0 24 24" fill="none"><path d="M19.5 14.5v3a2 2 0 0 1-2.2 2 19.7 19.7 0 0 1-8.6-3.06A19.5 19.5 0 0 1 3.6 12 19.7 19.7 0 0 1 .55 3.4 2 2 0 0 1 2.54 1.2h3a2 2 0 0 1 2 1.72c.13.95.36 1.88.7 2.77a2 2 0 0 1-.45 2.11L6.6 9.04a16 16 0 0 0 6.36 6.36l1.24-1.19a2 2 0 0 1 2.11-.45c.89.34 1.82.57 2.77.7a2 2 0 0 1 1.72 2.04z" transform="translate(2 2)" fill="#fff"/></svg>`,
  },
  calendar: {
    color: 'red',
    tag: 'Two-way sync',
    label: 'Calendar',
    title: 'Calendar',
    sub: 'Auto-scheduling · Google sync',
    desc: 'Books appointments directly to your Google Calendar without back-and-forth. Parses natural language date/time via GPT, resolves relative dates to ISO and defaults 12am/noon to 10am. Creates an event with summary, phone and transcript, and handles duration automatically. Works for all plans once Google is connected — fully automatic scheduling.',
    arcSvg: `<svg viewBox="0 0 24 24" fill="none"><rect x="2" y="3.5" width="20" height="18" rx="3" fill="#fff" stroke="#e5e7eb" stroke-width="1.2"/><rect x="2" y="3.5" width="20" height="5" rx="3" fill="#dc2626"/><rect x="2" y="6" width="20" height="2.5" fill="#dc2626"/><text x="12" y="17.5" text-anchor="middle" font-family="Inter, sans-serif" font-size="8" font-weight="700" fill="#18181b">31</text><rect x="6" y="1.5" width="2.4" height="4.5" rx="1.2" fill="#9ca3af"/><rect x="15.6" y="1.5" width="2.4" height="4.5" rx="1.2" fill="#9ca3af"/></svg>`,
    cardSvg: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4.5" width="18" height="16" rx="3" fill="#fff"/><rect x="3" y="4.5" width="18" height="4.5" rx="2" fill="#fff"/><text x="12" y="16.5" text-anchor="middle" font-family="Inter, sans-serif" font-size="7" font-weight="800" fill="#dc2626">31</text><rect x="7" y="2.5" width="2" height="4" rx="1" fill="#fff"/><rect x="15" y="2.5" width="2" height="4" rx="1" fill="#fff"/></svg>`,
  },
  message: {
    color: 'green',
    tag: 'Unified inbox',
    label: 'Messages',
    title: 'Messages',
    sub: 'SMS · Reminders · Re-engagement',
    desc: 'Two-way SMS engine for follow-ups, reminders and re-engagement. Sends automatic missed-call SMS (under 10s call) when enabled, and 1-hour appointment reminders on a schedule. Requires Toll-Free Verification approval to comply with carriers. All SMS history is stored in conversations, visible right in your dashboard.',
    arcSvg: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2C6.4 2 2 5.7 2 10.2c0 2.5 1.4 4.8 3.6 6.3v3.7l3.7-2.2c.84.18 1.74.28 2.7.28 5.6 0 10-3.7 10-8.2S17.6 2 12 2z" fill="#22c55e"/><path d="M7 9h7M7 11.5h5" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/></svg>`,
    cardSvg: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2C6.4 2 2 5.7 2 10.2c0 2.5 1.4 4.8 3.6 6.3v3.7l3.7-2.2c.84.18 1.74.28 2.7.28 5.6 0 10-3.7 10-8.2S17.6 2 12 2z" fill="#fff"/></svg>`,
  },
  googlestar: {
    color: 'amber',
    tag: 'Auto-sync',
    label: 'Google Reviews',
    title: 'Google Reviews',
    sub: 'Monitoring · AI-drafted replies',
    desc: 'Monitors your Google reviews and auto-generates an AI reply to each one. Keeps your rating high without you typing a word. Runs on a daily sync job at 02:00 and needs your Google OAuth plus review link connected. Helps turn even negative feedback into a calm, professional response.',
    arcSvg: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#fff" stroke="#e5e7eb" stroke-width="1"/><path d="M12 4.5l2.04 4.13 4.56.66-3.3 3.22.78 4.54L12 14.94l-4.08 2.15.78-4.54-3.3-3.22 4.56-.66L12 4.5z" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.6" stroke-linejoin="round"/><text x="12" y="14" text-anchor="middle" font-family="Inter, sans-serif" font-size="3.6" font-weight="800" fill="#fff">G</text></svg>`,
    cardSvg: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 4.5l2.04 4.13 4.56.66-3.3 3.22.78 4.54L12 14.94l-4.08 2.15.78-4.54-3.3-3.22 4.56-.66L12 4.5z" fill="#fff"/></svg>`,
  },
  instagram: {
    color: 'pink',
    tag: 'Social DMs',
    label: 'Instagram',
    title: 'Instagram',
    sub: 'DMs · Lead capture · Booking',
    desc: 'Connects to Instagram via Meta OAuth. The AI answers DMs 24/7, answers FAQs from your knowledge base, qualifies the lead and can book an appointment right in the chat. Shows your page/IG name in Settings and can be disconnected anytime. A premium feature built for social lead capture.',
    arcSvg: `<svg viewBox="0 0 24 24" fill="none"><defs><radialGradient id="ig-grad" cx="30%" cy="107%" r="140%"><stop offset="0%" stop-color="#fdfb49"/><stop offset="5%" stop-color="#fdfb49"/><stop offset="45%" stop-color="#fd5949"/><stop offset="60%" stop-color="#d6248f"/><stop offset="90%" stop-color="#8a3ab9"/></radialGradient></defs><rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-grad)"/><rect x="6" y="6" width="12" height="12" rx="4" fill="none" stroke="#fff" stroke-width="1.7"/><circle cx="12" cy="12" r="3" fill="none" stroke="#fff" stroke-width="1.7"/><circle cx="16.5" cy="7.5" r="1.1" fill="#fff"/></svg>`,
    cardSvg: `<svg viewBox="0 0 24 24" fill="none"><defs><radialGradient id="ig-grad-card" cx="30%" cy="107%" r="140%"><stop offset="0%" stop-color="#fdfb49"/><stop offset="45%" stop-color="#fd5949"/><stop offset="60%" stop-color="#d6248f"/><stop offset="90%" stop-color="#8a3ab9"/></radialGradient></defs><rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-grad-card)"/><rect x="6" y="6" width="12" height="12" rx="4" fill="none" stroke="#fff" stroke-width="1.7"/><circle cx="12" cy="12" r="3" fill="none" stroke="#fff" stroke-width="1.7"/><circle cx="16.5" cy="7.5" r="1.1" fill="#fff"/></svg>`,
  },
  facebook: {
    color: 'indigo',
    tag: 'Page messenger',
    label: 'Facebook',
    title: 'Facebook',
    sub: 'Messenger · Auto-reply',
    desc: 'The same AI engine, wired into Facebook Messenger on your Page. It receives inbound message webhooks and auto-replies, keeping tone consistent with your greeting settings. Lets you turn every Facebook message into a CRM lead instead of leaving it unread — no extra setup once your Page is linked.',
    arcSvg: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#1877f2"/><path d="M13.2 20v-6.3h2.12l.32-2.46H13.2V9.66c0-.71.2-1.2 1.2-1.2h1.28V6.27c-.22-.03-.98-.1-1.86-.1-1.85 0-3.11 1.13-3.11 3.2v1.79H8.55v2.46h2.16V20h2.49z" fill="#fff"/></svg>`,
    cardSvg: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#1877f2"/><path d="M13.2 20v-6.3h2.12l.32-2.46H13.2V9.66c0-.71.2-1.2 1.2-1.2h1.28V6.27c-.22-.03-.98-.1-1.86-.1-1.85 0-3.11 1.13-3.11 3.2v1.79H8.55v2.46h2.16V20h2.49z" fill="#fff"/></svg>`,
  },
  chart: {
    color: 'sky',
    tag: 'Live dashboards',
    label: 'Analytics',
    title: 'Analytics',
    sub: 'Funnel · Revenue · Sentiment',
    desc: 'Powers your dashboard charts — a 7-day area chart, sentiment breakdown and, on premium, the full funnel from calls to leads to appointments to revenue. Revenue is computed from appointments times average job value, using a per-industry estimate or your own override, plus a peak-hours heatmap. Demo data is shown at zero calls so you can see the layout before going live.',
    arcSvg: `<svg viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="6" fill="#ff4b00"/><rect x="5.5" y="12" width="2.6" height="6.5" rx="1" fill="#fff"/><rect x="10.7" y="8" width="2.6" height="10.5" rx="1" fill="#fff"/><rect x="15.9" y="5" width="2.6" height="13.5" rx="1" fill="#fff"/></svg>`,
    cardSvg: `<svg viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="6" fill="#ff4b00"/><rect x="5.5" y="12" width="2.6" height="6.5" rx="1" fill="#fff"/><rect x="10.7" y="8" width="2.6" height="10.5" rx="1" fill="#fff"/><rect x="15.9" y="5" width="2.6" height="13.5" rx="1" fill="#fff"/></svg>`,
  },
  ai: {
    color: 'violet',
    tag: 'Built-in AI',
    label: 'AI Core',
    title: 'AI Core',
    sub: 'Lead scoring · Sentiment · Emergency detection',
    desc: 'The AI core behind every channel — lead scoring, sentiment analysis and emergency detection in a single pass. It extracts lead quality (hot, warm or cold), whether an appointment was booked, if it is an emergency, and whether a quote was given. This drives your hot-lead alerts and the AI Performance Score you see in premium analytics.',
    arcSvg: `<svg viewBox="0 0 24 24" fill="none"><defs><linearGradient id="ai-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6366f1"/><stop offset="50%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#ec4899"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ai-grad)"/><path d="M12 5.5l1.05 2.55L15.6 9.1l-2.55 1.05L12 12.7l-1.05-2.55L8.4 9.1l2.55-1.05L12 5.5z" fill="#fff"/><path d="M16.5 14l.6 1.45L18.5 16l-1.4.55L16.5 18l-.6-1.45L14.5 16l1.4-.55L16.5 14z" fill="#fff" opacity="0.85"/><path d="M7 14l.5 1.2L8.7 15.7l-1.2.5L7 17.4l-.5-1.2L5.3 15.7l1.2-.5L7 14z" fill="#fff" opacity="0.7"/></svg>`,
    cardSvg: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 5.5l1.05 2.55L15.6 9.1l-2.55 1.05L12 12.7l-1.05-2.55L8.4 9.1l2.55-1.05L12 5.5z" fill="#fff"/><path d="M16.5 14l.6 1.45L18.5 16l-1.4.55L16.5 18l-.6-1.45L14.5 16l1.4-.55L16.5 14z" fill="#fff" opacity="0.85"/></svg>`,
  },
  zapier: {
    color: 'orange',
    tag: '2,000+ apps',
    label: 'Zapier',
    title: 'Automation Hub',
    sub: 'Zapier · Make · n8n webhooks',
    desc: 'The integration hub — fires a webhook on every completed call to Zapier, Make or n8n, once your webhook URL is set and validated. The payload includes caller info, sentiment, appointment, quote and a transcript snippet, so thousands of other tools can act on it. A premium feature that plugs your calls straight into the rest of your stack.',
    arcSvg: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#ff4a00"/><path d="M12 4.5l1.5 3.5 3.5 1.5-3.5 1.5L12 14.5l-1.5-3.5L7 9.5l3.5-1.5L12 4.5z" fill="#fff"/><path d="M16.2 7.8l-1.1 1.1-2.2-.94.94 2.2-1.1 1.1 1.1 1.1-.94 2.2 2.2-.94 1.1 1.1 1.1-1.1 2.2.94-.94-2.2 1.1-1.1z" fill="#fff" opacity="0.85"/></svg>`,
    cardSvg: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#ff4a00"/><path d="M12 4.5l1.5 3.5 3.5 1.5-3.5 1.5L12 14.5l-1.5-3.5L7 9.5l3.5-1.5L12 4.5z" fill="#fff"/></svg>`,
  },
  whatsapp: {
    color: 'whatsapp',
    tag: 'Business inbox',
    label: 'WhatsApp',
    title: 'WhatsApp',
    sub: 'Business · Same number as SMS',
    desc: 'WhatsApp Business runs on the same toll-free number as your SMS, via a dedicated subaccount. It is a two-way chat handled by the same AI, with WhatsApp and SMS tracked as separate channels for cost attribution. Inbound and outbound messages both flow through, with full conversation history visible in your dashboard.',
    arcSvg: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#25d366"/><path d="M17.5 11.4c0 2.95-2.4 5.34-5.35 5.34-.86 0-1.68-.2-2.4-.57l-2.65.7.71-2.58a5.3 5.3 0 0 1-.71-2.66c0-2.95 2.4-5.34 5.35-5.34 2.95 0 5.34 2.4 5.34 5.34z" fill="#25d366" stroke="#fff" stroke-width="0.4"/><path d="M14.86 13.2c-.24.67-1.3 1.26-1.86 1.18-.47-.06-1.07-.32-1.86-1.06-.62-.6-1.07-1.3-1.2-1.86-.13-.55.04-1.36.34-1.62.3-.27.4-.16.55-.06l.27.18c.13.08.18.13.2.22.03.13-.06.27-.2.42-.1.1-.13.18-.1.26.13.34.55.7.84.84.08.04.16.02.26-.08.18-.18.34-.34.5-.3.13.02.18.13.27.27l.16.27c.1.16.13.27.06.4-.06.13-.16.2-.26.26-.05.04-.08.1-.04.18z" fill="#fff" fill-rule="evenodd"/></svg>`,
    cardSvg: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#25d366"/><path d="M17.5 11.4c0 2.95-2.4 5.34-5.35 5.34-.86 0-1.68-.2-2.4-.57l-2.65.7.71-2.58a5.3 5.3 0 0 1-.71-2.66c0-2.95 2.4-5.34 5.35-5.34 2.95 0 5.34 2.4 5.34 5.34z" fill="#fff" stroke="#fff" stroke-width="0.4"/><path d="M14.86 13.2c-.24.67-1.3 1.26-1.86 1.18-.47-.06-1.07-.32-1.86-1.06-.62-.6-1.07-1.3-1.2-1.86-.13-.55.04-1.36.34-1.62.3-.27.4-.16.55-.06l.27.18c.13.08.18.13.2.22.03.13-.06.27-.2.42-.1.1-.13.18-.1.26.13.34.55.7.84.84.08.04.16.02.26-.08.18-.18.34-.34.5-.3.13.02.18.13.27.27l.16.27c.1.16.13.27.06.4-.06.13-.16.2-.26.26-.05.04-.08.1-.04.18z" fill="#25d366" fill-rule="evenodd"/></svg>`,
  },
};

// Order they appear left-to-right along the arc — matches the original.
const ICON_ORDER = [
  'call', 'calendar', 'message', 'googlestar', 'instagram',
  'facebook', 'chart', 'ai', 'zapier', 'whatsapp',
] as const;

const DEFAULT_KEY = 'call';

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function IntegrationsSection() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const cardRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const isFirstPulse = useRef(true);
  const [visible, setVisible] = useState(false);

  const [activeKey, setActiveKey] = useState<string>(DEFAULT_KEY);
  const [displayKey, setDisplayKey] = useState<string>(DEFAULT_KEY);
  const [fading, setFading] = useState(false);
  const [pulseTick, setPulseTick] = useState(0);

  const displayMeta = META[displayKey];

  // Run the entrance animations only when the section scrolls into view.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Once visible, pulse the first icon after the entrance has settled so the
  // animation feels alive the first time the user scrolls to this section.
  // Skipped if the user has already picked another icon by then.
  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => {
      setActiveKey((current) => {
        if (current === DEFAULT_KEY) selectKey(DEFAULT_KEY);
        return current;
      });
    }, 3550);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function selectKey(key: string) {
    setActiveKey(key);
    setFading(true);
    window.setTimeout(() => {
      setDisplayKey(key);
      setFading(false);
      setPulseTick((t) => t + 1);
    }, 200);
  }

  // Retrigger the short card-pulse bounce on every selection (skip on mount).
  useEffect(() => {
    if (isFirstPulse.current) {
      isFirstPulse.current = false;
      return;
    }
    const el = cardRef.current;
    if (!el) return;
    el.classList.remove('card-pulse');
    void el.offsetWidth; // force reflow so the animation restarts
    el.classList.add('card-pulse');
  }, [pulseTick]);

  // Layout the icons along the U/smile arc — identical math to the original.
  useEffect(() => {
    function layoutArc() {
      const track = trackRef.current;
      if (!track) return;

      const keys = ICON_ORDER;
      const n = keys.length;
      const trackWidth = track.offsetWidth;
      const trackHeight = track.offsetHeight;
      const iconSize = trackWidth < 480 ? 42 : trackWidth < 720 ? 48 : 64;

      const sidePad = Math.max(iconSize / 2 + 8, trackWidth * 0.04);
      const usableW = trackWidth - sidePad * 2;

      const isSmall = trackWidth < 720;
      const isMobile = trackWidth < 480;
      const amp = isMobile ? 36 : isSmall ? 56 : 76;

      const edgeTop = trackHeight - iconSize / 2 - 8;

      const spreadDeg = isMobile ? 70 : isSmall ? 78 : 84;
      const spreadRad = (spreadDeg * Math.PI) / 180;

      const centerX = trackWidth / 2;
      const centerY = edgeTop - amp * 0.5;

      keys.forEach((key, i) => {
        const node = nodeRefs.current[key];
        if (!node) return;

        const t = n > 1 ? i / (n - 1) : 0.5;
        const x = sidePad + t * usableW;

        const angle = (t - 0.5) * 2 * spreadRad;
        const lift = amp * (1 - Math.cos(angle));
        const y = edgeTop - lift;

        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        node.style.setProperty('--delay', `${1.15 + i * 0.1}s`);

        const dx = (x - centerX) * 0.95;
        const dy = (y - centerY) * 0.95 - 40;
        const rot = (i % 2 === 0 ? 1 : -1) * (10 + (i * 3) % 18);
        node.style.setProperty('--sx', `${dx.toFixed(1)}px`);
        node.style.setProperty('--sy', `${dy.toFixed(1)}px`);
        node.style.setProperty('--srot', `${rot}deg`);
      });
    }

    layoutArc();

    let resizeTimer: number | undefined;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(layoutArc, 120);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(resizeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`integrations${visible ? ' intro-ready' : ''}`}
      id="built-on"
    >
      <div className="cinematic-glow" aria-hidden="true" />
      <div className="integrations__inner">
        {/* Section eyebrow */}
        <div className="pill">Integrations</div>

        {/* Headline */}
        <h2 className="headline">
          Works with <span className="accent">your stack</span>
        </h2>

        {/* Subheadline */}
        <p className="subheadline">
          Bring conversations, calendars, and customer signals into one place.
          Connect the tools your team already uses — no setup headaches, no
          broken workflows.
        </p>

        {/* Icon arc — positions are set via JS/refs for a clean smile curve */}
        <div className="icon-arc">
          <div className="icon-arc__track" ref={trackRef}>
            {ICON_ORDER.map((key) => {
              const meta = META[key];
              return (
                <div
                  key={key}
                  ref={(el) => {
                    nodeRefs.current[key] = el;
                  }}
                  className={`icon-node${activeKey === key ? ' is-active' : ''}`}
                  data-label={meta.label}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectKey(key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectKey(key);
                    }
                  }}
                  dangerouslySetInnerHTML={{ __html: meta.arcSvg }}
                />
              );
            })}
          </div>
        </div>

        {/* Glass card — content updates when an icon is clicked */}
        <div
          ref={cardRef}
          className="glass-card"
          data-color={displayMeta.color}
        >
          <div className="glass-card__head">
            <div
              className="glass-card__icon"
              dangerouslySetInnerHTML={{ __html: displayMeta.cardSvg }}
            />
            <div className="glass-card__content">
              <div className="glass-card__title">
                <span
                  className="glass-card__title-text"
                  style={{ opacity: fading ? 0 : 1 }}
                >
                  {displayMeta.title}
                </span>
              </div>
              <div
                className="glass-card__sub"
                style={{ opacity: fading ? 0 : 1 }}
              >
                {displayMeta.sub}
              </div>
            </div>
            <div
              className="glass-card__tag"
              style={{ opacity: fading ? 0 : 1 }}
            >
              {displayMeta.tag}
            </div>
          </div>

          {/* Description text — swapped per icon */}
          <div
            className="dummy-text"
            style={{ opacity: fading ? 0 : 1 }}
          >
            {displayMeta.desc}
          </div>
        </div>
      </div>

      <style jsx>{`
        .integrations {
          position: relative;
          width: 100%;
          min-height: 100vh;
          background: #ffffff !important;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
          color-scheme: only light;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
            sans-serif;
          color: #18181b;
          line-height: 1.5;
        }

        /* Gate the cinematic entrance behind .intro-ready so it plays
           the first time the section scrolls into view (not on page load). */
        .integrations.integrations:not(.intro-ready) .pill,
        .integrations.integrations:not(.intro-ready) .headline,
        .integrations.integrations:not(.intro-ready) .subheadline,
        .integrations.integrations:not(.intro-ready) .icon-node,
        .integrations.integrations:not(.intro-ready) .glass-card,
        .integrations.integrations:not(.intro-ready) .cinematic-glow {
          opacity: 0;
        }
        .integrations.integrations:not(.intro-ready) .pill,
        .integrations.integrations:not(.intro-ready) .headline,
        .integrations.integrations:not(.intro-ready) .subheadline,
        .integrations.integrations:not(.intro-ready) .icon-node,
        .integrations.integrations:not(.intro-ready) .glass-card,
        .integrations.integrations:not(.intro-ready) .cinematic-glow {
          animation: none;
        }
        .integrations.integrations:not(.intro-ready) .glass-card {
          transform: translateY(0);
        }

        .integrations__inner {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 980px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        /* Section eyebrow — flanking lines around small-caps text */
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 24px;
          opacity: 0;
          transform: translateY(8px);
          animation:
            rise 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) 0.05s forwards,
            blur-in 0.7s ease-out 0.05s forwards;
        }
        .pill::before,
        .pill::after {
          content: '';
          display: inline-block;
          width: 34px;
          height: 1px;
          background: #cbd5e1;
        }

        /* Headline */
        .headline {
          font-size: clamp(36px, 5.6vw, 60px);
          font-weight: 800;
          line-height: 1.06;
          letter-spacing: -0.025em;
          color: #18181b;
          max-width: 760px;
          margin-bottom: 18px;
          opacity: 0;
          transform: translateY(14px);
          animation:
            rise 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.15s forwards,
            text-assemble 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) 0.15s forwards;
        }
        .headline :global(.accent) {
          color: #18181b;
          font-weight: 800;
        }

        /* Subheadline */
        .subheadline {
          font-size: clamp(15px, 1.5vw, 18px);
          line-height: 1.6;
          color: #6b7280;
          max-width: 580px;
          margin-bottom: 24px;
          opacity: 0;
          transform: translateY(10px);
          animation:
            rise 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.25s forwards,
            blur-in 0.8s ease-out 0.25s forwards;
        }

        /* Icon arc — smile / U shape. Icons are positioned via refs (top/left in px). */
        .icon-arc {
          position: relative;
          width: 100%;
          max-width: 820px;
          height: 148px;
          margin-bottom: 20px;
        }

        .icon-arc__track {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .icon-node {
          position: absolute;
          left: 0;
          top: 0;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid rgba(229, 231, 235, 0.9);
          box-shadow: 0 2px 6px rgba(16, 24, 40, 0.06),
            0 8px 20px rgba(16, 24, 40, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1),
            box-shadow 0.4s ease, border-color 0.4s ease;
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
          animation: pop 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.2) backwards;
          animation-delay: var(--delay, 0s);
          will-change: transform;
          user-select: none;
        }
        .icon-node :global(svg) {
          width: 30px;
          height: 30px;
          transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
          pointer-events: none;
        }
        .icon-node:hover {
          transform: translate(-50%, -50%) scale(1.08);
          box-shadow: 0 6px 14px rgba(16, 24, 40, 0.1),
            0 14px 30px rgba(16, 24, 40, 0.1);
          border-color: #d1d5db;
          z-index: 5;
        }
        .icon-node:hover :global(svg) {
          transform: scale(1.08);
        }
        .icon-node.is-active {
          transform: translate(-50%, -50%) scale(1.12);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25),
            0 6px 14px rgba(99, 102, 241, 0.2), 0 14px 30px rgba(16, 24, 40, 0.1);
          border-color: #6366f1;
          z-index: 6;
        }
        .icon-node::after {
          content: attr(data-label);
          position: absolute;
          top: -34px;
          left: 50%;
          transform: translateX(-50%) translateY(4px);
          background: #18181b;
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          padding: 5px 10px;
          border-radius: 9999px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.25s ease, transform 0.25s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 10;
        }
        .icon-node:hover::after,
        .icon-node.is-active::after {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        /* Glass card at the bottom — updates on icon click */
        .glass-card {
          position: relative;
          width: 100%;
          max-width: 720px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          padding: 20px 22px 18px;
          box-shadow: 0 12px 28px rgba(16, 24, 40, 0.08),
            0 4px 10px rgba(16, 24, 40, 0.05);
          display: flex;
          flex-direction: column;
          gap: 14px;
          opacity: 1;
          transform: translateY(0);
          animation: materialize 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) 2.65s
            backwards;
          transition: border-color 0.35s ease, box-shadow 0.35s ease;
        }

        .glass-card__head {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .glass-card__icon {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 6px 14px rgba(99, 102, 241, 0.25);
          transition: background 0.4s ease;
        }
        .glass-card__icon :global(svg) {
          width: 20px;
          height: 20px;
        }

        .glass-card__content {
          flex: 1;
          text-align: left;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .glass-card__title {
          font-size: 15px;
          font-weight: 700;
          color: #18181b;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .glass-card__title-text {
          transition: opacity 0.25s ease;
        }
        .glass-card__sub {
          font-size: 12.5px;
          color: #9ca3af;
          font-weight: 500;
          transition: opacity 0.25s ease;
        }

        .glass-card__tag {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 9999px;
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.18);
          color: #6366f1;
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.04em;
          transition: opacity 0.25s ease;
        }
        .glass-card__tag::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
          animation: pulse 2s ease-in-out infinite;
        }

        /* Description text — swapped per icon */
        .dummy-text {
          position: relative;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 13.5px;
          line-height: 1.5;
          color: #9ca3af;
          text-align: left;
          transition: opacity 0.25s ease;
        }

        /* Card icon-color variants */
        .glass-card[data-color='blue'] .glass-card__icon {
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          box-shadow: 0 6px 14px rgba(37, 99, 235, 0.25);
        }
        .glass-card[data-color='red'] .glass-card__icon {
          background: linear-gradient(135deg, #dc2626, #ef4444);
          box-shadow: 0 6px 14px rgba(220, 38, 38, 0.25);
        }
        .glass-card[data-color='green'] .glass-card__icon {
          background: linear-gradient(135deg, #16a34a, #22c55e);
          box-shadow: 0 6px 14px rgba(22, 163, 74, 0.25);
        }
        .glass-card[data-color='amber'] .glass-card__icon {
          background: linear-gradient(135deg, #d97706, #f59e0b);
          box-shadow: 0 6px 14px rgba(217, 119, 6, 0.25);
        }
        .glass-card[data-color='pink'] .glass-card__icon {
          background: linear-gradient(135deg, #db2777, #ec4899);
          box-shadow: 0 6px 14px rgba(219, 39, 119, 0.25);
        }
        .glass-card[data-color='indigo'] .glass-card__icon {
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          box-shadow: 0 6px 14px rgba(79, 70, 229, 0.25);
        }
        .glass-card[data-color='sky'] .glass-card__icon {
          background: linear-gradient(135deg, #0284c7, #0ea5e9);
          box-shadow: 0 6px 14px rgba(2, 132, 199, 0.25);
        }
        .glass-card[data-color='violet'] .glass-card__icon {
          background: linear-gradient(135deg, #7c3aed, #8b5cf6);
          box-shadow: 0 6px 14px rgba(124, 58, 237, 0.25);
        }
        .glass-card[data-color='orange'] .glass-card__icon {
          background: linear-gradient(135deg, #ea580c, #ff4a00);
          box-shadow: 0 6px 14px rgba(234, 88, 12, 0.25);
        }
        .glass-card[data-color='whatsapp'] .glass-card__icon {
          background: linear-gradient(135deg, #16a34a, #25d366);
          box-shadow: 0 6px 14px rgba(37, 211, 102, 0.25);
        }

        /* Card tag color variants */
        .glass-card[data-color='blue'] .glass-card__tag {
          background: rgba(37, 99, 235, 0.08);
          border-color: rgba(37, 99, 235, 0.2);
          color: #2563eb;
        }
        .glass-card[data-color='blue'] .glass-card__tag::before {
          background: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
        }
        .glass-card[data-color='red'] .glass-card__tag {
          background: rgba(220, 38, 38, 0.08);
          border-color: rgba(220, 38, 38, 0.2);
          color: #dc2626;
        }
        .glass-card[data-color='red'] .glass-card__tag::before {
          background: #dc2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.18);
        }
        .glass-card[data-color='green'] .glass-card__tag {
          background: rgba(22, 163, 74, 0.08);
          border-color: rgba(22, 163, 74, 0.2);
          color: #16a34a;
        }
        .glass-card[data-color='green'] .glass-card__tag::before {
          background: #16a34a;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.18);
        }
        .glass-card[data-color='amber'] .glass-card__tag {
          background: rgba(217, 119, 6, 0.08);
          border-color: rgba(217, 119, 6, 0.2);
          color: #d97706;
        }
        .glass-card[data-color='amber'] .glass-card__tag::before {
          background: #d97706;
          box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.18);
        }
        .glass-card[data-color='pink'] .glass-card__tag {
          background: rgba(219, 39, 119, 0.08);
          border-color: rgba(219, 39, 119, 0.2);
          color: #db2777;
        }
        .glass-card[data-color='pink'] .glass-card__tag::before {
          background: #db2777;
          box-shadow: 0 0 0 3px rgba(219, 39, 119, 0.18);
        }
        .glass-card[data-color='indigo'] .glass-card__tag {
          background: rgba(79, 70, 229, 0.08);
          border-color: rgba(79, 70, 229, 0.2);
          color: #4f46e5;
        }
        .glass-card[data-color='indigo'] .glass-card__tag::before {
          background: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.18);
        }
        .glass-card[data-color='sky'] .glass-card__tag {
          background: rgba(2, 132, 199, 0.08);
          border-color: rgba(2, 132, 199, 0.2);
          color: #0284c7;
        }
        .glass-card[data-color='sky'] .glass-card__tag::before {
          background: #0284c7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.18);
        }
        .glass-card[data-color='violet'] .glass-card__tag {
          background: rgba(124, 58, 237, 0.08);
          border-color: rgba(124, 58, 237, 0.2);
          color: #7c3aed;
        }
        .glass-card[data-color='violet'] .glass-card__tag::before {
          background: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.18);
        }
        .glass-card[data-color='orange'] .glass-card__tag {
          background: rgba(234, 88, 12, 0.08);
          border-color: rgba(234, 88, 12, 0.2);
          color: #ea580c;
        }
        .glass-card[data-color='orange'] .glass-card__tag::before {
          background: #ea580c;
          box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.18);
        }
        .glass-card[data-color='whatsapp'] .glass-card__tag {
          background: rgba(37, 211, 102, 0.08);
          border-color: rgba(37, 211, 102, 0.2);
          color: #16a34a;
        }
        .glass-card[data-color='whatsapp'] .glass-card__tag::before {
          background: #25d366;
          box-shadow: 0 0 0 3px rgba(37, 211, 102, 0.18);
        }

        .card-pulse {
          animation: card-pulse 0.5s ease;
        }
        @keyframes card-pulse {
          0% {
            transform: translateY(0) scale(1);
          }
          40% {
            transform: translateY(-2px) scale(1.005);
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }

        /* Animations */
        @keyframes rise {
          0% {
            opacity: 0;
            transform: translateY(16px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes text-assemble {
          0% {
            clip-path: inset(0 100% 0 0);
            filter: blur(9px);
          }
          55% {
            filter: blur(3px);
          }
          100% {
            clip-path: inset(0 0 0 0);
            filter: blur(0);
          }
        }
        @keyframes blur-in {
          0% {
            filter: blur(7px);
          }
          100% {
            filter: blur(0);
          }
        }
        @keyframes pop {
          0% {
            opacity: 0;
            transform: translate(
                calc(-50% + var(--sx, 0px)),
                calc(-50% + var(--sy, 0px))
              )
              scale(0.35) rotate(var(--srot, 0deg));
          }
          55% {
            opacity: 1;
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1) rotate(0deg);
          }
        }
        @keyframes materialize {
          0% {
            opacity: 0;
            transform: translateY(22px) scale(0.94);
            filter: blur(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }
        @keyframes glow-burst {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.25);
          }
          28% {
            opacity: 0.5;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(2.3);
          }
        }
        @keyframes pulse {
          0%,
          100% {
            box-shadow: 0 0 0 3px rgba(255, 75, 0, 0.18);
          }
          50% {
            box-shadow: 0 0 0 5px rgba(255, 75, 0, 0.08);
          }
        }

        /* Decorative burst element sitting behind everything */
        .cinematic-glow {
          position: absolute;
          top: 34%;
          left: 50%;
          width: 680px;
          height: 680px;
          max-width: 140vw;
          max-height: 140vw;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(139, 92, 246, 0.32) 0%,
            rgba(236, 72, 153, 0.16) 42%,
            rgba(255, 255, 255, 0) 72%
          );
          pointer-events: none;
          z-index: 0;
          opacity: 0;
          animation: glow-burst 1.5s cubic-bezier(0.2, 0.7, 0.2, 1) 0.05s
            forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .integrations * {
            animation-duration: 0.001s !important;
            animation-delay: 0s !important;
            transition-duration: 0.001s !important;
          }
          .cinematic-glow {
            display: none;
          }
        }

        /* Responsive */
        @media (max-width: 820px) {
          .icon-arc {
            height: 128px;
          }
          .icon-node {
            width: 56px;
            height: 56px;
          }
          .icon-node :global(svg) {
            width: 26px;
            height: 26px;
          }
        }
        @media (max-width: 720px) {
          .icon-arc {
            height: 105px;
            margin-bottom: 16px;
          }
          .icon-node {
            width: 48px;
            height: 48px;
          }
          .icon-node :global(svg) {
            width: 22px;
            height: 22px;
          }
          .glass-card {
            padding: 18px;
          }
          .headline {
            font-size: 32px;
          }
          .subheadline {
            font-size: 14px;
            margin-bottom: 18px;
          }
          .integrations {
            padding: 56px 16px;
          }
          .icon-node::after {
            font-size: 10px;
            top: -28px;
            padding: 4px 8px;
          }
        }
        @media (max-width: 480px) {
          .icon-arc {
            height: 150px;
          }
          .icon-node {
            width: 42px;
            height: 42px;
          }
          .icon-node :global(svg) {
            width: 19px;
            height: 19px;
          }
          .glass-card__head {
            flex-wrap: wrap;
          }
          .glass-card__tag {
            order: 2;
          }
        }
/* ==== Brand pass: every integration icon rendered in the single brand
             orange #ff4b00. Inline-SVG brand colors (blue/red/green/pink/etc.)
             are overridden here; white / stroked glyphs stay white for
             legibility on the orange fills. ==== */
        .icon-arc .icon-node :global(svg) :not([fill='none']):not([fill='#fff']):not([fill='#ffffff']):not([fill='#e5e7eb']) {
          fill: #ff4b00 !important;
        }
        .icon-arc .icon-node :global(svg) :not([stroke='none']):not([stroke='#fff']):not([stroke='#ffffff']):not([stroke='#e5e7eb']) {
          stroke: #ff4b00 !important;
        }

        /* Glass-card app chip → brand orange */
        .glass-card__icon {
          background: linear-gradient(135deg, #ff4b00, #ff8a1e) !important;
          box-shadow: 0 6px 14px rgba(255, 75, 0, 0.25) !important;
        }
        .glass-card__icon :global(svg) :not([fill='none']):not([fill='#fff']):not([fill='#ffffff']) {
          fill: #ff4b00 !important;
        }

        /* Active icon ring + tag badges → brand orange */
        .icon-node.is-active {
          box-shadow: 0 0 0 3px rgba(255, 75, 0, 0.25),
            0 6px 14px rgba(255, 75, 0, 0.2), 0 14px 30px rgba(16, 24, 40, 0.1) !important;
          border-color: #ff4b00 !important;
        }
        .glass-card .glass-card__tag,
        .glass-card[data-color] .glass-card__tag {
          background: rgba(255, 75, 0, 0.08) !important;
          border-color: rgba(255, 75, 0, 0.22) !important;
          color: #ff4b00 !important;
        }
        .glass-card .glass-card__tag::before,
        .glass-card[data-color] .glass-card__tag::before {
          background: #ff4b00 !important;
          box-shadow: 0 0 0 3px rgba(255, 75, 0, 0.18) !important;
        }

        /* Decorative burst glow → brand orange */
        .cinematic-glow {
          background: radial-gradient(
            circle,
            rgba(255, 75, 0, 0.32) 0%,
            rgba(255, 138, 30, 0.16) 42%,
            rgba(255, 255, 255, 0) 72%
          ) !important;
        }
      `}</style>
    </section>
  );
}
