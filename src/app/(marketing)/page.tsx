import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import HourlyPreview from '@/components/landing/HourlyPreview';
import Pricing from '@/components/landing/Pricing';
import FAQ from '@/components/landing/FAQ';
import FinalCTA from '@/components/landing/FinalCTA';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-space">
      <Hero />
      <HowItWorks />
      <HourlyPreview />
      <Pricing />
      <FAQ />
      <FinalCTA />
    </div>
  );
}
