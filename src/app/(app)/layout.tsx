import Navbar from '@/components/shared/Navbar';
import MotionProvider from '@/components/shared/MotionProvider';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MotionProvider>
      <Navbar />
      <main id="main-content" className="min-h-screen">{children}</main>
    </MotionProvider>
  );
}
