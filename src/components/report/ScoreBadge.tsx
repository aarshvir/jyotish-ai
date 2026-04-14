'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  animate?: boolean;
}

export function ScoreBadge({ score: rawScore, size = 'md', showLabel = false, animate = true }: ScoreBadgeProps) {
  const score = Number.isFinite(rawScore) ? rawScore : 0;
  const [displayScore, setDisplayScore] = useState(animate ? 0 : score);

  useEffect(() => {
    if (!animate) { setDisplayScore(score); return; }
    const steps = 60;
    const increment = score / steps;
    let current = 0;
    let frame = 0;
    const counter = () => {
      frame++;
      current = Math.min(score, increment * frame);
      setDisplayScore(Math.round(current));
      if (current < score) requestAnimationFrame(counter);
    };
    requestAnimationFrame(counter);
  }, [score, animate]);

  const getColor = (s: number) => {
    if (s >= 65) return 'text-success';
    if (s >= 45) return 'text-amber';
    return 'text-caution';
  };

  const getLabel = (s: number) => {
    if (s >= 85) return '★★★ PEAK';
    if (s >= 75) return '★★ EXCELLENT';
    if (s >= 65) return '★ GOOD';
    if (s >= 50) return 'NEUTRAL';
    if (s >= 45) return '⚠ CAUTION';
    if (s >= 35) return '⚠⚠ DIFFICULT';
    return '🔴 AVOID';
  };

  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
    xl: 'text-[96px]',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        initial={animate ? { opacity: 0, scale: 0.8 } : undefined}
        animate={animate ? { opacity: 1, scale: 1 } : undefined}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`font-mono font-bold ${sizeClasses[size]} ${getColor(score)} leading-none tabular-nums`}
      >
        {displayScore}
      </motion.div>
      {showLabel && (
        <span className={`font-mono text-label-sm tracking-[0.15em] uppercase ${getColor(score)}`}>
          {getLabel(score)}
        </span>
      )}
    </div>
  );
}
