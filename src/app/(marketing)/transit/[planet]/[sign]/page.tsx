import { StarField } from '@/components/ui/StarField';
import Link from 'next/link';

// In Next.js 14, this allows statically generating dynamic routes.
export async function generateStaticParams() {
  // Slow-moving outer planets generate the most search volume for transits
  const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  
  const params = [];
  for (const planet of ['mars', 'jupiter', 'saturn']) { // limiting for skeleton
    for (const sign of signs) {
      params.push({ planet, sign });
    }
  }
  return params;
}

export default function TransitSEOPage({ params }: { params: { planet: string, sign: string } }) {
  const { planet, sign } = params;
  
  const pName = planet.charAt(0).toUpperCase() + planet.slice(1);
  const sName = sign.charAt(0).toUpperCase() + sign.slice(1);
  const title = `What ${pName} Transit in ${sName} Means for Your Birth Chart`;

  return (
    <div className="min-h-[100svh] bg-space flex flex-col items-center py-24 px-6 relative overflow-hidden">
      <StarField />
      
      <div className="max-w-3xl w-full relative z-10 text-center">
        <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-pill border border-amber/20 bg-amber/[0.04]">
           <span className="font-mono text-mono-sm text-amber tracking-[0.15em] uppercase">Vedic Astrology Transit Report</span>
        </div>
        
        <h1 className="text-display-lg font-display text-star mb-6">{title}</h1>
        
        <p className="font-body text-body-lg text-dust/80 leading-relaxed mb-10 max-w-2xl mx-auto">
          The transit of {pName} through the sign of {sName} creates a powerful cosmic shift. 
          If you have your Ascendant (Lagna) or Moon in specific houses, this transit will dramatically alter your career, relationships, and health.
        </p>
        
        <div className="card bg-cosmos/80 border-horizon mb-12 p-8 text-left">
          <h2 className="text-headline-md text-star mb-4 border-b border-horizon/30 pb-4">Is {pName} in {sName} favorable for you?</h2>
          <p className="text-dust text-sm mb-6 leading-relaxed">
            Generic horoscopes summarize transits for millions of people based on Sun signs. Vedic astrology (Jyotish) mathematically tracks all 9 planets specifically for your exact birth time and geospatial coordinates down to the minute.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mt-8">
            <Link href={`/onboard?transit=${planet}_${sign}`} className="btn-primary w-full sm:w-auto px-8 py-3">
              Generate 100% Accurate Chart
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
