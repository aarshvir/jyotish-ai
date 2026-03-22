import Link from 'next/link'

const sections = [
  { title: '1. Acceptance of Terms', content: 'By accessing or using VedicHour ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These Terms constitute a legally binding agreement between you and VedicHour. We reserve the right to modify these Terms at any time. Continued use following changes constitutes acceptance.' },
  { title: '2. Description of Service', content: 'VedicHour provides AI-generated Vedic astrology reports as digital products. Reports include natal chart analysis, hourly forecasts, choghadiya timing, planetary position analysis, and astrological commentary. All reports are generated using Swiss Ephemeris computational astrology software combined with artificial intelligence and delivered digitally.' },
  { title: '3. Eligibility', content: 'You must be at least 18 years of age to use the Service. By using the Service, you represent that you meet this requirement and have the legal capacity to enter a binding agreement.' },
  { title: '4. Digital Products and Delivery', content: 'Upon successful payment, your report will be available within 15 minutes. Reports are delivered via downloadable PDF and online viewing. Delivery is deemed complete upon making the report available in your account or sending a download link to your registered email.' },
  { title: '5. Payment and Pricing', content: 'All prices are in US Dollars. Payments are processed by Paddle, our authorized payment processor. By providing payment information, you authorize Paddle to charge applicable fees. We reserve the right to change pricing at any time; changes will not affect completed purchases.' },
  { title: '6. Refund Policy', content: 'We offer a 7-day satisfaction guarantee on all paid reports. Request a refund within 7 days of purchase by emailing support@vedichour.com. Refunds are processed within 5-10 business days. See our full Refund Policy at vedichour.com/refund.' },
  { title: '7. Astrological Disclaimer', content: 'IMPORTANT: VedicHour reports are for entertainment, self-reflection, and informational purposes only. Astrology is not a science. Our reports are not a substitute for professional legal, financial, medical, or psychological advice. We do not guarantee the accuracy of any astrological interpretation. Do not make important life decisions based solely on our reports. We expressly disclaim liability for decisions made in reliance on our content.' },
  { title: '8. Intellectual Property', content: 'All VedicHour content is our intellectual property. Upon purchase, you receive a personal, non-exclusive, non-transferable license for personal, non-commercial use. You may not reproduce, distribute, sell, or create derivative works without written permission.' },
  { title: '9. User Data and Privacy', content: 'We collect birth data and contact information to generate and deliver your report. Data is handled per our Privacy Policy at vedichour.com/privacy, incorporated herein by reference. We do not sell your personal data.' },
  { title: '10. Prohibited Use', content: 'You agree not to: use the Service unlawfully; reverse-engineer our software; use automated systems beyond personal use; resell or sublicense our reports; submit false information when purchasing; or use the Service to harm others.' },
  { title: '11. Limitation of Liability', content: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, VEDICHOUR SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE SPECIFIC REPORT IN QUESTION.' },
  { title: '12. Warranty Disclaimer', content: 'THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE. Astrological interpretations are subjective and we make no warranty regarding their accuracy.' },
  { title: '13. Governing Law', content: 'These Terms are governed by the laws of the United Arab Emirates. Disputes shall be subject to the exclusive jurisdiction of the courts of Dubai, UAE.' },
  { title: '14. Contact', content: 'Questions about these Terms: support@vedichour.com | vedichour.com' },
]

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a1a 0%, #0d0d2b 50%, #0a0a1a 100%)', color: '#e8e0d0', fontFamily: "'Georgia', serif" }}>
      <header style={{ padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212,175,55,0.15)' }}>
        <Link href="/" style={{ textDecoration: 'none' }}><span style={{ fontSize: '22px', fontWeight: '700', color: '#d4af37' }}>VedicHour</span></Link>
        <Link href="/pricing" style={{ color: '#a09880', textDecoration: 'none', fontSize: '14px', fontFamily: 'system-ui' }}>Pricing →</Link>
      </header>
      <main style={{ maxWidth: '780px', margin: '0 auto', padding: '60px 24px 100px' }}>
        <p style={{ fontSize: '12px', letterSpacing: '0.2em', color: '#d4af37', textTransform: 'uppercase', marginBottom: '12px', fontFamily: 'system-ui' }}>Legal</p>
        <h1 style={{ fontSize: '40px', fontWeight: '400', margin: '0 0 16px' }}>Terms of Service</h1>
        <p style={{ color: '#6b6350', fontSize: '14px', fontFamily: 'system-ui', marginBottom: '48px' }}>Last updated: 22 March 2026</p>
        <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '12px', padding: '24px 28px', marginBottom: '48px', fontFamily: 'system-ui', fontSize: '14px', color: '#a09880', lineHeight: 1.7 }}>
          <strong style={{ color: '#d4af37' }}>Summary:</strong> VedicHour provides AI-powered Vedic astrology reports for entertainment and self-reflection. We offer a 7-day refund guarantee. Reports are not professional advice. Your data is used only to generate your report.
        </div>
        {sections.map((s, i) => (
          <div key={i} style={{ padding: '32px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#d4af37' }}>{s.title}</h2>
            <p style={{ fontSize: '15px', color: '#a09880', lineHeight: 1.8, fontFamily: 'system-ui', margin: 0 }}>{s.content}</p>
          </div>
        ))}
      </main>
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 48px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', fontFamily: 'system-ui', fontSize: '13px', color: '#6b6350' }}>
        <span>© 2026 VedicHour.</span>
        <div style={{ display: 'flex', gap: '24px' }}>
          <Link href="/privacy" style={{ color: '#6b6350', textDecoration: 'none' }}>Privacy</Link>
          <Link href="/refund" style={{ color: '#6b6350', textDecoration: 'none' }}>Refunds</Link>
        </div>
      </footer>
    </div>
  )
}
