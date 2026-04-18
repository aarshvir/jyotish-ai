import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How VedicHour collects, uses, and protects your birth and account data. Encrypted storage, no sale of personal information, and full data rights.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Privacy Policy · VedicHour',
    description: 'How we handle and protect your personal and birth data.',
    url: '/privacy',
    type: 'article',
  },
  twitter: {
    card: 'summary',
    title: 'Privacy Policy · VedicHour',
    description: 'How we handle and protect your personal and birth data.',
  },
}

const sections = [
  { title: '1. Introduction', content: 'VedicHour is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data. By using our Service, you consent to the practices described herein.' },
  { title: '2. Information We Collect', content: 'Account & Contact: Email address, name (optional).\n\nBirth Data: Date, time, and place of birth — used solely to generate your astrological report.\n\nLocation: Current city for calculating hora and choghadiya timing.\n\nPayment: We do not store payment details. All processing is handled by our payment partners (Ziina and, where applicable, Razorpay), which are PCI-DSS compliant. We receive only a transaction confirmation and email.\n\nUsage Data: IP address, browser type, pages visited — collected automatically via standard analytics.' },
  { title: '3. How We Use Your Information', content: 'Service Delivery: To generate and deliver your astrological report.\n\nAccount Management: Order confirmations, report delivery, and customer support.\n\nService Improvement: Aggregated, anonymized usage data. We do not use individual birth data for any purpose other than your specific report.\n\nCommunication: Transactional emails only. No unsolicited marketing without explicit consent.' },
  { title: '4. Data Sharing', content: 'We do not sell, rent, or trade your personal data. We share data only with:\n\nService Providers: Our payment partners (Ziina and, where applicable, Razorpay), email delivery services, and hosting providers — all bound by data processing agreements.\n\nAI Providers: Birth data is sent to AI API providers (Anthropic, OpenAI) solely for report generation.\n\nLegal Requirements: If required by law or court order.' },
  { title: '5. Data Retention', content: 'Birth & Report Data: 24 months after your last report, then securely deleted on request.\n\nPayment Records: 7 years (UAE commercial law).\n\nSupport Communications: 12 months.\n\nAnalytics: Anonymized, up to 36 months.' },
  { title: '6. Your Rights', content: 'You may request: access to your data, correction of inaccuracies, deletion ("right to be forgotten"), data portability, and withdrawal of consent. Email privacy@vedichour.com. We respond within 30 days.' },
  { title: '7. Cookies', content: 'We use essential cookies (authentication, sessions) and optional analytics cookies. No advertising or third-party tracking cookies. You may disable analytics cookies via browser settings.' },
  { title: '8. Security', content: 'We use TLS/HTTPS encryption in transit, encrypted storage, and strict access controls. No internet transmission is 100% secure, but we follow industry best practices.' },
  { title: '9. International Transfers', content: 'Your data may be processed by service providers in the US and EU. We ensure appropriate safeguards including Standard Contractual Clauses where required.' },
  { title: '10. Children', content: 'Our Service is not for users under 18. We do not knowingly collect data from minors. Contact privacy@vedichour.com if you believe we have.' },
  { title: '11. Changes', content: 'We will notify you of significant changes via website notice or email. Continued use after changes constitutes acceptance.' },
  { title: '12. Contact', content: 'Privacy requests: privacy@vedichour.com\nGeneral support: support@vedichour.com\nWebsite: vedichour.com' },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-space via-dark to-space text-star font-display">
      <header className="px-5 sm:px-8 lg:px-12 py-5 flex justify-between items-center border-b border-amber/15">
        <Link
          href="/"
          className="no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 rounded-sm"
        >
          <span className="text-xl sm:text-2xl font-bold text-amber tracking-wider font-mono">VedicHour</span>
        </Link>
        <Link
          href="/pricing"
          className="text-dust/60 hover:text-amber transition-colors text-sm font-mono no-underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 rounded-sm"
        >
          Pricing →
        </Link>
      </header>

      <main id="main-content" className="max-w-[780px] mx-auto px-5 sm:px-8 pt-14 sm:pt-20 pb-20 sm:pb-28">
        <p className="text-xs tracking-[0.2em] text-amber uppercase mb-3 font-mono">Legal</p>
        <h1 className="text-4xl sm:text-5xl font-light mb-4 leading-tight">Privacy Policy</h1>
        <p className="text-sm text-dust/50 font-sans mb-12">Last updated: 22 March 2026</p>

        {/* Summary callout */}
        <div className="bg-amber/[0.05] border border-amber/20 rounded-xl px-7 py-6 mb-12 text-sm text-dust/70 font-sans leading-relaxed">
          <strong className="text-amber">Summary:</strong> We collect your birth data (date, time, place) and email only to generate and deliver your report. We do not sell your data. Payments are handled by our payment partners (Ziina, Razorpay), not us. Request data deletion anytime: privacy@vedichour.com.
        </div>

        {/* Sections */}
        {sections.map((s, i) => (
          <div key={i} className="py-8 border-b border-white/[0.06]">
            <h2 className="text-base font-semibold mb-4 text-amber font-display">{s.title}</h2>
            <p className="text-sm text-dust/70 leading-[1.9] font-sans whitespace-pre-line">{s.content}</p>
          </div>
        ))}
      </main>

      <footer className="border-t border-white/6 px-5 sm:px-8 lg:px-12 py-7 flex flex-col sm:flex-row justify-between items-center gap-4 font-mono text-xs text-dust/50">
        <span>© {new Date().getFullYear()} VedicHour. All rights reserved.</span>
        <div className="flex gap-5 sm:gap-6">
          <Link href="/terms" className="text-dust/50 hover:text-amber transition-colors no-underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 rounded-sm">Terms</Link>
          <Link href="/refund" className="text-dust/50 hover:text-amber transition-colors no-underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 rounded-sm">Refunds</Link>
        </div>
      </footer>
    </div>
  )
}
