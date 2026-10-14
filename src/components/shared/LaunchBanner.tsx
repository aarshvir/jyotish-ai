import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export default function LaunchBanner() {
  return (
    <div className="public-banner">
      <div className="public-container flex items-center justify-center gap-2">
        <span>Explore the free chart.</span>
        <Link href="/sample-report">Read an example <ArrowUpRight size={14} aria-hidden="true" /></Link>
      </div>
    </div>
  );
}
