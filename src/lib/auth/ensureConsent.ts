import { createClient } from '@/lib/supabase/server';
import { TERMS_VERSION } from '@/lib/legal/termsVersion';
import { redirect } from 'next/navigation';

/** Use in server layouts for routes that require a recorded terms consent row. */
export async function ensureConsentRecorded() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
    return;
  }

  const { data: consent } = await supabase
    .from('user_consent')
    .select('id')
    .eq('user_id', user.id)
    .eq('terms_version', TERMS_VERSION)
    .maybeSingle();

  if (!consent) {
    redirect('/auth/consent');
  }
}
