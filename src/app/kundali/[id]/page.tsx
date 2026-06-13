import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import { KundaliResultDisplay } from './KundaliResultDisplay';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export default async function KundaliResultPage({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-space text-star p-8 flex items-center justify-center">
        <Link href="/login" className="btn-amber">Sign in to view your Kundali</Link>
      </div>
    );
  }

  const { data: row } = await supabase
    .from('kundali_charts')
    .select('person, chart, lagna_analysis, dasha_interpretation, created_at')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!row) notFound();

  const chart = row.chart as {
    lagna?: string;
    moon_sign?: string;
    moon_nakshatra?: string;
    current_dasha?: { mahadasha?: string; antardasha?: string } | null;
    dasha_sequence?: Array<{ planet: string; start_date: string; end_date: string }>;
  };
  const person = row.person as { name?: string };

  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-5 py-20 sm:py-24 relative z-10 w-full">
        <KundaliResultDisplay
          name={person?.name ?? 'You'}
          lagna={chart?.lagna ?? 'Unknown'}
          moonSign={chart?.moon_sign ?? 'Unknown'}
          moonNakshatra={chart?.moon_nakshatra ?? ''}
          mahadasha={chart?.current_dasha?.mahadasha ?? 'Unknown'}
          antardasha={chart?.current_dasha?.antardasha ?? 'Unknown'}
          dashaSequence={chart?.dasha_sequence ?? []}
          lagnaAnalysis={String(row.lagna_analysis ?? '')}
          dashaInterpretation={String(row.dasha_interpretation ?? '')}
          createdAt={String(row.created_at ?? '')}
        />
      </main>
      <Footer />
    </div>
  );
}
