# ডার্ক সিনেমাটিক অ্যানালিটিক্স + ফুল সিনেমাটিক স্ক্রল অ্যানিমেশন — পরিকল্পনা

**তোমার চয়েস:** ডার্ক সিনেমাটিক লুক (অরেঞ্জ গ্লো/গ্রেডিয়েন্ট/shimmer) + ফুল সিনেমাটিক অ্যানিমেশন (কার্ড রাইজ + চার্ট এঁকে ওঠা + বার ভরে ওঠা + সংখ্যা কাউন্ট-আপ — সবকিছু স্ক্রলে পৌঁছালে সক্রিয় হবে)

## ভিত্তি: যা আগে থেকেই প্রস্তুত আছে (পুনরায় ব্যবহার হবে)
- **`components/Reveal.tsx`** — বিদ্যমান স্ক্রল-রিভিল র‍্যাপার (`useInView`, rise+fade, EXPO_OUT easing, `prefers-reduced-motion` সম্মান করে)। ড্যাশবোর্ড থেকে `@/components/Reveal` হিসেবে ইম্পোর্টযোগ্য — প্যাটার্ন মিলবে ল্যান্ডিং পেজের সাথে।
- **`globals.css`-এ `text-shine`/`glowPulse` keyframes** — DEMO ব্যাজ shimmer-এর জন্য।
- **তিনটি লক্ষ্য কম্পোনেন্টই `"use client"`** (DashboardCharts, PremiumAnalytics, DashboardCards) — অ্যানিমেশন ইনফ্রার কিছু যোগ করা লাগবে না।

## নতুন ফাইল ১: `app/dashboard/_components/AnimatedNumber.tsx`
কাউন্ট-আপ সংখ্যা কম্পোনেন্ট — SetupProgressSidebar-এর প্রমাণিত প্যাটার্নে (framer-motion `animate()` + `useInView once`)। Props: `value`, `format?`, `duration?`, `className`। reduced-motion-এ সরাসরি ফাইনাল ভ্যালু (স্ন্যাপ)।

## নতুন ফাইল ২: `app/dashboard/_components/CinematicChartCard.tsx` (হালকা র‍্যাপার)
সব চার্ট কার্ডে একই সিনেমাটিক শেল — বিদ্যমান `bg-black border-white/5 rounded-2xl`-এর উপর:
- উপরে ১px হেয়ারলাইন গ্রেডিয়েন্ট (`from-transparent via-[#ff4b00]/40 to-transparent`)
- কার্ড গ্লো `shadow-[0_0_60px_-20px_rgba(255,75,0,0.25)]`
- `Reveal direction="up"` বিল্ট-ইন → স্ক্রলে রাইজ

## এডিট ১: `DashboardCharts.tsx` (স্ট্যান্ডার্ড প্ল্যান চার্ট)
- **Call Volume AreaChart**: লাইনে গ্লো (`drop-shadow(0 0 6px rgba(255,75,0,0.4))`), গ্রেডিয়েন্ট ফিল শক্তিশালী (0.4→0.02), `activeDot` r=5 অরেঞ্জ + ডার্ক রিং। **চার্ট মাউন্ট হবে inView-তে** (নিজস্ব `useInView ref`) — ফলে recharts-এর draw-in অ্যানিমেশন ঠিক তখনই প্লে হবে যখন ইউজার স্ক্রল করে পৌঁছাবে (না হলে পেজ লোডেই খেলে যেত, দেখা যেত না)। কন্টেইনার `h-[320px]` সবসময় থাকবে → কোনো layout shift নেই।
- **Sentiment ডোনাট**: মাউন্ট-অন-inView; কার্ড কাউন্টারে AnimatedNumber কাউন্ট-আপ।
- **CustomTooltip**: সিনেমাটিক রিস্টাইল — `border-[#ff4b00]/25`, গ্লো শ্যাডো, backdrop-blur।
- **DEMO MODE ব্যাজ**: `text-shine` shimmer অ্যানিমেশন।

