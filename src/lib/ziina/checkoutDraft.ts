import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Birth/location fields written onto the checkout draft. Finalize reads these
 * when the payment completes and generates the paid report from them — so a
 * retry that reuses the same report id MUST overwrite an unpaid draft, not
 * leave the first attempt's chart in place.
 */
export type CheckoutDraftInput = {
  reportId: string;
  userId: string;
  userEmail: string;
  nativeName: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
  birthLat: number | null;
  birthLng: number | null;
  currentCity: string | null;
  currentLat: number | null;
  currentLng: number | null;
  timezoneOffset: number | null;
  planType: string;
  reportStartDate: string | null;
  phone?: string | null;
  personalContext?: string | null;
};

export function checkoutDraftInsertRow(input: CheckoutDraftInput): Record<string, unknown> {
  return {
    id: input.reportId,
    user_id: input.userId,
    user_email: input.userEmail,
    native_name: input.nativeName,
    birth_date: input.birthDate,
    birth_time: input.birthTime,
    birth_city: input.birthCity,
    birth_lat: input.birthLat,
    birth_lng: input.birthLng,
    current_city: input.currentCity,
    current_lat: input.currentLat,
    current_lng: input.currentLng,
    timezone_offset: input.timezoneOffset,
    plan_type: input.planType,
    report_start_date: input.reportStartDate,
    status: 'pending',
    payment_status: 'unpaid',
  };
}

/** Columns that must follow the latest checkout body on an unpaid reuse. */
export function checkoutDraftUnpaidPatch(input: CheckoutDraftInput): Record<string, unknown> {
  const row = checkoutDraftInsertRow(input);
  delete row.id;
  delete row.user_id;
  delete row.payment_status;
  return row;
}

export type PersistCheckoutDraftResult = { ok: true } | { ok: false; error: string };

/**
 * Insert the draft if this report id is new; if it already exists and is still
 * unpaid, overwrite birth/location fields with this request.
 *
 * The insert uses ignoreDuplicates so a race with finalize cannot reset a row
 * that just became paid. The follow-up UPDATE is restricted to payment_status
 * unpaid for the same reason.
 */
export async function persistUnpaidCheckoutDraft(
  db: SupabaseClient,
  input: CheckoutDraftInput,
): Promise<PersistCheckoutDraftResult> {
  const { error: draftErr } = await db.from('reports').upsert(checkoutDraftInsertRow(input), {
    onConflict: 'id',
    ignoreDuplicates: true,
  });
  if (draftErr) return { ok: false, error: draftErr.message };

  const { error: patchErr } = await db
    .from('reports')
    .update(checkoutDraftUnpaidPatch(input))
    .eq('id', input.reportId)
    .eq('user_id', input.userId)
    .eq('payment_status', 'unpaid');
  if (patchErr) return { ok: false, error: patchErr.message };

  if (typeof input.phone === 'string' && input.phone.trim()) {
    const { error: phoneErr } = await db
      .from('reports')
      .update({ phone: input.phone.trim() })
      .eq('id', input.reportId)
      .eq('user_id', input.userId)
      .eq('payment_status', 'unpaid');
    if (phoneErr) {
      const m = phoneErr.message ?? '';
      if (!m.includes('phone') && !m.includes('schema cache')) {
        console.warn('[ziina/checkoutDraft] phone update failed:', m);
      }
    }
  }

  if (typeof input.personalContext === 'string') {
    const personal_context = input.personalContext.trim().slice(0, 1200);
    const { error: pcErr } = await db
      .from('reports')
      .update({ personal_context: personal_context || null })
      .eq('id', input.reportId)
      .eq('user_id', input.userId)
      .eq('payment_status', 'unpaid');
    if (pcErr) {
      const m = pcErr.message ?? '';
      if (!m.includes('personal_context') && !m.includes('schema cache')) {
        console.warn('[ziina/checkoutDraft] personal_context update failed:', m);
      }
    }
  }

  return { ok: true };
}
