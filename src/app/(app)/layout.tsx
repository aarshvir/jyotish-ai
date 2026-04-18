import Navbar from '@/components/shared/Navbar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen">{children}</main>
    </>
  );
}
