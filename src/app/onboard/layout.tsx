import { ensureConsentRecorded } from '@/lib/auth/ensureConsent';

export default async function OnboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureConsentRecorded();
  return <>{children}</>;
}
