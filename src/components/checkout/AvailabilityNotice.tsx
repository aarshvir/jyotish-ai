import Link from 'next/link';
import { ArrowRight, BookOpen, CircleCheck, FolderOpen } from 'lucide-react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { COMMERCIAL_UNAVAILABLE_MESSAGE } from '@/lib/commercial/availability';

export function AvailabilityNotice() {
  return (
    <div className="min-h-screen bg-space text-star flex flex-col">
      <Navbar />
      <main id="main-content" className="w-full max-w-3xl mx-auto flex-1 px-5 py-24 sm:py-32">
        <p className="section-eyebrow mb-3">VedicHour</p>
        <h1 className="font-display text-display-md mb-5">Start with your free birth chart</h1>
        <p className="font-body text-body-lg text-dust max-w-xl mb-8">{COMMERCIAL_UNAVAILABLE_MESSAGE}</p>
        <div className="flex flex-wrap gap-3 mb-10">
          <Link href="/free-kundli" className="btn-primary min-h-[48px] inline-flex items-center gap-2">
            Get my free chart <ArrowRight size={18} aria-hidden />
          </Link>
          <Link href="/sample-report" className="btn-secondary min-h-[48px] inline-flex items-center gap-2">
            <BookOpen size={18} aria-hidden /> Read an example
          </Link>
        </div>
        <div className="border-t border-horizon pt-7 space-y-5 text-body-md">
          <p className="flex gap-3"><CircleCheck className="shrink-0 text-success" size={20} aria-hidden />
            Your chart facts need a birth date, time and city. No account or card is required.</p>
          <p className="flex gap-3"><FolderOpen className="shrink-0 text-success" size={20} aria-hidden />
            <span>Already have a report? <Link href="/dashboard" className="underline underline-offset-4">Open your account</Link>. Existing access is preserved.</span></p>
          <p className="text-dust">Have an uncertain birth time? <Link href="/help/birth-time" className="underline underline-offset-4">See what can be calculated</Link>.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
