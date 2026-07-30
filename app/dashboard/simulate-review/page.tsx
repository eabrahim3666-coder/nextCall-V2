"use client";

import { useState } from "react";

const HARDCODED_REVIEW =
  "I recently visited Farjana Refrigeration to buy a new compressor and some AC accessories. The store has a massive collection of genuine fridge and AC parts, and their pricing is very reasonable compared to others in the market. However, the customer service was quite disappointing. The shop was very crowded, and I had to wait almost 30 minutes just to get a staff member to assist me. Overall, great products and prices, but they really need to improve their staff management and waiting time.";

const MOCK_AI_REPLIES = [
  "Thank you for your honest feedback! We're glad you loved our product range and pricing. You're absolutely right about the wait time — we've already started implementing a token-based queue system and hired additional staff to handle peak hours. Hope to serve you better next time!",
  "Hi there, thanks for taking the time to review us. We're happy our compressor and AC parts met your needs. We hear you on the wait — we're training our team on faster customer triage and have added two more counters during rush hours. Your input helps us improve every day.",
  "Appreciate the detailed review! Great to know our collection and pricing stood out to you. Regarding the wait, we agree it's not ideal and we're working on it — better crowd management and staff scheduling are already in motion. Come back and see the difference!",
];

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="text-2xl transition-colors"
        >
          {star <= value ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#facc15" stroke="#facc15" strokeWidth="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}

export default function SimulateReviewPage() {
  const [rating, setRating] = useState(4);
  const [reviewText, setReviewText] = useState(HARDCODED_REVIEW);
  const [posted, setPosted] = useState(false);
  const [aiReply, setAiReply] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = async () => {
    if (!reviewText.trim()) return;
    setIsPosting(true);

    // Simulate network delay
    await new Promise((r) => setTimeout(r, 1200));

    // Pick a random AI reply
    const reply = MOCK_AI_REPLIES[Math.floor(Math.random() * MOCK_AI_REPLIES.length)];
    setAiReply(reply);
    setPosted(true);
    setIsPosting(false);
  };

  const handleReset = () => {
    setRating(4);
    setReviewText(HARDCODED_REVIEW);
    setPosted(false);
    setAiReply("");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Google Review Simulator</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Simulate a Google review to test how your AI responds. This is temporary and will be removed after Google verification.
        </p>
      </div>

      {/* Google-style review card */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden">
        {/* Google header */}
        <div className="flex items-center gap-3 p-4 border-b border-white/[0.06]">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
            F
          </div>
          <div>
            <p className="text-sm font-medium text-white">Farjana Refrigeration</p>
            <div className="flex items-center gap-2 text-[11px] text-neutral-500">
              <span>{rating} ★</span>
              <span>·</span>
              <span>Google Review</span>
            </div>
          </div>
        </div>

        {/* Star rating selector */}
        <div className="px-4 pt-4">
          <p className="text-xs text-neutral-400 mb-2">Your rating</p>
          <StarRating value={rating} onChange={setRating} />
        </div>

        {/* Review text area */}
        <div className="p-4">
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            className="w-full min-h-[160px] bg-transparent border border-white/[0.08] rounded-lg p-3 text-sm text-neutral-300 placeholder-neutral-600 resize-y focus:outline-none focus:border-indigo-500/50 transition-colors"
            placeholder="Write your review..."
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 px-4 pb-4">
          <button
            onClick={handlePost}
            disabled={isPosting || !reviewText.trim()}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPosting ? "Posting..." : "Post Review"}
          </button>
          {posted && (
            <button
              onClick={handleReset}
              className="px-5 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 text-sm font-medium rounded-lg transition-colors"
            >
              Reset & Try Again
            </button>
          )}
        </div>
      </div>

      {/* AI Reply section */}
      {posted && aiReply && (
        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 p-4 border-b border-white/[0.06]">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
              AI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white">Farjana Refrigeration</p>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-medium">AI Generated</span>
              </div>
              <p className="text-[11px] text-neutral-500">Business owner response</p>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-neutral-300 leading-relaxed">{aiReply}</p>
          </div>
          <div className="px-4 pb-4">
            <p className="text-[11px] text-neutral-600 italic">
              This is how your AI would respond to this review on Google. The response is generated automatically.
            </p>
          </div>
        </div>
      )}

      {/* Empty state before posting */}
      {!posted && (
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <span className="text-amber-400 text-xs">⚠</span>
            <p className="text-xs text-amber-300/80">
              This is a simulation for Google verification purposes. No real review will be posted.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
