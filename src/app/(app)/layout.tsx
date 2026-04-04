import Navbar from '@/components/shared/Navbar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[var(--nav-height)]">{children}</main>
    </>
  );
}
