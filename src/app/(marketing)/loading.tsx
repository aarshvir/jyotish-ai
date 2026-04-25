import { MandalaRing } from '@/components/ui/MandalaRing';

export default function Loading() {
  return (
    <div
      className="flex items-center justify-center min-h-screen bg-gradient-to-br from-space via-cosmos to-space"
    >
      <div className="w-16 h-16 text-amber animate-spin-slow opacity-60">
        <MandalaRing className="w-full h-full" />
      </div>
    </div>
  );
}
