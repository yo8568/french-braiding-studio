"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { INPUT_CLASS, FEEDBACK_CATEGORY_LABELS } from "@/lib/constants";

const categories = Object.keys(FEEDBACK_CATEGORY_LABELS) as Array<
  keyof typeof FEEDBACK_CATEGORY_LABELS
>;

export default function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("suggestion");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reset = () => {
    setCategory("suggestion");
    setContent("");
    setSubmitted(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    const supabase = createClient();
    await supabase.from("feedback").insert({
      page: pathname,
      category,
      content: content.trim(),
    });
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => {
      setOpen(false);
      reset();
    }, 1500);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => {
          setOpen(!open);
          if (submitted) reset();
        }}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center"
        aria-label="意見回饋"
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Feedback form */}
      {open && (
        <div className="fixed bottom-20 right-6 z-40 w-80 bg-card border border-border rounded-xl shadow-xl p-4">
          {submitted ? (
            <div className="text-center py-6">
              <div className="text-2xl mb-2">&#10003;</div>
              <p className="text-sm text-muted">感謝您的回饋！</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h3 className="font-bold text-primary mb-3">意見回饋</h3>
              <p className="text-xs text-muted mb-3">
                目前頁面：{pathname}
              </p>

              <label className="block text-sm mb-1">分類</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`${INPUT_CLASS} mb-3`}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {FEEDBACK_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>

              <label className="block text-sm mb-1">內容</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={`${INPUT_CLASS} mb-3 min-h-[80px] resize-y`}
                placeholder="請描述您的意見或建議..."
                required
              />

              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="w-full bg-primary text-white py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting ? "送出中..." : "送出回饋"}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
