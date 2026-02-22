'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MandalaRing } from '@/components/ui/MandalaRing';
import { StarField } from '@/components/ui/StarField';
import { ReportSidebar } from '@/components/report/ReportSidebar';
import { NativityCard } from '@/components/report/NativityCard';
import { MonthlyAnalysis } from '@/components/report/MonthlyAnalysis';
import { WeeklyAnalysis } from '@/components/report/WeeklyAnalysis';
import { DailyAnalysis } from '@/components/report/DailyAnalysis';
import { HourlyAnalysis } from '@/components/report/HourlyAnalysis';
import { PeriodSynthesis } from '@/components/report/PeriodSynthesis';

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

  useEffect(() => {
    console.log('📊 Report page params:', { name, date, time, city, lat, lng, type });
    if (!lat || !lng || lat === '' || lng === '' || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
      console.warn('⚠️ Missing or invalid lat/lng coordinates');
    }

    fetchReportData();
  }, []);

  async function fetchReportData() {
    try {
      setIsLoading(true);
      setError(null);

      const birthLat = parseFloat(lat) || 0;
      const birthLng = parseFloat(lng) || 0;

      // Step 1: Ephemeris
      console.log('📡 Step 1: Fetching ephemeris data...');
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

      if (!ephemerisRes.ok) throw new Error('Ephemeris calculation failed');
      const ephemerisResult = await ephemerisRes.json();
      console.log('✅ Step 1 complete - Full response:', ephemerisResult);
      
      // Extract natal chart from response
      const natalChart = ephemerisResult.data || ephemerisResult;
      console.log('✅ Step 1 - Natal chart data:', { lagna: natalChart.lagna, hasLagna: !!natalChart.lagna });

      // Step 2: Nativity
      console.log('📡 Step 2: Analyzing nativity...');
      setLoadingStage(1);
      const nativityRes = await fetch('/api/agents/nativity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ natalChart }),
      });

      if (!nativityRes.ok) throw new Error('Nativity analysis failed');
      const nativity = await nativityRes.json();
      console.log('✅ Step 2 complete');

      // Step 3: Forecast
      console.log('📡 Step 3: Generating forecast...');
      setLoadingStage(2);
      const today = new Date();
      const dateFrom = today.toISOString().split('T')[0];
      const dateTo = new Date(today.getTime() + 29 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const forecastRes = await fetch('/api/agents/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          natalChart,
          birthLat,
          birthLng,
          currentLat: birthLat,
          currentLng: birthLng,
          timezoneOffset: 330,
          dateFrom,
          dateTo,
        }),
      });

      if (!forecastRes.ok) throw new Error('Forecast generation failed');
      const forecast = await forecastRes.json();
      console.log('✅ Step 3 complete');

      // Step 4: Commentary
      console.log('📡 Step 4: Generating grandmaster commentary...');
      setLoadingStage(3);
      const commentaryRes = await fetch('/api/generate-commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ natalChart, nativity, forecast, reportType: type }),
      });

      if (!commentaryRes.ok) throw new Error('Commentary generation failed');
      const { commentary } = await commentaryRes.json();
      console.log('✅ Step 4 complete');

      // Combine all data
      setReportData({
        natalChart,
        nativity,
        forecast,
        commentary,
      });

      console.log('🎉 Report generation complete!');
      setIsLoading(false);
    } catch (err: any) {
      console.error('❌ Report generation error:', err);
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
            onClick={fetchReportData}
            className="px-8 py-3 bg-amber text-space font-body font-medium rounded-sm hover:bg-amber-glow transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!reportData) return null;

  // Extract data for components
  const { natalChart, commentary } = reportData;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-space relative"
    >
      <StarField />
      <ReportSidebar />

      <main className="lg:ml-[200px] px-6 py-12 max-w-4xl mx-auto relative z-10">
        <NativityCard
          name={name}
          birthDate={date}
          birthTime={time}
          birthCity={city}
          lagna={natalChart.lagna || 'Unknown'}
          lagnaDegree={natalChart.lagna_degree || 0}
          moonSign={natalChart.planets?.Moon?.sign || 'Unknown'}
          moonNakshatra={natalChart.moon_nakshatra || 'Unknown'}
          currentDasha={natalChart.current_dasha || { mahadasha: 'Unknown', antardasha: 'Unknown' }}
          nativitySummary={commentary.nativity_summary}
        />

        {commentary.monthly && commentary.monthly.length > 0 && (
          <MonthlyAnalysis months={commentary.monthly} />
        )}

        {commentary.weekly && commentary.weekly.length > 0 && (
          <WeeklyAnalysis weeks={commentary.weekly} />
        )}

        {commentary.daily && commentary.daily.length > 0 && (
          <DailyAnalysis days={commentary.daily} />
        )}

        {commentary.daily && commentary.daily.length > 0 && commentary.daily[0]?.hours && (
          <HourlyAnalysis hours={commentary.daily[0].hours} />
        )}

        {commentary.period_synthesis && commentary.daily && (
          <PeriodSynthesis
            synthesis={commentary.period_synthesis}
            dailyScores={commentary.daily.map((d: any) => ({ date: d.date, score: d.day_score }))}
          />
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
