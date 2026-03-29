'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Report {
  id: string;
  native_name: string;
  birth_date: string;
  birth_city: string;
  plan_type: string;
  status: string;
  created_at: string;
  day_scores: Record<string, number> | null;
  lagna_sign: string | null;
  dasha_mahadasha: string | null;
  dasha_antardasha: string | null;
}

interface UserProfile {
  display_name: string | null;
  email: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      let prof: UserProfile | null = null;
      const { data: profData } = await supabase
        .from('user_profiles')
        .select('display_name, email')
        .eq('id', user.id)
        .maybeSingle();
      if (profData) {
        prof = profData;
      } else {
        prof = { display_name: null, email: user.email ?? null };
      }
      setProfile(prof);

      const { data: reps } = await supabase
        .from('reports')
        .select(
          'id, native_name, birth_date, birth_city, plan_type, status, created_at, day_scores, lagna_sign, dasha_mahadasha, dasha_antardasha'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setReports((reps as Report[]) || []);
      setLoading(false);
    }
    void load();
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  function getAvgScore(dayScores: Record<string, number> | null) {
    if (!dayScores) return null;
    const vals = Object.values(dayScores);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  function getScoreColor(score: number | null) {
    if (!score) return '#6b6350';
    if (score >= 70) return '#6baa6b';
    if (score >= 50) return '#d4af37';
    return '#e06b6b';
  }

  function getPlanLabel(plan: string) {
    return plan === '7day'
      ? '7-Day'
      : plan === 'monthly'
        ? 'Monthly'
        : plan === 'annual'
          ? 'Annual'
          : plan === 'preview'
            ? 'Preview'
            : plan;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function isToday(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }

  function getReportUrl(report: Report) {
    return `/report/${report.id}`;
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: '#d4af37', fontFamily: 'system-ui' }}>Loading your reports...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #0d0d2b 50%, #0a0a1a 100%)',
        color: '#e8e0d0',
        fontFamily: 'system-ui',
      }}
    >
      <header
        style={{
          padding: '20px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(212,175,55,0.15)',
        }}
      >
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: '20px', fontWeight: '700', color: '#d4af37', fontFamily: 'Georgia, serif' }}>
            VedicHour
          </span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '13px', color: '#6b6350' }}>
            {profile?.display_name || profile?.email}
          </span>
          <Link
            href="/onboard"
            style={{
              padding: '8px 20px',
              background: 'linear-gradient(135deg, #d4af37, #b8962e)',
              color: '#0a0a1a',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '600',
            }}
          >
            New Report
          </Link>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              color: '#6b6350',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ marginBottom: '40px' }}>
          <p
            style={{
              fontSize: '12px',
              letterSpacing: '0.2em',
              color: '#d4af37',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            Your Oracle
          </p>
          <h1 style={{ fontSize: '32px', fontWeight: '400', fontFamily: 'Georgia, serif', marginBottom: '8px' }}>
            Report History
          </h1>
          <p style={{ fontSize: '14px', color: '#6b6350' }}>
            {reports.length === 0
              ? 'No reports yet — generate your first forecast'
              : `${reports.length} report${reports.length !== 1 ? 's' : ''} generated`}
          </p>
        </div>

        {reports.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 24px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.4 }}>✦</div>
            <p style={{ color: '#a09880', marginBottom: '24px', fontSize: '16px' }}>Your cosmic timeline is empty</p>
            <Link
              href="/onboard"
              style={{
                display: 'inline-block',
                padding: '12px 32px',
                background: 'linear-gradient(135deg, #d4af37, #b8962e)',
                color: '#0a0a1a',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '15px',
                fontWeight: '600',
              }}
            >
              Generate Your First Report →
            </Link>
          </div>
        )}

        {reports.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reports.map((report) => {
              const avgScore = getAvgScore(report.day_scores);
              const scoreColor = getScoreColor(avgScore);
              const isComplete = report.status === 'complete';

              return (
                <div
                  key={report.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '12px',
                      flexShrink: 0,
                      background: `${scoreColor}15`,
                      border: `1px solid ${scoreColor}40`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {avgScore != null ? (
                      <>
                        <span style={{ fontSize: '22px', fontWeight: '700', color: scoreColor, lineHeight: 1 }}>
                          {avgScore}
                        </span>
                        <span style={{ fontSize: '10px', color: `${scoreColor}80`, marginTop: '2px' }}>avg</span>
                      </>
                    ) : (
                      <span style={{ fontSize: '20px', opacity: 0.3 }}>
                        {report.status === 'generating' ? '...' : '?'}
                      </span>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '4px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontSize: '16px', fontWeight: '600', color: '#e8e0d0' }}>
                        {report.native_name}
                      </span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: 'rgba(212,175,55,0.1)',
                          color: '#d4af37',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {getPlanLabel(report.plan_type)}
                      </span>
                      {report.status === 'generating' && (
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            background: 'rgba(100,100,200,0.1)',
                            color: '#8888cc',
                          }}
                        >
                          Generating...
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b6350', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span>{report.birth_city || 'Unknown location'}</span>
                      {report.lagna_sign && <span>{report.lagna_sign} Lagna</span>}
                      {report.dasha_mahadasha && (
                        <span>
                          {report.dasha_mahadasha}
                          {report.dasha_antardasha ? `/${report.dasha_antardasha}` : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#4a4435', marginTop: '4px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <span>
                        {isToday(report.created_at) ? (
                          <span style={{ color: '#6baa6b', fontWeight: '600' }}>Today · </span>
                        ) : null}
                        Generated {formatDate(report.created_at)}
                      </span>
                      {report.birth_date && (
                        <span>· Born {formatDate(report.birth_date)}</span>
                      )}
                    </div>
                  </div>

                  {report.day_scores && Object.keys(report.day_scores).length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '32px' }}>
                      {Object.entries(report.day_scores)
                        .slice(0, 7)
                        .map(([date, score]) => (
                          <div
                            key={date}
                            title={`${date}: ${score}`}
                            style={{
                              width: '8px',
                              height: `${(score / 100) * 32}px`,
                              borderRadius: '2px',
                              background: score >= 70 ? '#6baa6b' : score >= 50 ? '#d4af37' : '#e06b6b',
                              opacity: 0.8,
                            }}
                          />
                        ))}
                    </div>
                  )}

                  {isComplete && (
                    <Link
                      href={getReportUrl(report)}
                      style={{
                        padding: '10px 20px',
                        background: 'rgba(212,175,55,0.1)',
                        border: '1px solid rgba(212,175,55,0.3)',
                        borderRadius: '8px',
                        color: '#d4af37',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: '600',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      View Report →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
