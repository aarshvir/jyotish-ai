'use client';

import { useEffect, useState, useRef, Suspense, useCallback } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import './print.css';
import { MandalaRing } from '@/components/ui/MandalaRing';
import { StarField } from '@/components/ui/StarField';
import { ReportSidebar } from '@/components/report/ReportSidebar';
import { NativityCard } from '@/components/report/NativityCard';
import { MonthlyAnalysis } from '@/components/report/MonthlyAnalysis';
import { WeeklyAnalysis } from '@/components/report/WeeklyAnalysis';
import { DailyAnalysis } from '@/components/report/DailyAnalysis';
import { PeriodSynthesis } from '@/components/report/PeriodSynthesis';
import { ReportErrorBoundary } from '@/components/ErrorBoundary';
import { validateReportData } from '@/lib/validation/reportValidation';
import { generateReportPDF } from '@/lib/pdf/generateReportPDF';

const STEPS = [
  'Calculating planetary positions',
  'Analysing birth chart',
  'Scoring 126 hourly windows',
  'Writing daily forecasts',
  'Deepening natal analysis',
  'Writing hourly commentary (day 1 of 7)',
  'Writing hourly commentary (day 2 of 7)',
  'Writing hourly commentary (day 3 of 7)',
  'Writing hourly commentary (day 4 of 7)',
  'Writing hourly commentary (day 5 of 7)',
  'Writing hourly commentary (day 6 of 7)',
  'Writing hourly commentary (day 7 of 7)',
  'Generating monthly forecast (months 1-6)',
  'Generating monthly forecast (months 7-12)',
  'Writing period synthesis',
  'Finalising report',
];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRouteUuid(id: string) {
  return UUID_RE.test(id);
}

