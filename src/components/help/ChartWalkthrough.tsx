'use client';

import { useEffect, useState } from 'react';

export function ChartWalkthrough() {
  const [variant, setVariant] = useState<'desktop' | 'mobile' | null>(null);
  useEffect(() => {
    const phone = window.matchMedia('(max-width: 639px)');
    const select = () => setVariant(phone.matches ? 'mobile' : 'desktop');
    select();
    phone.addEventListener('change', select);
    return () => phone.removeEventListener('change', select);
  }, []);

  return (
    <section aria-labelledby="chart-walkthrough-heading" className="mt-8 border-y border-horizon py-6">
      <h2 id="chart-walkthrough-heading" className="text-xl font-semibold text-star mb-3">Watch a free chart calculation</h2>
      <p className="text-body-md text-dust mb-4">An actual screen recording using fictional birth details. English captions are included. No account, email or card is entered.</p>
      <div className={variant === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'}>
        {variant && <video key={variant} controls preload="metadata" playsInline
          poster={`/walkthroughs/free-chart-${variant}-poster.jpg`}
          aria-label="Free birth-chart calculation walkthrough"
          className="block w-full rounded-md border border-horizon"
          style={{ aspectRatio: variant === 'mobile' ? '390 / 844' : '1280 / 900' }}>
          <source src={`/walkthroughs/free-chart-${variant}.mp4`} type="video/mp4" />
          <track default kind="captions" label="English" srcLang="en" src={`/walkthroughs/free-chart-${variant}.en.vtt`} />
        </video>}
      </div>
      <details className="mt-4 text-body-sm text-dust">
        <summary className="cursor-pointer min-h-[44px] py-3 text-star">Read the walkthrough transcript</summary>
        <ol className="list-decimal pl-5 space-y-3 leading-relaxed">
          <li>Open the free birth-chart calculator. This example uses a fictional birth in New Delhi on 15 May 1990 at 09:30.</li>
          <li>Enter the birth date. Choose Known for a recorded birth time, then enter the local clock time. Choose Approximate only for an actual estimate. Unknown time does not produce a chart.</li>
          <li>Type the birth city and country, search, and select the correct location from the matches. Coordinates are confirmed by that selection.</li>
          <li>The optional save box keeps your draft and result on this browser for up to seven days. Leave it off on a shared device.</li>
          <li>Select Calculate free. The example returns Gemini rising and a Sagittarius Moon, with chart facts and traditional checks.</li>
          <li>Read the calculation timestamp and uncertainty. Chart meanings are interpretations, not guaranteed outcomes. Edit birth details to correct an input, or use Clear details and saved result to remove the local calculator entry.</li>
        </ol>
      </details>
    </section>
  );
}
