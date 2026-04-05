import Link from 'next/link'

export const dynamic = 'force-static'

const sections = [
  { title: '1. Our Guarantee', content: 'We stand behind every VedicHour report. All paid reports are covered by our 7-day satisfaction guarantee. If your report does not meet your expectations for any reason, we will refund your purchase in full. No questions asked.' },
  { title: '2. Eligibility', content: 'You are eligible for a full refund if:\n• You request it within 7 days of your purchase date\n• Your report has been successfully generated and delivered\n• You contact us at support@vedichour.com with your order details\n\nYou are not required to provide a reason, though feedback is appreciated.' },
  { title: '3. How to Request', content: 'Email support@vedichour.com with:\n• Subject: "Refund Request — [your order ID or email]"\n• Your registered email address\n• Date of purchase\n• (Optional) Brief reason\n\nWe confirm receipt within 24 hours and process within 3-5 business days.' },
  { title: '4. Processing', content: 'Refunds are processed through Paddle, our payment processor. Credit/debit card refunds take 5-10 business days to appear on your statement. Refunds are credited to the original payment method only.' },
  { title: '5. Free Reports', content: 'Free Preview Reports are provided at no cost and are not eligible for refunds. If you experience a technical issue with your free report, contact support@vedichour.com for assistance.' },
  { title: '6. Technical Issues', content: 'If your paid report was not delivered due to a technical error on our part, you are entitled to either a complete re-generation at no cost, or a full refund. Contact support@vedichour.com within 48 hours of your expected delivery time.' },
  { title: '7. Chargebacks', content: 'We encourage you to contact us before initiating a bank chargeback — we resolve all legitimate disputes promptly and direct resolution is faster. Unwarranted chargebacks may result in account suspension.' },
  { title: '8. Contact', content: 'Refund requests & billing: support@vedichour.com\nWe respond within 24 business hours, Monday–Friday.' },
]

export default function RefundPage() {
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

      <main className="max-w-[780px] mx-auto px-5 sm:px-8 pt-14 sm:pt-20 pb-20 sm:pb-28">
        <p className="text-xs tracking-[0.2em] text-amber uppercase mb-3 font-mono">Legal</p>
        <h1 className="text-4xl sm:text-5xl font-light mb-4 leading-tight">Refund Policy</h1>
        <p className="text-sm text-dust/50 font-sans mb-12">Last updated: 22 March 2026</p>

        {/* Guarantee callout */}
        <div className="bg-emerald/[0.06] border border-emerald/25 rounded-xl px-7 py-7 mb-12">
          <div className="text-2xl mb-3 text-emerald/60">✦</div>
          <h2 className="text-lg font-semibold mb-2.5 text-emerald font-display">7-Day Satisfaction Guarantee</h2>
          <p className="text-sm text-dust/70 leading-relaxed font-sans">
            If you are not completely satisfied with your report, contact us within 7 days of purchase and we will issue a full refund — no questions asked.
          </p>
        </div>

        {/* Sections */}
        {sections.map((s, i) => (
          <div key={i} className="py-8 border-b border-white/[0.06]">
            <h2 className="text-base font-semibold mb-4 text-amber font-display">{s.title}</h2>
            <p className="text-sm text-dust/70 leading-[1.9] font-sans whitespace-pre-line">{s.content}</p>
          </div>
        ))}

        {/* Contact CTA */}
        <div className="mt-12 px-7 py-8 bg-amber/[0.04] border border-amber/15 rounded-xl text-center">
          <p className="text-sm text-dust/70 font-sans mb-5">Need a refund or have a billing question?</p>
          <a
            href="mailto:support@vedichour.com"
            className="inline-flex items-center justify-center px-8 py-3 min-h-[44px] bg-gradient-to-r from-amber to-amber/80 text-space rounded-md text-sm font-semibold font-mono no-underline hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-space"
          >
            Contact Support
          </a>
        </div>
      </main>

      <footer className="border-t border-white/6 px-5 sm:px-8 lg:px-12 py-7 flex flex-col sm:flex-row justify-between items-center gap-4 font-mono text-xs text-dust/50">
        <span>© {new Date().getFullYear()} VedicHour. All rights reserved.</span>
        <div className="flex gap-5 sm:gap-6">
          <Link href="/terms" className="text-dust/50 hover:text-amber transition-colors no-underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 rounded-sm">Terms</Link>
          <Link href="/privacy" className="text-dust/50 hover:text-amber transition-colors no-underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 rounded-sm">Privacy</Link>
        </div>
      </footer>
    </div>
  )
}
