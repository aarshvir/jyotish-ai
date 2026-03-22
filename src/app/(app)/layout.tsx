import Navbar from '@/components/shared/Navbar';
import { ensureConsentRecorded } from '@/lib/auth/ensureConsent';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureConsentRecorded();

  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
    </>
  );
}
