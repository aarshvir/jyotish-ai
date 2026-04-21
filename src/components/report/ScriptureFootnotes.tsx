'use client';

import { motion } from 'framer-motion';
import type { Citation } from '@/lib/reports/postProcess/extractCitations';

interface ScriptureFootnotesProps {
  /** The ordered list of citations extracted from the commentary */
  citations: Citation[];
  /** Optional CSS class name for wrapper */
  className?: string;
}

/**
 * ScriptureFootnotes — Renders a classical scripture reference table below
 * any report section that contains [[SOURCE:CH:V]] citation markers.
 *
 * Usage:
 *   const { text, citations } = replaceCitationsWithFootnotes(rawCommentary);
 *   <ScriptureFootnotes citations={citations} />
 */
export function ScriptureFootnotes({ citations, className = '' }: ScriptureFootnotesProps) {
  if (!citations || citations.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`mt-6 pt-4 border-t border-horizon/20 ${className}`}
      aria-label="Classical scripture references"
    >
      <p className="font-mono text-mono-sm text-dust/60 tracking-[0.12em] uppercase mb-3">
        Classical Sources
      </p>

      <ol className="space-y-1" role="list">
        {citations.map((c) => (
          <li
            key={c.marker}
            className="flex items-start gap-3"
            id={`fn-${c.footnoteIndex}`}
          >
            <span className="font-mono text-xs text-amber/70 shrink-0 w-5 text-right">
              [{c.footnoteIndex}]
            </span>
            <div>
              <span className="font-mono text-xs text-dust/80">
                <span className="text-star/60">{c.sourceName}</span>
                {', Ch. '}
                <span className="text-amber/80">{c.chapter}</span>
                {', v. '}
                <span className="text-amber/80">{c.verse}</span>
              </span>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-3 font-mono text-xs text-dust/30 italic">
        Citations grounded in reference corpus; classical verse numbering follows standard scholarly editions.
      </p>
    </motion.div>
  );
}
