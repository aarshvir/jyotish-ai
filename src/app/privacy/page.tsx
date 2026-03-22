import Link from 'next/link'

const sections = [
  { title: '1. Introduction', content: 'VedicHour is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data. By using our Service, you consent to the practices described herein.' },
  { title: '2. Information We Collect', content: 'Account & Contact: Email address, name (optional).\n\nBirth Data: Date, time, and place of birth — used solely to generate your astrological report.\n\nLocation: Current city for calculating hora and choghadiya timing.\n\nPayment: We do not store payment details. All processing is handled by Paddle (PCI-DSS compliant). We receive only a transaction confirmation and email.\n\nUsage Data: IP address, browser type, pages visited — collected automatically via standard analytics.' },
  { title: '3. How We Use Your Information', content: 'Service Delivery: To generate and deliver your astrological report.\n\nAccount Management: Order confirmations, report delivery, and customer support.\n\nService Improvement: Aggregated, anonymized usage data. We do not use individual birth data for any purpose other than your specific report.\n\nCommunication: Transactional emails only. No unsolicited marketing without explicit consent.' },
  { title: '4. Data Sharing', content: 'We do not sell, rent, or trade your personal data. We share data only with:\n\nService Providers: Paddle (payments), email delivery services, and hosting providers — bound by data processing agreements.\n\nAI Providers: Birth data is sent to AI API providers (Anthropic, OpenAI) solely for report generation.\n\nLegal Requirements: If required by law or court order.' },
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a1a 0%, #0d0d2b 50%, #0a0a1a 100%)', color: '#e8e0d0', fontFamily: "'Georgia', serif" }}>
      <header style={{ padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212,175,55,0.15)' }}>
        <Link href="/" style={{ textDecoration: 'none' }}><span style={{ fontSize: '22px', fontWeight: '700', color: '#d4af37' }}>VedicHour</span></Link>
        <Link href="/pricing" style={{ color: '#a09880', textDecoration: 'none', fontSize: '14px', fontFamily: 'system-ui' }}>Pricing →</Link>
      </header>
      <main style={{ maxWidth: '780px', margin: '0 auto', padding: '60px 24px 100px' }}>
        <p style={{ fontSize: '12px', letterSpacing: '0.2em', color: '#d4af37', textTransform: 'uppercase', marginBottom: '12px', fontFamily: 'system-ui' }}>Legal</p>
        <h1 style={{ fontSize: '40px', fontWeight: '400', margin: '0 0 16px' }}>Privacy Policy</h1>
        <p style={{ color: '#6b6350', fontSize: '14px', fontFamily: 'system-ui', marginBottom: '48px' }}>Last updated: 22 March 2026</p>
        <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '12px', padding: '24px 28px', marginBottom: '48px', fontFamily: 'system-ui', fontSize: '14px', color: '#a09880', lineHeight: 1.7 }}>
          <strong style={{ color: '#d4af37' }}>Summary:</strong> We collect your birth data (date, time, place) and email only to generate and deliver your report. We do not sell your data. Payments are handled by Paddle, not us. Request data deletion anytime: privacy@vedichour.com.
        </div>
        {sections.map((s, i) => (
          <div key={i} style={{ padding: '32px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#d4af37' }}>{s.title}</h2>
            <p style={{ fontSize: '15px', color: '#a09880', lineHeight: 1.9, fontFamily: 'system-ui', margin: 0, whiteSpace: 'pre-line' }}>{s.content}</p>
          </div>
        ))}
      </main>
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 48px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', fontFamily: 'system-ui', fontSize: '13px', color: '#6b6350' }}>
        <span>© 2026 VedicHour.</span>
        <div style={{ display: 'flex', gap: '24px' }}>
          <Link href="/terms" style={{ color: '#6b6350', textDecoration: 'none' }}>Terms</Link>
          <Link href="/refund" style={{ color: '#6b6350', textDecoration: 'none' }}>Refunds</Link>
        </div>
      </footer>
    </div>
  )
}
