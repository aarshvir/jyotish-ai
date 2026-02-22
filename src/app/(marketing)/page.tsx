import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import HourlyPreview from '@/components/landing/HourlyPreview';
import Pricing from '@/components/landing/Pricing';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-space">
      <Hero />
      <HowItWorks />
      <HourlyPreview />
      <Pricing />
    </div>
  );
}
