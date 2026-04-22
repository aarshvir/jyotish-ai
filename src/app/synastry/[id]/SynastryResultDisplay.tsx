'use client';

import { motion } from 'framer-motion';
import { MandalaRing } from '@/components/ui/MandalaRing';

const NAKSHATRA_NATURES: Record<string, string> = {
  Ashwini: 'Dynamic & Healing', Bharani: 'Creative & Intense', Krittika: 'Sharp & Purifying',
  Rohini: 'Magnetic & Growing', Mrigashira: 'Searching & Gentle', Ardra: 'Transformative & Stormy',
  Punarvasu: 'Renewal & Safe', Pushya: 'Nurturing & Wise', Ashlesha: 'Intense & Mystical',
  Magha: 'Regal & Traditional', 'Purva Phalguni': 'Pleasure & Artistic', 'Uttara Phalguni': 'Social & Committed',
  Hasta: 'Skillful & Helpful', Chitra: 'Brilliant & Structural', Swati: 'Independent & Adaptable',
  Vishakha: 'Goal-oriented & Vigorous', Anuradha: 'Devotional & Friendly', Jyeshtha: 'Protective & Masterful',
  Mula: 'Rooted & Destructive', 'Purva Ashadha': 'Invincible & Patient', 'Uttara Ashadha': 'Victory & Enduring',
  Shravana: 'Listening & Learning', Dhanishtha: 'Rhythmic & Wealthy', Shatabhisha: 'Healing & Secluded',
  'Purva Bhadrapada': 'Ecstatic & Independent', 'Uttara Bhadrapada': 'Wise & Restrained', Revati: 'Gentle & Completing',
};

const GET_GUIDANCE = (score: number) => {
  if (score >= 28) return { title: 'Celestial Unison', desc: 'A rare and deeply resonant alignment. Your path together carries profound mutual understanding and karmic affinity — nurture this as a sacred partnership.' };
  if (score >= 21) return { title: 'Harmonious Union', desc: 'Strong natural compatibility. Your strengths complement each other\'s needs, creating a stable foundation for growth and shared aspirations.' };
  if (score >= 18) return { title: 'Balanced Path', desc: 'A viable and supportive connection. Real affinity exists here — some areas will need conscious attention, but the core is well-aligned for a long-term journey.' };
  return { title: 'Conscious Effort Required', desc: 'This pairing presents specific challenges. Success depends on mutual effort, honest communication, and a willingness to understand each other\'s very different rhythms.' };
};

interface KootaLine { name: string; score: number; max: number; note: string; }
interface Props {
  score: number;
  breakdown: KootaLine[];
  commentary: string;
  partnerA: { name: string; moon_nakshatra?: string };
  partnerB: { name: string; moon_nakshatra?: string };
  createdAt: string | null;
}

export function SynastryResultDisplay({ score, breakdown, commentary, partnerA, partnerB, createdAt }: Props) {
  const isGood = score >= 18;
  const isExcellent = score >= 25;
  const guidance = GET_GUIDANCE(score);

  return (
    <>
      {/* Hero: score ring */}
      <div className="flex flex-col items-center text-center mb-24">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="relative mb-12">
          <div className="absolute inset-0 flex items-center justify-center -z-10 opacity-30">
            <MandalaRing className="w-[500px] h-[500px] text-amber animate-slow-spin" />
          </div>
          <div className="w-64 h-64 rounded-full border-4 border-horizon/20 flex flex-col items-center justify-center bg-cosmos/60 backdrop-blur-xl relative">
            <svg className="absolute inset-0 -rotate-90 w-full h-full" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" className="text-horizon/10" />
              <motion.circle
                cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2"
                strokeDasharray="301.59"
                initial={{ strokeDashoffset: 301.59 }}
                animate={{ strokeDashoffset: 301.59 - (score / 36) * 301.59 }}
                transition={{ duration: 2, ease: 'easeOut' }}
                className={isExcellent ? 'text-success' : isGood ? 'text-amber' : 'text-caution'}
              />
            </svg>
            <span className="text-mono-sm text-dust uppercase tracking-[0.2em] mb-2">Guna Score</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-7xl font-display font-bold ${isExcellent ? 'text-success' : isGood ? 'text-amber' : 'text-caution'}`}>{score}</span>
              <span className="text-2xl text-dust/40">/ 36</span>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="max-w-2xl">
          <h1 className="text-display-md font-display mb-4 text-star">{guidance.title}</h1>
          <p className="text-lg text-dust/80 leading-relaxed italic">&quot;{commentary}&quot;</p>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-12 mb-24">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="lg:col-span-1 p-8 rounded-sm bg-cosmos border border-amber/20 relative h-fit">
          <h3 className="text-xs font-mono text-amber uppercase tracking-widest mb-6">Cosmic Guidance</h3>
          <p className="text-star leading-relaxed mb-8">{guidance.desc}</p>
          <div className="space-y-4">
            {[partnerA, partnerB].map((p) => (
              <div key={p.name} className="p-4 rounded-sm bg-nebula border border-horizon/30 flex justify-between items-center">
                <span className="text-mono-xs text-dust uppercase">{p.name}</span>
                <span className="text-sm font-body text-star">{p.moon_nakshatra}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="lg:col-span-2 space-y-8">
          <h2 className="text-display-xs font-display text-star">Eightfold Compatibility</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {breakdown.map((k) => (
              <div key={k.name} className="p-5 rounded-sm bg-cosmos border border-horizon/20">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-mono-xs text-dust uppercase tracking-wider">{k.name}</span>
                  <span className={`text-sm font-mono ${k.score === k.max ? 'text-success' : k.score === 0 ? 'text-caution' : 'text-amber'}`}>{k.score} / {k.max}</span>
                </div>
                <div className="h-1.5 w-full bg-horizon/10 rounded-full mb-3 overflow-hidden">
                  <div className={`h-full ${k.score === k.max ? 'bg-success' : 'bg-amber'}`} style={{ width: `${(k.score / k.max) * 100}%` }} />
                </div>
                <p className="text-xs text-dust/60 leading-relaxed">{k.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Archetypal Resonance */}
      <div className="mb-24">
        <h2 className="text-display-xs font-display text-star mb-12 text-center">Archetypal Resonance</h2>
        <div className="grid sm:grid-cols-2 gap-8">
          {[partnerA, partnerB].map((p) => (
            <div key={p.name} className="p-8 rounded-sm bg-nebula border border-horizon/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-6xl font-display uppercase tracking-widest pointer-events-none">{p.moon_nakshatra}</div>
              <p className="text-mono-sm text-amber mb-2 uppercase tracking-widest">{p.name}</p>
              <h4 className="text-2xl font-display text-star mb-4">{p.moon_nakshatra}</h4>
              <p className="text-dust leading-relaxed">
                Core Nature: <strong className="text-star font-medium">{NAKSHATRA_NATURES[p.moon_nakshatra ?? ''] ?? 'Complex & Profound'}</strong>.{' '}
                Influenced by the Moon&apos;s position in {p.moon_nakshatra}, {p.name} carries qualities of {(NAKSHATRA_NATURES[p.moon_nakshatra ?? ''] ?? 'divine depth').toLowerCase()}.
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-mono-xs text-dust/30 text-center">
        Ashtakoot Guna Milan computed with Parashari standards · {createdAt ? new Date(createdAt).toLocaleDateString() : 'Recent'}
      </p>
    </>
  );
}
