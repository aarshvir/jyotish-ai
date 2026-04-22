import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import { SynastryResultDisplay } from './SynastryResultDisplay';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export default async function SynastryResultPage({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-space text-star p-8 flex items-center justify-center">
        <Link href="/login" className="btn-amber">Sign in to view compatibility</Link>
      </div>
    );
  }

  const { data: row } = await supabase
    .from('synastry_charts')
    .select('ashtakoot, commentary, partner_a, partner_b, created_at')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!row) notFound();

  const ak = row.ashtakoot as {
    total?: number;
    max?: number;
    breakdown?: Array<{ name: string; score: number; max: number; note: string }>;
  };

  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-5 py-24 relative z-10 w-full">
        <SynastryResultDisplay
          score={ak.total ?? 0}
          breakdown={ak.breakdown ?? []}
          commentary={String(row.commentary ?? '')}
          partnerA={row.partner_a as { name: string; moon_nakshatra?: string }}
          partnerB={row.partner_b as { name: string; moon_nakshatra?: string }}
          createdAt={String(row.created_at ?? '')}
        />
      </main>
      <Footer />
    </div>
  );
}