## এডিট ২: `PremiumAnalytics.tsx` (প্রিমিয়াম অ্যানালিটিক্স)
- **Row 1 মেট্রিক টাইলস**: Reveal stagger (0.08s) + ভ্যালুগুলোতে AnimatedNumber (`$12,400` → 0 থেকে গোনা হবে)
- **Conversion Funnel**: বারগুলো `motion.div` — উচ্চতা 0 → টার্গেট, প্রতিটা ধাপে 0.09s stagger, গ্লো বর্ডারসহ
- **Weekly Trend LineChart**: মাউন্ট-অন-inView (লাইন এঁকে ওঠে), টুলটিপ রিস্টাইল
- **Peak Hours Heatmap**: প্রতিটা রো-এর বার 0 → টার্গেট প্রস্থ, স্ট্যাগারড; >70% টিয়ারে গ্লো
- **Lead Quality ডোনাট**: মাউন্ট-অন-inView + লেজেন্ড সেল stagger
- **Call Sources**: বার 0 → টার্গেট stagger; **এলোমেলো `to-indigo-400` গ্রেডিয়েন্ট → অরেঞ্জ ফ্যামিলিতে ফেরানো** (কনসিস্টেন্সি ফিক্স); #1 র‍্যাঙ্ক গ্লো
- **AI Performance Score**: টাইলস Reveal stagger + AnimatedNumber; Autonomy বার inView-তে ভরে ওঠে
- প্রতিটা রো CinematicChartCard-এ — স্ক্রলে নিচের রোগুলোও রাইজ করবে

## এডিট ৩: `DashboardCards.tsx` (৩টি স্ট্যাট কার্ড)
- প্রতিটা কার্ড: Reveal stagger + বড় সংখ্যায় AnimatedNumber
- হোভারে সাবটল অরেঞ্জ রিম (`hover:border-[#ff4b00]/20`)
- ডায়ালগগুলো (View History, Manage Numbers) **অপরিবর্তিত** — শুধু ভিজ্যুয়াল

## এডিট ৪: `page.tsx` (সার্ভার কম্পোনেন্ট — Reveal ক্লায়েন্ট, তাই সরাসরি ব্যবহারযোগ্য)
Reveal-এ মোড়া হবে: Minutes Usage কার্ড, Quick Links গ্রিড (প্রতি টাইল 0.05s stagger), Recent Activity মেইন কার্ড + "Your AI Numbers" + Pro Tip কার্ড (গ্রিড-চাইল্ড ক্লাস `className` প্রপে পাস হবে)। DashboardCards আর চার্ট কম্পোনেন্ট নিজের ভেতরের অ্যানিমেশন নিজেরাই হ্যান্ডেল করবে (ডাবল-র‍্যাপ নেই)।

## অ্যাক্সেসিবিলিটি + পারফরম্যান্স
- Reveal WCAG 2.3.3 সম্মান করে; AnimatedNumber আর মোশন-বারগুলোও reduced-motion-এ স্ন্যাপ করবে (ফাঁকিনি না)
- সব চার্ট কন্টেইনার ফিক্সড হাইট (h-[320px], h-64 ইত্যাদি) → শূন্য layout shift, CLS অক্ষত
- `useInView once: true` — বারবার অ্যানিমেশন নয়, প্রথমবারই

## ভেরিফিকেশন
`tsc` ০ এরর → `lint` ০ এরর → `build` ক্লিন → **১৩৮ টেস্ট** পাস → dev server-এ তোমার লগইন করে চোখে দেখা (স্ক্রল করলেই সেকশনগুলো "জেগে উঠবে")

## যা বদলাচ্ছে না
ডেটা/লজিক/API কিছুই না — শুধু JSX ক্লাস, framer-motion র‍্যাপার, আর recharts-এর মাউন্ট-টাইমিং। ডায়ালগ, ফিল্টার, plan-gating সব অপরিবর্তিত।