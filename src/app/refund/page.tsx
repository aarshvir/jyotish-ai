import Link from 'next/link'

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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a1a 0%, #0d0d2b 50%, #0a0a1a 100%)', color: '#e8e0d0', fontFamily: "'Georgia', serif" }}>
      <header style={{ padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212,175,55,0.15)' }}>
        <Link href="/" style={{ textDecoration: 'none' }}><span style={{ fontSize: '22px', fontWeight: '700', color: '#d4af37' }}>VedicHour</span></Link>
        <Link href="/pricing" style={{ color: '#a09880', textDecoration: 'none', fontSize: '14px', fontFamily: 'system-ui' }}>Pricing →</Link>
      </header>
      <main style={{ maxWidth: '780px', margin: '0 auto', padding: '60px 24px 100px' }}>
        <p style={{ fontSize: '12px', letterSpacing: '0.2em', color: '#d4af37', textTransform: 'uppercase', marginBottom: '12px', fontFamily: 'system-ui' }}>Legal</p>
        <h1 style={{ fontSize: '40px', fontWeight: '400', margin: '0 0 16px' }}>Refund Policy</h1>
        <p style={{ color: '#6b6350', fontSize: '14px', fontFamily: 'system-ui', marginBottom: '48px' }}>Last updated: 22 March 2026</p>
        <div style={{ background: 'rgba(107,170,107,0.08)', border: '1px solid rgba(107,170,107,0.3)', borderRadius: '12px', padding: '28px 32px', marginBottom: '48px', fontFamily: 'system-ui' }}>
          <div style={{ fontSize: '28px', marginBottom: '12px' }}>✦</div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '10px', color: '#8bc48b' }}>7-Day Satisfaction Guarantee</h2>
          <p style={{ fontSize: '15px', color: '#a09880', lineHeight: 1.7, margin: 0 }}>If you are not completely satisfied with your report, contact us within 7 days of purchase and we will issue a full refund — no questions asked.</p>
        </div>
        {sections.map((s, i) => (
          <div key={i} style={{ padding: '32px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#d4af37' }}>{s.title}</h2>
            <p style={{ fontSize: '15px', color: '#a09880', lineHeight: 1.9, fontFamily: 'system-ui', margin: 0, whiteSpace: 'pre-line' }}>{s.content}</p>
          </div>
        ))}
        <div style={{ marginTop: '48px', padding: '32px', background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '12px', textAlign: 'center', fontFamily: 'system-ui' }}>
          <p style={{ fontSize: '16px', color: '#a09880', marginBottom: '16px' }}>Need a refund or have a billing question?</p>
          <a href="mailto:support@vedichour.com" style={{ display: 'inline-block', padding: '12px 32px', background: 'linear-gradient(135deg, #d4af37, #b8962e)', color: '#0a0a1a', borderRadius: '6px', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>Contact Support</a>
        </div>
      </main>
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 48px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', fontFamily: 'system-ui', fontSize: '13px', color: '#6b6350' }}>
        <span>© 2026 VedicHour.</span>
        <div style={{ display: 'flex', gap: '24px' }}>
          <Link href="/terms" style={{ color: '#6b6350', textDecoration: 'none' }}>Terms</Link>
          <Link href="/privacy" style={{ color: '#6b6350', textDecoration: 'none' }}>Privacy</Link>
        </div>
      </footer>
    </div>
  )
}