function ReportContent() {
  const routeParams = useParams();
  const reportIdFromRoute = typeof routeParams?.id === 'string' ? routeParams.id : '';
  const params = useSearchParams();
  const queryKey = params.toString();
  const name = params.get('name') ?? 'Seeker';
  const date = params.get('date') ?? '';
  const time = params.get('time') ?? '';
  const city = params.get('city') ?? '';
  const lat = params.get('lat') ?? '';
  const lng = params.get('lng') ?? '';
  const type = params.get('type') ?? 'free';
  // Current location params (may differ from birth city)
  const currentLat = params.get('currentLat') ?? lat;
  const currentLng = params.get('currentLng') ?? lng;
  const currentCity = params.get('currentCity') ?? city;
  const currentTzOffset = params.get('currentTz') ? parseInt(params.get('currentTz')!) : null;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [commentaryPartial, setCommentaryPartial] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [copyLinkFeedback, setCopyLinkFeedback] = useState(false);
  const [copyLinkError, setCopyLinkError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfStatus, setPdfStatus] = useState('Download PDF');
  const [stepMessage, setStepMessage] = useState('');
  const [stepDetail, setStepDetail] = useState('');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const hasFetched = useRef(false);
  const [birthDisplay, setBirthDisplay] = useState<{
    name: string;
    date: string;
    time: string;
    city: string;
  } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const genStartRef = useRef(0);

  const displayName = birthDisplay?.name ?? name;
  const displayDate = birthDisplay?.date ?? date;
  const displayTime = birthDisplay?.time ?? time;
  const displayCity = birthDisplay?.city ?? city;

  useEffect(() => {
    const sb = createClient();
    void sb.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user));
  }, []);

  const copyShareLink = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    setCopyLinkError(null);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopyLinkFeedback(true);
        setTimeout(() => setCopyLinkFeedback(false), 2500);
      } else {
        // Fallback: execCommand for older browsers or insecure contexts
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (ok) {
          setCopyLinkFeedback(true);
          setTimeout(() => setCopyLinkFeedback(false), 2500);
        } else {
          setCopyLinkError('Clipboard unavailable. Please copy the URL from the address bar.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Copy failed';
      setCopyLinkError(msg);
    }
  }, []);

  const handleDownloadPDF = useCallback(async () => {
    setPdfError(null);
    setPdfLoading(true);
    try {
      window.scrollTo(0, 0);
      await new Promise((resolve) => setTimeout(resolve, 300));
      await generateReportPDF(
        displayName,
        reportData?.generated_at ?? new Date().toISOString().slice(0, 10),
        (msg) => {
          setPdfStatus(msg);
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Print failed';
      console.error('Print/PDF flow failed:', err);
      setPdfError(msg);
    } finally {
      setPdfStatus('Download PDF');
      setPdfLoading(false);
    }
  }, [displayName, reportData]);

  const handleDaySelectFromCalendar = useCallback((index: number) => {
    setActiveDayIndex(index);
    document.getElementById('daily')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    hasFetched.current = false;
  }, [reportIdFromRoute, queryKey]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (hasFetched.current) return;

      if (isRouteUuid(reportIdFromRoute)) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: row } = await supabase
            .from('reports')
            .select('*')
            .eq('id', reportIdFromRoute)
            .eq('user_id', user.id)
            .maybeSingle();

          const rd = row?.report_data as Record<string, unknown> | null | undefined;
          const days = rd?.days;
          if (!cancelled && row && row.status === 'complete' && Array.isArray(days) && days.length > 0) {
            hasFetched.current = true;
            setBirthDisplay({
              name: String(row.native_name ?? 'Seeker'),
              date: String(row.birth_date ?? '').slice(0, 10),
              time: String(row.birth_time ?? '').slice(0, 5),
              city: String(row.birth_city ?? ''),
            });
            setReportData(rd);
            setIsLoading(false);
            return;
          }
        }

        if (!params.get('date')) {
          if (!cancelled) {
            setError(
              user
                ? 'Report not found, still generating, or incomplete. Open a new report from Onboard.'
                : 'Sign in to view saved reports, or use a share link that includes birth details in the URL.'
            );
            setIsLoading(false);
          }
          hasFetched.current = true;
          return;
        }
      }

      hasFetched.current = true;
      console.log('Report page params:', { name, date, time, city, lat, lng, type });
      await generateReport();
    }

    void init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once per route/query; generateReport is stable enough for this flow
  }, [reportIdFromRoute, queryKey]);

  async function createReportRecord() {
    if (!isRouteUuid(reportIdFromRoute)) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const planRaw = params.get('plan_type') || type;
    const planType = planRaw === 'free' ? 'preview' : planRaw;
    const birthTimeNorm =
      time && time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time || '12:00:00';

    const { error } = await supabase.from('reports').insert({
      id: reportIdFromRoute,
      user_id: user.id,
      user_email: user.email ?? '',
      native_name: params.get('name') || name || 'Unknown',
      birth_date: params.get('date') || date || '2000-01-01',
      birth_time: birthTimeNorm,
      birth_city: params.get('city') || city || 'Unknown',
      birth_lat: parseFloat(params.get('lat') || lat || '0') || null,
      birth_lng: parseFloat(params.get('lng') || lng || '0') || null,
      current_city: params.get('currentCity') || currentCity || null,
      current_lat: parseFloat(params.get('currentLat') || currentLat || '0') || null,
      current_lng: parseFloat(params.get('currentLng') || currentLng || '0') || null,
      timezone_offset: currentTzOffset,
      plan_type: planType,
      status: 'generating',
      payment_status: 'bypass',
    });

    if (error && error.code !== '23505') {
      console.error('createReportRecord:', error.message);
    }
  }

  async function saveReportToDatabase(reportPayload: Record<string, unknown>) {
    try {
      if (!isRouteUuid(reportIdFromRoute)) return;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const dayScores: Record<string, number> = {};
      const days = reportPayload.days as Array<{ date?: string; day_score?: number }> | undefined;
      days?.forEach((d) => {
        if (d.date && typeof d.day_score === 'number') dayScores[d.date] = d.day_score;
      });

      const natal = (reportPayload.nativity as { natal_chart?: Record<string, unknown> })?.natal_chart;
      const nc = natal as Record<string, unknown> | undefined;
      const cd = nc?.current_dasha as Record<string, string> | undefined;

      const startD = days?.[0]?.date;
      const endD = days?.length ? days[days.length - 1]?.date : undefined;

      const { error } = await supabase
        .from('reports')
        .update({
          native_name: params.get('name') || name,
          user_id: user.id,
          user_email: user.email ?? '',
          birth_date: params.get('date') || date,
          birth_time:
            time && time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time || '12:00:00',
          birth_city: params.get('city') || city,
          birth_lat: parseFloat(params.get('lat') || lat || '0') || null,
          birth_lng: parseFloat(params.get('lng') || lng || '0') || null,
          current_city: params.get('currentCity') || currentCity || null,
          current_lat: parseFloat(params.get('currentLat') || currentLat || '0') || null,
          current_lng: parseFloat(params.get('currentLng') || currentLng || '0') || null,
          timezone_offset: currentTzOffset,
          plan_type: params.get('plan_type') || (type === 'free' ? 'preview' : type),
          report_start_date: startD ?? null,
          report_end_date: endD ?? null,
          lagna_sign: (nc?.lagna as string) ?? null,
          moon_sign: ((nc?.planets as Record<string, { sign?: string }> | undefined)?.Moon?.sign as string) ?? null,
          moon_nakshatra: (nc?.moon_nakshatra as string) ?? null,
          dasha_mahadasha: cd?.mahadasha ?? null,
          dasha_antardasha: cd?.antardasha ?? null,
          day_scores: dayScores,
          report_data: reportPayload,
          status: 'complete',
          generation_completed_at: new Date().toISOString(),
          generation_time_seconds: Math.round((Date.now() - genStartRef.current) / 1000),
        })
        .eq('id', reportIdFromRoute)
        .eq('user_id', user.id);

      if (error) console.error('saveReportToDatabase:', error.message);
    } catch (e) {
      console.error('saveReportToDatabase', e);
    }
  }

  async function resilientFetch(url: string, options: RequestInit, retries = 3, delayMs = 2000): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, options);
        return res;
      } catch (err: any) {
        const isNetworkError = err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('SUSPENDED') || err.message?.includes('aborted');
        if (isNetworkError && i < retries - 1) {
          console.warn(`Network error on ${url}, retry ${i + 1}/${retries} in ${delayMs}ms...`);
          await new Promise(r => setTimeout(r, delayMs * (i + 1)));
          continue;
        }
        throw err;
      }
    }
    throw new Error(`Failed to fetch ${url} after ${retries} retries`);
  }

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  function formatDayLabel(dateStr: string): string {
    try {
      const d = new Date(dateStr + 'T12:00:00Z');
      const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${names[d.getUTCDay()]} · ${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
    } catch {
      return dateStr;
    }
  }

  async function generateReport() {
    try {
      setIsLoading(true);
      setError(null);
      genStartRef.current = Date.now();
      await createReportRecord();
      const birthLat = parseFloat(lat) || 0;
      const birthLng = parseFloat(lng) || 0;
      const dayCount = type === 'monthly' || type === 'annual' ? 30 : 7;
      const timezoneOffset = currentTzOffset ?? -new Date().getTimezoneOffset();
      const cLat = parseFloat(currentLat) || birthLat;
      const cLng = parseFloat(currentLng) || birthLng;
      const SIGNS_FOR_LAGNA = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
      const today = new Date();
      const dateRange: string[] = Array.from({ length: dayCount }, (_, i) => {
        const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
        return d.toISOString().split('T')[0];
      });

      // ── STEP 1: Ephemeris ──
      let ephemerisData: any = { lagna: 'Cancer', current_dasha: {}, planets: {} };
      try {
        console.log('[STEP-1] Starting...');
        setStepMessage('Reading the stars...');
        setStepDetail('Calculating planetary positions');
        setCurrentStepIndex(0);
        const ephemerisRes = await resilientFetch('/api/agents/ephemeris', {
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
        ephemerisData = ephemerisResult.data || ephemerisResult;
        console.log('[STEP-1] Complete');
      } catch (err) {
        console.error('[STEP-1] Failed:', err instanceof Error ? err.message : String(err));
      }

      // ── STEP 2: Nativity ──
      let nativityProfile: any = null;
      try {
        console.log('[STEP-2] Starting...');
        setStepMessage('Analysing your birth chart...');
        setStepDetail('Extended thinking: mapping yogas and house lordships');
        setCurrentStepIndex(1);
        const nativityRes = await resilientFetch('/api/agents/nativity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ natalChart: ephemerisData }),
        }, 2, 3000);
        if (nativityRes.ok) {
          const nativityRaw = await nativityRes.json();
          nativityProfile = nativityRaw.data || nativityRaw;
        }
        console.log('[STEP-2] Complete');
      } catch (natErr: any) {
        console.error('[STEP-2] Failed:', natErr instanceof Error ? natErr.message : String(natErr));
      }

      const natal_lagna_sign_index = Math.max(0, SIGNS_FOR_LAGNA.indexOf(ephemerisData?.lagna ?? ''));

      // ── STEP 3: Daily grids ──
      let dailyGridResults: any[] = [];
      try {
        console.log('[STEP-3] Starting...');
        setStepMessage('Calculating hourly scores...');
        setStepDetail('Computing 18 slots × ' + dayCount + ' days');
        setCurrentStepIndex(2);
        dailyGridResults = await Promise.all(
          dateRange.map(async (d) => {
            try {
              const res = await resilientFetch('/api/agents/daily-grid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: d, currentLat: cLat, currentLng: cLng, timezoneOffset, natal_lagna_sign_index }),
              }, 2, 2000);
              if (!res.ok) return null;
              return await res.json();
            } catch {
              return null;
            }
          })
        );
        console.log('[STEP-3] Complete');
      } catch (err) {
        console.error('[STEP-3] Failed:', err instanceof Error ? err.message : String(err));
      }

      const forecastDays: any[] = dailyGridResults.map((r, i) => {
        if (!r) {
          return {
            date: dateRange[i],
            panchang: {},
            rahu_kaal: { start: '', end: '' },
            day_score: 50,
            slots: Array.from({ length: 18 }, (_, si) => ({
              slot_index: si,
              display_label: `${String(6 + si).padStart(2, '0')}:00–${String(7 + si).padStart(2, '0')}:00`,
              dominant_hora: 'Moon',
              dominant_choghadiya: 'Chal',
              transit_lagna: '',
              transit_lagna_house: 1,
              is_rahu_kaal: false,
              score: 50,
            })),
          };
        }
        const rahu = r.rahu_kaal ?? {};
        return {
          date: r.date ?? dateRange[i],
          panchang: r.panchang ?? {},
          rahu_kaal: { start: rahu.start ?? '', end: rahu.end ?? '' },
          day_score: r.day_score ?? 50,
          planet_positions: r.planet_positions ?? undefined,
          slots: (r.slots ?? []).map((s: any) => ({
            slot_index: s.slot_index,
            display_label: s.display_label ?? '06:00–07:00',
            dominant_hora: s.dominant_hora ?? s.hora_ruler ?? '',
            dominant_choghadiya: s.dominant_choghadiya ?? s.choghadiya ?? '',
            transit_lagna: s.transit_lagna ?? '',
            transit_lagna_house: s.transit_lagna_house ?? 1,
            is_rahu_kaal: s.is_rahu_kaal ?? false,
            score: s.score ?? 50,
            start_iso: s.start_iso,
            end_iso: s.end_iso,
            midpoint_iso: s.midpoint_iso,
          })),
        };
      });

      const nativityData: any = {
        natal_chart: ephemerisData,
        lagna_analysis: nativityProfile?.lagna_analysis ?? '',
        current_dasha_interpretation:
          nativityProfile?.current_dasha_interpretation ?? '',
        key_yogas: nativityProfile?.yogas ?? [],
        functional_benefics: nativityProfile?.functional_benefics ?? [],
        functional_malefics: nativityProfile?.functional_malefics ?? [],
        profile: nativityProfile,
      };
      try {
        // eslint-disable-next-line no-console
        console.log(
          '[STEP-2] nativity result:',
          JSON.stringify(nativityData)?.slice(0, 300)
        );
      } catch {
        // ignore logging failures
      }
      const dasha = ephemerisData?.current_dasha ?? {};
      const mahadasha = dasha.mahadasha ?? 'Unknown';
      const antardasha = dasha.antardasha ?? 'Unknown';

      // ── STEP 4: Daily overviews ──
      setStepMessage('Writing daily forecasts...');
      setStepDetail('Generating ' + dayCount + ' day overview paragraphs');
      setCurrentStepIndex(3);
      try {
        console.log('[STEP-4] Starting...');
        const overviewRes = await fetch('/api/commentary/daily-overviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lagnaSign: ephemerisData.lagna,
            mahadasha,
            antardasha,
            days: forecastDays.map((d) => ({
              date: d.date,
              panchang: d.panchang,
              planet_positions: d.planet_positions,
              slots: d.slots.map((s: any) => ({
                display_label: s.display_label,
                score: s.score,
                dominant_choghadiya: s.dominant_choghadiya,
              })),
              day_score: d.day_score,
              rahu_kaal: d.rahu_kaal,
              peak_slots: d.slots.filter((s: any) => s.score >= 75).slice(0, 3).map((s: any) => ({
                display_label: s.display_label,
                dominant_hora: s.dominant_hora,
                dominant_choghadiya: s.dominant_choghadiya,
                score: s.score,
              })),
            })),
          }),
        });
        if (overviewRes.ok) {
          const overviewData = await overviewRes.json();
          const receivedDays = overviewData.days ?? [];
          console.log('[STEP-4] received days:', receivedDays.length);
          receivedDays.forEach((od: any) => {
            const day = forecastDays.find((d: any) => d.date === od.date);
            if (day) {
              day.day_theme = od.day_theme ?? '';
              day.day_overview = od.day_overview ?? '';
            }
          });
          const fallbackOverview = 'FALLBACK DAY — USE HOURLY TABLE. STRATEGY: Use peak hora windows from the hourly table. Avoid Rahu Kaal. Schedule high-stakes work in slots with score ≥ 75.';
          forecastDays.forEach((day: any) => {
            if (!day.day_overview || day.day_overview.length < 80 || !day.day_overview.includes('STRATEGY')) {
              day.day_overview = fallbackOverview;
              if (!day.day_theme) day.day_theme = 'Use hourly scores and peak windows.';
            }
          });
        } else {
          const fallbackOverview = 'FALLBACK DAY — USE HOURLY TABLE. STRATEGY: Use peak hora windows from the hourly table. Avoid Rahu Kaal. Schedule high-stakes work in slots with score ≥ 75.';
          forecastDays.forEach((day: any) => {
            day.day_overview = fallbackOverview;
            if (!day.day_theme) day.day_theme = 'Use hourly scores and peak windows.';
          });
        }
        console.log('[STEP-4] Complete');
      } catch (e) {
        console.error('[STEP-4] Failed:', e instanceof Error ? e.message : String(e));
        setCommentaryPartial(true);
        const fallbackOverview = 'FALLBACK DAY — USE HOURLY TABLE. STRATEGY: Use peak hora windows from the hourly table. Avoid Rahu Kaal. Schedule high-stakes work in slots with score ≥ 75.';
        forecastDays.forEach((day: any) => {
          day.day_overview = day.day_overview || fallbackOverview;
          if (!day.day_theme) day.day_theme = 'Use hourly scores and peak windows.';
        });
      }
      await sleep(4000);

      // ── STEP 5: Nativity text ──
      setStepMessage('Deepening natal analysis...');
      setStepDetail('Writing lagna and dasha interpretation');
      setCurrentStepIndex(4);
      try {
        console.log('[STEP-5] Starting...');
        const natTextRes = await fetch('/api/commentary/nativity-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lagnaSign: ephemerisData.lagna,
            lagnaDegreee: ephemerisData.lagna_degree,
            moonSign: ephemerisData.planets?.Moon?.sign,
            moonNakshatra: ephemerisData.planets?.Moon?.nakshatra ?? ephemerisData.moon_nakshatra,
            mahadasha,
            antardasha,
            md_end: dasha.end_date,
            ad_end: dasha.end_date,
            planets: ephemerisData.planets ?? {},
          }),
        });
        if (natTextRes.ok) {
          const natTextData = await natTextRes.json();
          if (natTextData.lagna_analysis) nativityData.lagna_analysis = natTextData.lagna_analysis;
          if (natTextData.dasha_interpretation) nativityData.current_dasha_interpretation = natTextData.dasha_interpretation;
        }
        console.log('[STEP-5] Complete');
      } catch (e) {
        console.error('[STEP-5] Failed:', e instanceof Error ? e.message : String(e));
      }
      await sleep(4000);

      // ── STEP 6: Hourly commentary (sequential) ──
      try {
        console.log('[STEP-6] Starting...');
        for (let i = 0; i < forecastDays.length; i++) {
          const day = forecastDays[i];
          setStepMessage('Writing hourly commentary...');
          setStepDetail(`Day ${i + 1} of ${forecastDays.length}: ${day.date} (18 slots)`);
          setCurrentStepIndex(5 + i);
          try {
            const hourlyRes = await fetch('/api/commentary/hourly-day', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lagnaSign: ephemerisData.lagna,
                mahadasha,
                antardasha,
                dayIndex: i,
                date: day.date,
                planet_positions: day.planet_positions,
                panchang: day.panchang,
                rahu_kaal: day.rahu_kaal,
                slots: day.slots.map((s: any) => ({
                  slot_index: s.slot_index,
                  display_label: s.display_label,
                  dominant_hora: s.dominant_hora,
                  dominant_choghadiya: s.dominant_choghadiya,
                  transit_lagna: s.transit_lagna,
                  transit_lagna_house: s.transit_lagna_house,
                  is_rahu_kaal: s.is_rahu_kaal,
                  score: s.score,
                })),
              }),
            });
            if (hourlyRes.ok) {
              const hourlyData = await hourlyRes.json();
              if (hourlyData.partial) {
                console.warn(`[HOURLY] Day ${i + 1} partial: only ${hourlyData.slots?.length ?? 0} of 18 slots`);
              }
              hourlyData.slots?.forEach((hs: any) => {
                const slot = day.slots.find((s: any) => s.slot_index === hs.slot_index);
                if (slot) {
                  slot.commentary = hs.commentary ?? '';
                  const firstSent = hs.commentary?.split('.')[0]?.trim();
                  slot.commentary_short = (hs.commentary_short && hs.commentary_short.trim()) ? hs.commentary_short : (firstSent ? firstSent + '.' : '');
                }
              });
              console.log(`[HOURLY] Day ${i + 1} done, slots with commentary: ${day.slots.filter((s: any) => s.commentary).length}`);
            }
          } catch (err) {
            console.error(`[HOURLY] Day ${i + 1} failed:`, err);
            day.slots.forEach((slot: any) => {
              if (!slot.commentary) {
                slot.commentary = `${slot.dominant_hora} hora, ${slot.dominant_choghadiya} choghadiya. Score: ${slot.score}/100.` + (slot.is_rahu_kaal ? ' ⚠ Rahu Kaal — avoid new initiations.' : '');
                slot.commentary_short = slot.commentary.split('.')[0] + '.';
              }
            });
          }
          if (i < forecastDays.length - 1) await sleep(4000);
        }
        console.log('[STEP-6] Complete');
      } catch (err) {
        console.error('[STEP-6] Failed, continuing:', err instanceof Error ? err.message : String(err));
      }

      // ── STEP 7: Monthly (2 calls) ──
      let allMonthsData: any[] = [];
      try {
        console.log('[STEP-7] Starting...');
        setStepMessage('Generating monthly forecast...');
        setStepDetail('Months 1-6 of 2026');
        setCurrentStepIndex(12);
        const startDate = new Date(forecastDays[0].date);
        const allMonths = Array.from({ length: 12 }, (_, i) => {
          const d = new Date(startDate);
          d.setMonth(d.getMonth() + i);
          return {
            month_label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
            month_index: i,
            key_transits_hint: '',
          };
        });

        let months1Data: any[] = [];
        let months2Data: any[] = [];
        try {
          const months1Res = await fetch('/api/commentary/months-first', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lagnaSign: ephemerisData.lagna,
              mahadasha,
              antardasha,
              startMonth: forecastDays[0].date.substring(0, 7),
              months: allMonths.slice(0, 6),
              reference_planet_positions: forecastDays[0]?.planet_positions,
              reference_planet_positions_date: forecastDays[0]?.date,
              reference_panchang: forecastDays[0]?.panchang,
              reference_rahu_kaal: forecastDays[0]?.rahu_kaal,
              reference_slots: forecastDays[0]?.slots?.map((s: any) => ({
                display_label: s.display_label,
                score: s.score,
                dominant_choghadiya: s.dominant_choghadiya,
              })),
            }),
          });
          if (months1Res.ok) months1Data = (await months1Res.json()).months ?? [];
        } catch (e) {
          console.warn('[STEP-7] Months 1-6 failed:', e);
        }
        await sleep(4000);
        setStepDetail('Months 7-12');
        setCurrentStepIndex(13);
        try {
          const months2Res = await fetch('/api/commentary/months-second', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lagnaSign: ephemerisData.lagna,
              mahadasha,
              antardasha,
              startMonth: forecastDays[0].date.substring(0, 7),
              months: allMonths.slice(6, 12),
              reference_planet_positions: forecastDays[0]?.planet_positions,
              reference_planet_positions_date: forecastDays[0]?.date,
              reference_panchang: forecastDays[0]?.panchang,
              reference_rahu_kaal: forecastDays[0]?.rahu_kaal,
              reference_slots: forecastDays[0]?.slots?.map((s: any) => ({
                display_label: s.display_label,
                score: s.score,
                dominant_choghadiya: s.dominant_choghadiya,
              })),
            }),
          });
          if (months2Res.ok) months2Data = (await months2Res.json()).months ?? [];
        } catch (e) {
          console.warn('[STEP-7] Months 7-12 failed:', e);
        }
        await sleep(4000);

        allMonthsData = [...months1Data, ...months2Data].map((m: any) => ({
          month: m.month_label ?? m.month ?? '',
          score: m.overall_score ?? m.score ?? 65,
          overall_score: m.overall_score ?? m.score ?? 65,
          career_score: m.career_score ?? 65,
          money_score: m.money_score ?? 65,
          health_score: m.health_score ?? 65,
          love_score: m.love_score ?? 65,
          theme: (m.theme ?? '').trim() || '',
          key_transits: m.key_transits ?? [],
          commentary: (m.analysis ?? m.commentary ?? '').trim() || '',
          weekly_scores: m.weekly_scores ?? [65, 65, 65, 65],
          domain_scores: {
            career: m.career_score ?? 65,
            money: m.money_score ?? 65,
            health: m.health_score ?? 65,
            relationships: m.love_score ?? 65,
          },
        }));
        while (allMonthsData.length < 12) {
          const m = new Date(startDate.getFullYear(), startDate.getMonth() + allMonthsData.length, 1);
          allMonthsData.push({
            month: m.toLocaleString('default', { month: 'long', year: 'numeric' }),
            score: 65,
            overall_score: 65,
            career_score: 65,
            money_score: 65,
            health_score: 65,
            love_score: 65,
            theme: '',
            key_transits: [],
            commentary: 'Monthly overview will be available when the forecast is generated.',
            weekly_scores: [65, 65, 65, 65],
            domain_scores: { career: 65, money: 65, health: 65, relationships: 65 },
          });
        }
        console.log('[STEP-7] Complete');
      } catch (e) {
        console.error('[STEP-7] Failed:', e instanceof Error ? e.message : String(e));
        const startDate = new Date(forecastDays?.[0]?.date ?? Date.now());
        allMonthsData = Array.from({ length: 12 }, (_, i) => {
          const m = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
          return {
            month: m.toLocaleString('default', { month: 'long', year: 'numeric' }),
            score: 65,
            overall_score: 65,
            career_score: 65,
            money_score: 65,
            health_score: 65,
            love_score: 65,
            theme: '',
            key_transits: [],
            commentary: 'Monthly overview will be available when the forecast is generated.',
            weekly_scores: [65, 65, 65, 65],
            domain_scores: { career: 65, money: 65, health: 65, relationships: 65 },
          };
        });
      }

      // ── STEP 8: Weeks + Synthesis ──
      console.log('[STEP-8] Starting weeks-synthesis');
      setCurrentStepIndex(14);
      setStepMessage('Writing period synthesis...');
      setStepDetail('6 weekly summaries + strategic windows');

      await sleep(4000);

      const reportStart = new Date(forecastDays[0].date);
      const weeksPayload = Array.from({ length: 6 }, (_, i) => {
        const wStart = new Date(reportStart);
        wStart.setDate(wStart.getDate() + i * 7);
        const wEnd = new Date(wStart);
        wEnd.setDate(wEnd.getDate() + 6);
        const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        const weekDays = forecastDays.slice(i * 7, (i + 1) * 7);
        return {
          week_index: i,
          week_label: `${fmt(wStart)} – ${fmt(wEnd)}`,
          start_date: wStart.toISOString().split('T')[0],
          end_date: wEnd.toISOString().split('T')[0],
          daily_scores: weekDays.map((d: any) => d.day_score ?? 55),
        };
      });

      const allScores = forecastDays.map((d: any) => d.day_score ?? 55);
      const bestDay = forecastDays.reduce((a: any, b: any) => (a.day_score ?? 0) > (b.day_score ?? 0) ? a : b);
      const worstDay = forecastDays.reduce((a: any, b: any) => (a.day_score ?? 100) < (b.day_score ?? 100) ? a : b);

      let weeksSynthData: any = { weeks: [], period_synthesis: null };
      try {
        console.log('[STEP-8] weeksPayload length:', weeksPayload?.length);
        const weeksSynthResponse = await fetch('/api/commentary/weeks-synthesis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lagnaSign: ephemerisData.lagna ?? 'Cancer',
            mahadasha: mahadasha ?? 'Rahu',
            antardasha: antardasha ?? 'Mercury',
            reportStartDate: forecastDays[0].date,
            weeks: weeksPayload,
            planet_positions_by_date: forecastDays.map((d: any) => ({
              date: d.date,
              planet_positions: d.planet_positions,
              panchang: d.panchang,
              rahu_kaal: d.rahu_kaal,
              slots: d.slots?.map((s: any) => ({
                display_label: s.display_label,
                score: s.score,
                dominant_choghadiya: s.dominant_choghadiya,
              })),
            })),
            synthesis_context: {
              total_days: forecastDays.length,
              best_date: bestDay.date,
              best_score: bestDay.day_score ?? 0,
              worst_date: worstDay.date,
              worst_score: worstDay.day_score ?? 0,
              avg_score: Math.round(allScores.reduce((a: number, b: number) => a + b, 0) / (allScores.length || 1)),
            },
          }),
        });
        if (weeksSynthResponse.ok) {
          weeksSynthData = await weeksSynthResponse.json();
          console.log('[STEP-8] weeks:', weeksSynthData?.weeks?.length);
          console.log('[STEP-8] synthesis:', !!weeksSynthData?.period_synthesis);
        } else {
          const errText = await weeksSynthResponse.text();
          console.error('[STEP-8] HTTP error:', weeksSynthResponse.status, errText.substring(0, 200));
        }
      } catch (err: unknown) {
        console.error('[STEP-8] Failed:', err instanceof Error ? err.message : String(err));
      }

      const weekList = (weeksSynthData.weeks ?? []).map((w: any, i: number) => ({
        week_label: w.week_label ?? `Week ${i + 1}`,
        week_start: weeksPayload[i]?.start_date ?? '',
        score: w.overall_score ?? w.score ?? 65,
        theme: (w.theme ?? '').trim() || '',
        commentary: (w.analysis ?? w.commentary ?? '').trim() || 'Weekly overview.',
        daily_scores: weeksPayload[i]?.daily_scores ?? [65, 65, 65, 65, 65, 65, 65],
        moon_journey: w.moon_signs ?? [],
        peak_days_count: 2,
        caution_days_count: 1,
      }));
      while (weekList.length < 6) {
        weekList.push({
          week_label: `Week ${weekList.length + 1}`,
          week_start: '',
          score: 65,
          theme: '',
          commentary: 'Weekly overview will be available when the forecast is generated.',
          daily_scores: [65, 65, 65, 65, 65, 65, 65],
          moon_journey: [],
          peak_days_count: 2,
          caution_days_count: 1,
        });
      }

      // ── STEP 9: Assemble final report ──
      console.log('[STEP-9] months:', allMonthsData?.length);
      console.log('[STEP-9] weeks:', weeksSynthData?.weeks?.length);
      console.log('[STEP-9] days:', forecastDays?.length);
      console.log('[STEP-9] synthesis:', !!weeksSynthData?.period_synthesis);
      setStepMessage('Finalising your report...');
      setStepDetail('Assembling all sections');
      setCurrentStepIndex(15);

      const PLANET_SYMBOLS: Record<string, string> = {
        Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿', Jupiter: '♃', Venus: '♀', Saturn: '♄',
      };
      const toLabel = (score: number, isRk: boolean): 'Peak' | 'Excellent' | 'Good' | 'Neutral' | 'Caution' | 'Difficult' | 'Avoid' => {
        if (isRk) return 'Avoid';
        if (score >= 85) return 'Peak';
        if (score >= 75) return 'Excellent';
        if (score >= 65) return 'Good';
        if (score >= 55) return 'Neutral';
        if (score >= 45) return 'Caution';
        if (score >= 35) return 'Difficult';
        return 'Avoid';
      };

      const daysForReport = forecastDays.map((d: any) => ({
        date: d.date,
        day_label: formatDayLabel(d.date),
        day_score: d.day_score,
        day_label_tier: toLabel(d.day_score, false) as import('@/lib/agents/types').RatingLabel,
        day_theme: (d.day_theme ?? '').trim() || `Day score ${d.day_score}.`,
        overview: (d.day_overview ?? '').trim() || `Day score ${d.day_score}. Use hora and choghadiya to time activities.`,
        panchang: d.panchang ?? {},
        rahu_kaal: d.rahu_kaal?.start ? { start: d.rahu_kaal.start.slice(0, 5), end: d.rahu_kaal.end.slice(0, 5) } : null,
        slots: (d.slots ?? []).map((s: any) => ({
          ...s,
          hora_planet: s.dominant_hora ?? s.hora_planet ?? 'Moon',
          hora_planet_symbol: PLANET_SYMBOLS[s.dominant_hora ?? s.hora_planet] ?? '☽',
          choghadiya: s.dominant_choghadiya ?? s.choghadiya ?? 'Chal',
          choghadiya_quality: s.choghadiya_quality ?? 'Neutral',
          commentary: (s.commentary ?? '').trim() || `${s.dominant_hora} hora. Score ${s.score}.`,
          commentary_short: (s.commentary_short ?? '').trim() || (s.commentary ?? '').split('.')[0] + '.' || '—',
          score: s.score ?? 50,
          label: toLabel(s.score ?? 50, s.is_rahu_kaal ?? false),
        })),
        peak_count: (d.slots ?? []).filter((s: any) => (s.score ?? 50) >= 75 && !(s.is_rahu_kaal ?? false)).length,
        caution_count: (d.slots ?? []).filter((s: any) => (s.score ?? 50) < 45 || (s.is_rahu_kaal ?? false)).length,
      }));

      const finalReport = {
        report_id: 'gen-' + Date.now(),
        report_type: type || '7day',
        generated_at: new Date().toISOString().slice(0, 10),
        nativity: nativityData,
        months: allMonthsData,
        weeks: weekList,
        days: daysForReport,
        synthesis: weeksSynthData.period_synthesis ?? {
          opening_paragraph: 'This forecast period combines transits, dasha activations, and hora patterns. Use high-score windows for important work and avoid Rahu Kaal for new beginnings.',
          strategic_windows: [],
          caution_dates: [],
          domain_priorities: { career: 'Focus on career themes.', money: 'Money themes.', health: 'Health.', relationships: 'Relationships.' },
          closing_paragraph: 'Use hora and choghadiya to align actions with cosmic rhythms.',
        },
      };

      const errors = validateReportData(finalReport);
      if (errors.length > 0) console.warn('[VALIDATION] Issues:', errors);

      setReportData(finalReport);
      void saveReportToDatabase(finalReport as unknown as Record<string, unknown>);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Report generation error:', err);
      setError(err?.message || 'Failed to generate report');
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center gap-8 px-6">
        <StarField />
        <div className="text-amber text-4xl">🪐</div>
        <h1 className="text-star text-2xl font-bold">Jyotish AI</h1>
        <div className="text-center">
          <p className="text-star text-xl font-semibold">{stepMessage || 'Preparing...'}</p>
          <p className="text-dust text-sm mt-2">{stepDetail || ''}</p>
        </div>
        <div className="w-full max-w-md space-y-2">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                currentStepIndex > i ? 'opacity-50' : ''
              } ${currentStepIndex === i ? 'bg-amber/10 border border-amber/20' : ''}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  currentStepIndex > i ? 'bg-emerald text-dark' : currentStepIndex === i ? 'bg-amber text-dark animate-pulse' : 'bg-nebula text-dust'
                }`}
              >
                {currentStepIndex > i ? '✓' : i + 1}
              </div>
              <span className={`text-sm ${currentStepIndex === i ? 'text-star font-medium' : 'text-dust'}`}>
                {step}
              </span>
            </div>
          ))}
        </div>
        <p className="text-dust text-xs">
          Generating grandmaster-quality analysis... This takes 8-12 minutes. Keep this tab open.
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
            onClick={() => {
              hasFetched.current = false;
              void generateReport();
            }}
            className="px-8 py-3 bg-amber text-space font-body font-medium rounded-sm hover:bg-amber-glow transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!reportData) return null;

  const natalChart = reportData.nativity?.natal_chart ?? reportData.natalChart;
  const safeMonthly = Array.isArray(reportData.months) ? reportData.months : [];
  const safeWeekly = Array.isArray(reportData.weeks) ? reportData.weeks : [];
  const reportDays: any[] = reportData.days ?? [];

  const mergedDays = reportDays.map((day: any) => {
    const slots = day.slots ?? [];
    const peakFromGrid = slots
      .filter((s: any) => (s.score ?? 0) >= 75 && !(s.is_rahu_kaal ?? false))
      .slice(0, 3)
      .map((s: any) => ({
        time: s.display_label ?? '',
        hora: s.hora_planet ?? s.dominant_hora ?? '',
        choghadiya: s.choghadiya ?? s.dominant_choghadiya ?? '',
        score: s.score ?? 0,
        reason: '',
      }));
    const rk = day.rahu_kaal;
    const rahuKaalFormatted = rk && (rk.start || rk.end) ? { start: (rk.start ?? '').slice(0, 5), end: (rk.end ?? '').slice(0, 5) } : null;
    return {
      date: day.date ?? '',
      day_score: day.day_score ?? 50,
      day_theme: day.day_theme ?? '',
      day_rating_label: (day.day_score ?? 50) >= 70 ? 'EXCELLENT' : (day.day_score ?? 50) >= 50 ? 'GOOD' : 'CHALLENGING',
      panchang: day.panchang ?? {},
      day_overview: day.overview ?? day.day_overview ?? 'Overview is being generated.',
      rahu_kaal: rahuKaalFormatted,
      best_windows: peakFromGrid,
      avoid_windows: [],
      peak_count: day.peak_count ?? peakFromGrid.length,
      caution_count: day.caution_count ?? 0,
      hours: null,
      hourlySlots: slots.map((s: any) => ({
        slot_index: s.slot_index,
        display_label: s.display_label,
        time: s.start_iso?.slice(11, 19) ?? '',
        end_time: s.end_iso?.slice(11, 19) ?? '',
        score: s.score ?? 50,
        hora_planet: s.hora_planet ?? s.dominant_hora ?? '',
        hora_planet_symbol: s.hora_planet_symbol ?? '',
        choghadiya: s.choghadiya ?? s.dominant_choghadiya ?? '',
        choghadiya_quality: s.choghadiya_quality ?? '',
        is_rahu_kaal: s.is_rahu_kaal ?? false,
        transit_lagna: s.transit_lagna ?? '',
        transit_lagna_house: s.transit_lagna_house ?? undefined,
        commentary: s.commentary ?? '',
      })),
    };
  });

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
        {/* Commentary partial banner */}
        {commentaryPartial && (
          <div className="mb-6 px-4 py-3 border border-amber/30 bg-amber/5 rounded-sm flex items-center gap-3">
            <span className="text-amber text-sm">⚠</span>
            <p className="font-mono text-xs text-dust">
              Some AI commentary is still loading — refresh to update.
            </p>
          </div>
        )}

        {/* Report actions: dashboard + Copy Share Link + Print/PDF */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="pdf-exclude" data-print-hide>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="font-mono text-xs text-dust hover:text-amber transition-colors flex items-center gap-1.5"
              >
                ← My Reports
              </Link>
            ) : (
              <Link
                href="/login"
                className="font-mono text-xs text-dust hover:text-amber transition-colors flex items-center gap-1.5"
              >
                Sign In to Save →
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-4">
          <button
            onClick={copyShareLink}
            className="pdf-exclude font-mono text-xs text-dust hover:text-amber transition-colors flex items-center gap-2"
          >
            {copyLinkFeedback ? (
              <span className="text-emerald">Link copied!</span>
            ) : (
              <>
                <span>Copy Share Link</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </>
            )}
          </button>
          <div className="flex flex-col items-end pdf-exclude" data-print-hide>
          <button
            id="pdf-download-btn"
            onClick={() => void handleDownloadPDF()}
            disabled={pdfLoading}
            className="pdf-exclude font-mono text-xs text-dust hover:text-amber transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {pdfLoading ? (
              <>
                <span>{pdfStatus}</span>
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </>
            ) : (
              <>
                <span>{pdfStatus}</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </>
            )}
          </button>
          <p className="font-mono text-[10px] text-dust/40 mt-1 pdf-exclude">
            Select &quot;Save as PDF&quot; in print dialog
          </p>
          </div>
          </div>
        </div>
        {copyLinkError && (
          <div className="mb-4 px-4 py-3 border border-crimson/50 bg-crimson/10 rounded-sm flex items-center gap-3">
            <span className="text-crimson text-sm">⚠</span>
            <p className="font-mono text-xs text-crimson">{copyLinkError}</p>
          </div>
        )}
        {pdfError && (
          <div className="mb-4 px-4 py-3 border border-crimson/50 bg-crimson/10 rounded-sm flex items-center gap-3">
            <span className="text-crimson text-sm">⚠</span>
            <p className="font-mono text-xs text-crimson">{pdfError}</p>
          </div>
        )}
        <div id="report-content">
          <ReportErrorBoundary fallbackTitle="Nativity">
            <NativityCard
              name={displayName}
              birthDate={displayDate}
              birthTime={displayTime}
              birthCity={displayCity}
              lagna={natalChart?.lagna || 'Unknown'}
              lagnaDegree={natalChart?.lagna_degree ?? 0}
              moonSign={natalChart?.planets?.Moon?.sign || 'Unknown'}
              moonNakshatra={natalChart?.moon_nakshatra || 'Unknown'}
              currentDasha={
                natalChart?.current_dasha ??
                reportData?.nativity?.natal_chart?.current_dasha ?? {
                  mahadasha: 'Unknown',
                  antardasha: 'Unknown',
                }
              }
              nativitySummary={
                reportData?.nativity
                  ? {
                      lagna_analysis: reportData.nativity.lagna_analysis ?? '',
                      current_dasha_interpretation:
                        reportData.nativity.current_dasha_interpretation ?? '',
                      key_yogas: reportData.nativity.key_yogas ?? [],
                      functional_benefics:
                        reportData.nativity.functional_benefics ?? [],
                      functional_malefics:
                        reportData.nativity.functional_malefics ?? [],
                    }
                  : undefined
              }
              nativity={
                reportData?.nativity?.profile ??
                reportData?.nativity ?? {
                  planetary_positions: [],
                  life_themes: [],
                  current_year_theme: '',
                }
              }
            />
          </ReportErrorBoundary>

          <ReportErrorBoundary fallbackTitle="Monthly Analysis">
            <MonthlyAnalysis months={safeMonthly} />
          </ReportErrorBoundary>

          <ReportErrorBoundary fallbackTitle="Weekly Analysis">
            <WeeklyAnalysis weeks={safeWeekly} />
          </ReportErrorBoundary>

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

          <ReportErrorBoundary fallbackTitle="Period Synthesis">
            <PeriodSynthesis
              synthesis={reportData?.synthesis ?? ''}
              dailyScores={mergedDays.map((d: any) => ({ date: d?.date ?? '', score: d?.day_score ?? 50 }))}
              onDayClick={handleDaySelectFromCalendar}
            />
          </ReportErrorBoundary>
        </div>
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
