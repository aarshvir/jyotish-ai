'use client';

import { useState } from 'react';

/**
 * "Ask your report" — a follow-up Q&A box on paid reports. Sends the question plus a
 * compact report context to /api/reports/[id]/ask. Non-streaming v1. Excluded from print.
 */
export function AskQuestion({
  reportId,
  context,
  headers,
}: {
  reportId: string;
  context: string;
  headers: Record<string, string>;
}) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function ask() {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setErr(null);
    setAnswer(null);
    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}/ask`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ question: q, context }),
      });
      if (res.status === 206) {
        setErr('The assistant is temporarily unavailable. Please try again later.');
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { answer?: string | null; error?: string };
      if (!res.ok) {
        setErr(data.error ?? 'Could not get an answer. Please try again.');
        return;
      }
      setAnswer(typeof data.answer === 'string' ? data.answer : null);
    } catch {
      setErr('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      id="ask"
      className="pdf-exclude scroll-mt-24 card border border-amber/30 rounded-card p-6 sm:p-8 bg-amber/[0.03]"
      data-print-hide
    >
      <p className="section-eyebrow mb-2">Ask your report</p>
      <h2 className="font-display text-headline-md text-star mb-1">Have a question about your reading?</h2>
      <p className="font-body text-body-sm text-dust mb-4">
        Ask anything about what your report means — e.g. &ldquo;Which week is best to start a new job?&rdquo;
      </p>

      <textarea
        aria-label="Your question about the report"
        className="cosmic-input min-h-[80px] resize-y w-full"
        rows={2}
        maxLength={500}
        placeholder="Type your question…"
        value={question}
        onChange={(e) => setQuestion(e.target.value.slice(0, 500))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void ask();
        }}
      />
      <div className="flex items-center justify-between mt-2">
        <span className="font-mono text-mono-sm text-dust/40">{question.length}/500</span>
        <button
          type="button"
          onClick={() => void ask()}
          disabled={!question.trim() || loading}
          className="btn-primary px-5 py-2.5 min-h-[44px] disabled:opacity-40"
        >
          {loading ? 'Thinking…' : 'Ask'}
        </button>
      </div>

      {err && <p className="text-caution font-body text-body-sm mt-3">{err}</p>}
      {answer && (
        <div className="mt-4 rounded-card border border-horizon/40 bg-cosmos/60 p-5">
          <p className="font-body text-body-md text-star leading-relaxed whitespace-pre-line">{answer}</p>
          <p className="font-mono text-mono-sm text-dust/40 mt-3">
            AI-generated from your report. Not medical, legal, or financial advice.
          </p>
        </div>
      )}
    </section>
  );
}
