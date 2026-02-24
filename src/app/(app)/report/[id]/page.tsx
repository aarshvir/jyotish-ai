'use client';

import { useEffect, useState, useRef, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MandalaRing } from '@/components/ui/MandalaRing';
import { StarField } from '@/components/ui/StarField';
import { ReportSidebar } from '@/components/report/ReportSidebar';
import { NativityCard } from '@/components/report/NativityCard';
import { MonthlyAnalysis } from '@/components/report/MonthlyAnalysis';
import { WeeklyAnalysis } from '@/components/report/WeeklyAnalysis';
import { DailyAnalysis } from '@/components/report/DailyAnalysis';
import { PeriodSynthesis } from '@/components/report/PeriodSynthesis';
import { ReportErrorBoundary } from '@/components/ErrorBoundary';

const LOADING_STAGES = [
  'Computing sidereal positions via Swiss Ephemeris...',
  'Analyzing natal architecture...',
  'Calculating 30 days of hora and choghadiya...',
  'Generating grandmaster interpretations...',
];

function ReportContent() {
  const params = useSearchParams();
  const name = params.get('name') ?? 'Seeker';
  const date = params.get('date') ?? '';
  const time = params.get('time') ?? '';
  const city = params.get('city') ?? '';
  const lat = params.get('lat') ?? '';
  const lng = params.get('lng') ?? '';
  const type = params.get('type') ?? 'free';

  const [isLoading, setIsLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [copyLinkFeedback, setCopyLinkFeedback] = useState(false);
  const hasFetched = useRef(false);

  const copyReportLink = useCallback(() => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopyLinkFeedback(true);
      setTimeout(() => setCopyLinkFeedback(false), 2000);
    }
  }, []);

  const handleDaySelectFromCalendar = useCallback((index: number) => {
    setActiveDayIndex(index);
    document.getElementById('daily')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    console.log('Report page params:', { name, date, time, city, lat, lng, type });
    fetchReportData();
  }, []);

  async function fetchReportData() {
    try {
      setIsLoading(true);
      setError(null);

      const birthLat = parseFloat(lat) || 0;
      const birthLng = parseFloat(lng) || 0;

      // Step 1: Ephemeris
      setLoadingStage(0);
      const ephemerisRes = await fetch('/api/agents/ephemeris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'natal-chart',
          birth_date: date,
          birth_time: `${time}:00`,
          birth_city: city,
          birth_lat: birthLat,
          birth_lng: birthLng,
        }),
      });

      if (!ephemerisRes.ok) {
        const ephErr = await ephemerisRes.json().catch(() => ({}));
        throw new Error(ephErr.error || 'Ephemeris calculation failed');
      }
      const ephemerisResult = await ephemerisRes.json();
      const natalChart = ephemerisResult.data || ephemerisResult;

      // Step 2: Nativity (non-fatal — report renders without it)
      setLoadingStage(1);
      let nativity: any = null;
      try {
        const nativityRes = await fetch('/api/agents/nativity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ natalChart }),
        });
        if (nativityRes.ok) {
          const nativityRaw = await nativityRes.json();
          nativity = nativityRaw.data || nativityRaw;
        } else {
          const natErr = await nativityRes.json().catch(() => ({}));
          console.error('Nativity API error (non-fatal):', natErr.error || nativityRes.status);
        }
      } catch (natErr: any) {
        console.error('Nativity fetch failed (non-fatal):', natErr.message);
      }

      // Step 3: Forecast
      setLoadingStage(2);
      const today = new Date();
      const dateFrom = today.toISOString().split('T')[0];
      const dateTo = new Date(today.getTime() + 29 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const timezoneOffset = -(new Date().getTimezoneOffset());

      const forecastRes = await fetch('/api/agents/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          natalChart,
          birthLat,
          birthLng,
          currentLat: birthLat,
          currentLng: birthLng,
          timezoneOffset,
          dateFrom,
          dateTo,
        }),
      });

      if (!forecastRes.ok) {
        const forecastErr = await forecastRes.json().catch(() => ({}));
        throw new Error(forecastErr.error || 'Forecast generation failed');
      }
      const forecastRaw = await forecastRes.json();
      const forecast = forecastRaw.data || forecastRaw;

      // Step 4: Commentary
      setLoadingStage(3);
      const commentaryRes = await fetch('/api/generate-commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ natalChart, nativity, forecast, reportType: type }),
      });

      let commentary: any = {};
      if (commentaryRes.ok) {
        const commentaryRaw = await commentaryRes.json();
        commentary = commentaryRaw.commentary || commentaryRaw.data || commentaryRaw;
      } else {
        console.error('Commentary generation failed, continuing with partial report');
      }

      setReportData({ natalChart, nativity, forecast, commentary });
      setIsLoading(false);
    } catch (err: any) {
      console.error('Report generation error:', err);
      setError(err.message || 'Failed to generate report');
      setIsLoading(false);
    }
  }

  if (isLoading) {
    const progress = ((loadingStage + 1) / LOADING_STAGES.length) * 100;

    return (
      <div className="min-h-screen bg-space flex flex-col items-center justify-center relative overflow-hidden px-6 py-20">
        <StarField />

        <div className="relative mb-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="w-64 h-64 text-amber/20"
          >
            <MandalaRing className="w-full h-full" />
          </motion.div>

          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-28 h-28 text-amber/35">
              <MandalaRing className="w-full h-full" />
            </div>
          </motion.div>

          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="w-3 h-3 rounded-full bg-amber" />
          </motion.div>
        </div>

        <h1
          className="font-display font-semibold text-star text-center mb-3 relative z-10"
          style={{ fontSize: 'clamp(26px, 4vw, 42px)' }}
        >
          Your Cosmic Blueprint Is Being Assembled
        </h1>

        <AnimatePresence mode="wait">
          <motion.p
            key={loadingStage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="font-mono text-sm text-dust text-center mb-8 max-w-sm relative z-10"
          >
            {LOADING_STAGES[loadingStage]}
          </motion.p>
        </AnimatePresence>

        <div className="w-64 h-px bg-horizon mb-12 relative overflow-visible rounded-full z-10">
          <motion.div
            className="absolute inset-y-0 left-0 bg-amber rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber shadow-[0_0_8px_2px_rgba(245,158,11,0.6)]"
            animate={{ left: `calc(${progress}% - 3px)` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        </div>

        <div className="border border-horizon rounded-sm px-8 py-5 bg-cosmos/70 backdrop-blur-sm max-w-sm w-full relative z-10">
          <p className="font-mono text-xs text-amber tracking-[0.2em] uppercase mb-4">
            Chart Parameters
          </p>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-dust">Native</span>
              <span className="font-mono text-xs text-star">{name}</span>
            </div>
            {date && (
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-dust">Birth Date</span>
                <span className="font-mono text-xs text-star">{date}</span>
              </div>
            )}
            {time && (
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-dust">Birth Time</span>
                <span className="font-mono text-xs text-star">{time}</span>
              </div>
            )}
            {city && (
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-dust">Location</span>
                <span className="font-mono text-xs text-star truncate ml-4 text-right max-w-[160px]">
                  {city}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-horizon/40">
              <span className="font-mono text-xs text-dust">Report</span>
              <span className="font-mono text-xs text-amber">
                {type === '7day' ? '7-Day Forecast' : type === 'monthly' ? 'Monthly Oracle' : type === 'free' ? 'Preview Report' : type}
              </span>
            </div>
          </div>
        </div>

        <p className="font-mono text-xs text-dust/40 mt-8 relative z-10">
          This typically takes 20–40 seconds
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-space flex flex-col items-center justify-center px-6 py-20">
        <StarField />
        <div className="max-w-md text-center relative z-10">
          <div className="text-crimson text-6xl mb-6">⚠</div>
          <h1 className="font-display font-semibold text-star text-3xl mb-4">
            Generation Failed
          </h1>
          <p className="font-body text-dust text-base mb-8">{error}</p>
          <button
            onClick={() => { hasFetched.current = false; fetchReportData(); }}
            className="px-8 py-3 bg-amber text-space font-body font-medium rounded-sm hover:bg-amber-glow transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!reportData) return null;

  const { natalChart, forecast, commentary } = reportData;
  const safeCommentary = commentary ?? {};
  const safeMonthly = Array.isArray(safeCommentary.monthly) ? safeCommentary.monthly : [];
  const safeWeekly = Array.isArray(safeCommentary.weekly) ? safeCommentary.weekly : [];
  const commentaryDays = Array.isArray(safeCommentary.daily) ? safeCommentary.daily : [];

  const dayLimit = type === 'monthly' ? 30 : 7;
  const forecastDays: any[] = forecast?.days ?? [];

  const mergedDays = forecastDays.slice(0, dayLimit).map((day: any, i: number) => {
    const cd = commentaryDays.find((c: any) => c?.date === day.date) ?? commentaryDays[i] ?? null;
    const slots = day.rating?.all_slots ?? [];
    const rk = day.rahu_kaal ?? cd?.rahu_kaal;
    const rahuKaalFormatted = rk
      ? { start: (rk.start_time ?? rk.start) ?? '', end: (rk.end_time ?? rk.end) ?? '' }
      : null;
    const peakFromRating = (day.rating?.peak_windows ?? []).slice(0, 3).map((w: any) => ({
      time: `${w.start_time ?? ''}–${w.end_time ?? ''}`,
      hora: w.hora_ruler ?? '',
      choghadiya: w.choghadiya ?? '',
      score: w.rating ?? 0,
      reason: '',
    }));
    return {
      date: day.date ?? '',
      day_score: cd?.day_score ?? day.rating?.day_score ?? 50,
      day_theme: cd?.day_theme ?? (day.narrative ? day.narrative.slice(0, 80) : ''),
      day_rating_label: cd?.day_rating_label ?? ((day.rating?.day_score ?? 50) >= 70 ? 'EXCELLENT' : (day.rating?.day_score ?? 50) >= 50 ? 'GOOD' : 'CHALLENGING'),
      panchang: cd?.panchang ?? day.panchang ?? {},
      day_overview: cd?.day_overview ?? day.narrative ?? 'Based on today\'s panchang and hora patterns, this day shows moderate potential. Focus on key activities during the optimal windows.',
      rahu_kaal: rahuKaalFormatted,
      best_windows: (cd?.best_windows?.length ? cd.best_windows : peakFromRating) ?? [],
      avoid_windows: cd?.avoid_windows ?? [],
      hours: cd?.hours ?? null,
      hourlySlots: slots.map((s: any) => ({
        time: s.start_time ?? '',
        end_time: s.end_time ?? '',
        score: s.rating ?? 50,
        hora_planet: s.hora_ruler ?? '',
        hora_planet_symbol: '',
        choghadiya: s.choghadiya ?? '',
        choghadiya_quality: s.choghadiya_quality ?? '',
        is_rahu_kaal: s.is_rahu_kaal ?? false,
        commentary: s.commentary ?? '',
      })),
    };
  });

  if (typeof window !== 'undefined') {
    console.log('Report merged data:', { mergedDaysCount: mergedDays.length, day0Hours: mergedDays[0]?.hourlySlots?.length ?? 0 });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-space relative"
    >
      <StarField />
      <ReportSidebar reportLoaded={!!reportData} />

      <main className="lg:ml-[200px] px-6 py-12 max-w-4xl mx-auto relative z-10">
        {/* Copy report link */}
        <div className="flex justify-end mb-6">
          <button
            onClick={copyReportLink}
            className="font-mono text-xs text-dust hover:text-amber transition-colors flex items-center gap-2"
          >
            {copyLinkFeedback ? (
              <span className="text-emerald">Link copied!</span>
            ) : (
              <>
                <span>Copy report link</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </>
            )}
          </button>
        </div>
        <ReportErrorBoundary fallbackTitle="Nativity">
          <NativityCard
            name={name}
            birthDate={date}
            birthTime={time}
            birthCity={city}
            lagna={natalChart?.lagna || 'Unknown'}
            lagnaDegree={natalChart?.lagna_degree ?? 0}
            moonSign={natalChart?.planets?.Moon?.sign || 'Unknown'}
            moonNakshatra={natalChart?.moon_nakshatra || 'Unknown'}
            currentDasha={natalChart?.current_dasha ?? { mahadasha: 'Unknown', antardasha: 'Unknown' }}
            nativitySummary={safeCommentary.nativity_summary}
            nativity={reportData?.nativity}
          />
        </ReportErrorBoundary>

        {safeMonthly.length > 0 && (
          <ReportErrorBoundary fallbackTitle="Monthly Analysis">
            <MonthlyAnalysis months={safeMonthly} />
          </ReportErrorBoundary>
        )}

        {safeWeekly.length > 0 && (
          <ReportErrorBoundary fallbackTitle="Weekly Analysis">
            <WeeklyAnalysis weeks={safeWeekly} />
          </ReportErrorBoundary>
        )}

        {mergedDays.length > 0 && (
          <ReportErrorBoundary fallbackTitle="Daily Forecast">
            <DailyAnalysis
              days={mergedDays}
              activeDayIndex={activeDayIndex}
              onDayChange={setActiveDayIndex}
              lagna={natalChart?.lagna}
            />
          </ReportErrorBoundary>
        )}

        {(safeCommentary.period_synthesis || mergedDays.length > 0) && (
          <ReportErrorBoundary fallbackTitle="Period Synthesis">
            <PeriodSynthesis
              synthesis={safeCommentary.period_synthesis ?? ''}
              dailyScores={mergedDays.map((d: any) => ({ date: d?.date ?? '', score: d?.day_score ?? 50 }))}
              onDayClick={handleDaySelectFromCalendar}
            />
          </ReportErrorBoundary>
        )}
      </main>
    </motion.div>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-space flex items-center justify-center">
          <div className="w-16 h-16 text-amber animate-spin-slow">
            <MandalaRing className="w-full h-full" />
          </div>
        </div>
      }
    >
      <ReportContent />
    </Suspense>
  );
}
