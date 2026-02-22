import { MandalaRing } from '@/components/ui/MandalaRing';

export default function Loading() {
  return (
    <div className="min-h-screen bg-space flex items-center justify-center">
      <div className="w-16 h-16 text-amber animate-spin-slow">
        <MandalaRing className="w-full h-full" />
      </div>
    </div>
  );
}
