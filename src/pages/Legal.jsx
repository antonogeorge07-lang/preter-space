import { useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { ArrowLeft } from 'lucide-react';

// ── What we do / have / roadmap ──────────────────────────────────────────────

const FEATURE_SECTIONS = {
  label: 'Product Overview',
  intro: 'A clear, up-to-date record of what Preter does today, what is coming, and when.',
  subsections: [
    {
      title: '✅ Live Today',
      items: [
        'Real-time text translation: 50+ languages, both directions, automatic on send.',
        'Voice note transcription and translation: audio is transcribed then translated before delivery.',
        'WebRTC video and audio calls: peer-to-peer with live caption overlay powered by Web Speech API.',
        'Image, file, and document sharing (JPEG, PNG, PDF, DOCX, ZIP) with captions.',
        'Group conversations, every participant reads in their own language simultaneously.',
        'Disappearing messages: per-message expiry timers (10s, 1 min, or 1 hour).',
        'Push notifications (Web Push / VAPID): background alerts when the tab is closed.',
        'PWA (Progressive Web App): installable, works offline for viewing cached content, no App Store needed.',
        'Swipe-to-reply, message reactions (emoji), and message editing.',
        'Conversation search, media gallery, and AI smart replies.',
        'Online / last-seen presence indicators.',
        'Read receipts (blue double-ticks).',
        'Block & report contacts.',
        'Invite links, shareable /join/[code] URLs for onboarding contacts.',
        'Onboarding flow, 3-step guided setup for new users.',
        'Device session management, view and terminate active sessions.',
        'Role-based access control, users only access conversations they participate in.',
        'GDPR-compliant data model, EU-hosted infrastructure, Standard Contractual Clauses.',
      ],
    },
    {
      title: '🔜 Coming, Q3 2026',
      items: [
        'Translated audio calls: speak your language and your contact hears theirs in real-time.',
        'End-to-end encryption (E2EE): Signal-grade, keys never leave your device.',
        'Message threads & nested replies.',
        'AI conversation summaries: catch up on long threads in one paragraph.',
      ],
    },
    {
      title: '🔜 Coming, Q4 2026',
      items: [
        'Native iOS & Android apps (App Store & Google Play).',
        'Contact discovery by phone number.',
        'Enhanced media: audio messages with waveform playback, video messages.',
        'Message scheduling: send at a chosen time in the recipient\'s timezone.',
      ],
    },
    {
      title: '🔜 Coming, Early 2027',
      items: [
        'Workspace and team plans: shared inboxes, admin dashboards, SSO (SAML/OIDC).',
        'API access for developers: send and receive messages programmatically.',
        'Disappearing messages 2.0: auto-clear conversation mode and per-contact defaults.',
        'Message export (encrypted archive download).',
        'Accessibility improvements: full screen-reader support and high-contrast mode.',
      ],
    },
    {
      title: '❌ What We Do Not Do',
      items: [
        'We do not read, mine, or sell your messages.',
        'We do not use your message content to train AI models.',
        'We do not use advertising, tracking pixels, or third-party analytics.',
        'We do not store voice/video call streams.',
        'We do not collect location data or biometric data.',
      ],
    },
  ],
};

// ── Legal content ────────────────────────────────────────────────────────────

const SECTIONS = {
  features: FEATURE_SECTIONS,
  privacy: {
    label: 'Privacy Policy',
    content: [
      {
        title: '1. Who We Are',
        text: `Preter ("we", "us", "our") is a multilingual real-time messaging service. For GDPR purposes, the data controller is the individual or entity operating this application.

For any data-related enquiries, contact: legal@preter.app`,
      },
      {
        title: '2. What Data We Collect',
        text: `We collect only what is strictly necessary to provide the service:

• Account data: email address, display name (provided at registration).
• Message content: text messages, voice transcripts, and media files you send.
• Language preferences: your selected translation language.
• Push notification subscription: a browser-generated endpoint token (if you opt in).
• Technical data: timestamps, IP address (via hosting provider), device type inferred from browser.
• Usage data: which conversations you participate in, when messages are sent and read.

We do NOT collect payment data, location data, or biometric data.`,
      },
      {
        title: '3. How We Use Your Data',
        text: `Your data is used exclusively to:

• Deliver messages between conversation participants.
• Perform real-time translation using third-party AI (Google Gemini via our platform provider).
• Send account verification emails (OTP codes) and invite notifications.
• Deliver push notifications to your device when you opt in.
• Maintain session authentication and security.
• Enforce block lists and prevent abuse.

We do not use your data for advertising, profiling, or sale to third parties.`,
      },
      {
        title: '4. Legal Basis for Processing (GDPR Art. 6)',
        text: `Performance of contract (Art. 6(1)(b)): processing your messages and account data is necessary to provide the service you signed up for.
Legitimate interests (Art. 6(1)(f)): security logging and abuse prevention.
Consent (Art. 6(1)(a)): push notifications and optional features you explicitly enable.`,
      },
      {
        title: '5. Data Sharing & Third Parties',
        text: `We share minimal data with the following processors under appropriate data processing agreements:

Base44 / Wix (platform infrastructure and database hosting): EU/US data transfer under Standard Contractual Clauses.
Google (AI translation via Gemini Flash API): message text is sent for translation only and immediately discarded. Google does not retain this data for model training under our API agreement.
Email delivery provider: for OTP verification and invite emails only.

We do not sell, rent, or trade your personal data.`,
      },
      {
        title: '6. International Data Transfers',
        text: `Some processors are based outside the European Economic Area (EEA). Where this occurs, transfers are safeguarded by Standard Contractual Clauses (SCCs) approved by the European Commission, ensuring equivalent protection to that within the EEA.`,
      },
      {
        title: '7. Data Retention',
        text: `Account data: retained while your account is active, deleted within 30 days of closure.
Message content: retained until you delete individual messages or your account.
Push subscription tokens: deleted when you revoke notification permission or delete your account.
Technical and security logs: retained for up to 90 days.`,
      },
      {
        title: '8. Your Rights Under GDPR',
        text: `As a resident of the EU/EEA, you have the following rights:

Right of access (Art. 15): request a copy of your personal data.
Right of rectification (Art. 16): correct inaccurate data.
Right of erasure (Art. 17): request deletion of your data ("right to be forgotten").
Right to restriction (Art. 18): limit how we process your data.
Right to data portability (Art. 20): receive your data in a machine-readable format.
Right to object (Art. 21): object to processing based on legitimate interests.
Right to withdraw consent: at any time, without affecting prior processing.

To exercise any of these rights, contact us at legal@preter.app. We will respond within 30 days.

You also have the right to lodge a complaint with the Spanish Data Protection Authority (AEPD) at www.aepd.es.`,
      },
      {
        title: '9. Cookies & Local Storage',
        text: `Preter uses browser local storage and session storage solely for:

• Maintaining your authenticated session (authentication token).
• Temporarily caching invite codes during the onboarding flow.
• Remembering your onboarding completion status.

We do not use tracking cookies or third-party analytics cookies. No cookie consent banner is required as we use only strictly necessary storage.`,
      },
      {
        title: '10. Push Notifications',
        text: `If you grant notification permission, your browser generates a push subscription endpoint (a unique URL) which is stored in your user profile. This endpoint is used only to deliver Preter message alerts. You may revoke this permission at any time in your browser settings, which immediately disables delivery.`,
      },
      {
        title: '11. Security',
        text: `We implement appropriate technical and organisational measures including:

Encrypted data transmission (HTTPS/TLS).
Role-based access control: users only access conversations they participate in.
Cryptographically secure invite codes.
VAPID-signed push notifications: only our server can send alerts to your device.
No passwords stored in plain text (managed by our authentication provider).

No system is 100% secure. In the event of a data breach affecting your rights, we will notify the relevant supervisory authority within 72 hours and affected users without undue delay (GDPR Art. 33 and 34).`,
      },
      {
        title: '12. Children',
        text: `Preter is not directed to children under the age of 16. We do not knowingly collect personal data from children under 16. If you believe a child has provided us with personal data, contact us immediately and we will delete it promptly.`,
      },
      {
        title: '13. Changes to This Policy',
        text: `We may update this Privacy Policy. We will notify registered users by email of any material changes at least 30 days before they take effect. Continued use of Preter after the effective date constitutes acceptance of the updated policy.`,
      },
      {
        title: '14. Contact',
        text: `Data Controller contact for privacy matters:\nEmail: legal@preter.app\n\nSpanish supervisory authority:\nAgencia Española de Protección de Datos (AEPD)\nwww.aepd.es`,
      },
    ],
  },
  terms: {
    label: 'Terms of Service',
    content: [
      {
        title: '1. Acceptance of Terms',
        text: `By creating an account or using Preter, you agree to these Terms of Service ("Terms"). If you do not agree, do not use the service. These Terms constitute a legally binding agreement between you and the operator of Preter.`,
      },
      {
        title: '2. The Service',
        text: `Preter provides a real-time multilingual messaging service including text, voice, image, file sharing, and WebRTC video/audio calls with live translation. We reserve the right to modify, suspend, or discontinue any part of the service at any time. We are not liable for any such modification, suspension, or discontinuation.`,
      },
      {
        title: '3. Eligibility',
        text: `You must be at least 16 years old to use Preter. By using the service, you represent and warrant that you meet this requirement.`,
      },
      {
        title: '4. Your Account',
        text: `You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. Notify us immediately of any unauthorised use. We reserve the right to terminate accounts that violate these Terms.`,
      },
      {
        title: '5. Acceptable Use',
        text: `You agree NOT to use Preter to:

• Send, share, or store content that is illegal, harmful, threatening, abusive, harassing, defamatory, or obscene.
• Violate any applicable local, national, or international law or regulation.
• Infringe the intellectual property, privacy, or other rights of any third party.
• Transmit spam, unsolicited commercial messages, or malware.
• Attempt to gain unauthorised access to any part of the service or its infrastructure.
• Reverse engineer, decompile, or attempt to extract the source code of the service.
• Abuse the push notification system to send unsolicited alerts.

We reserve the right to suspend or terminate access for any violation, without prior notice.`,
      },
      {
        title: '6. User Content',
        text: `You retain ownership of the content you send through Preter. By using the service, you grant us a limited, non-exclusive, royalty-free licence to store, transmit, and translate your content solely for the purpose of delivering the service. This licence terminates when you delete the content or your account.

You are solely responsible for the content you send. We do not pre-screen or moderate messages.`,
      },
      {
        title: '7. Translation Disclaimer',
        text: `Preter uses AI-powered translation (Google Gemini). Translations are provided "as-is" and may not be perfectly accurate. We make no warranty regarding the accuracy, completeness, or reliability of any translation. Do not rely on Preter translations for legal, medical, safety-critical, or other high-stakes communications.`,
      },
      {
        title: '8. Voice & Video Calls',
        text: `Voice and video calls are transmitted peer-to-peer (WebRTC). Call quality depends on your network conditions. We do not record or store voice or video call content. Live captions are generated locally via your browser's Speech Recognition API and transmitted over the peer data channel.`,
      },
      {
        title: '9. Push Notifications',
        text: `By granting notification permission, you consent to receiving message alerts from Preter. You may withdraw this consent at any time via your browser settings. We will not use push notifications for marketing or any purpose other than delivering message alerts for your conversations.`,
      },
      {
        title: '10. Intellectual Property',
        text: `All intellectual property rights in Preter (including the software, design, trademarks, and branding) are owned by or licensed to us. Nothing in these Terms grants you any rights beyond what is necessary to use the service.`,
      },
      {
        title: '11. Disclaimer of Warranties',
        text: `Preter is provided "as is" and "as available" without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the service will be uninterrupted or error-free.`,
      },
      {
        title: '12. Limitation of Liability',
        text: `To the fullest extent permitted by applicable law, Preter and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or in connection with your use of the service.

Our total aggregate liability to you shall not exceed the greater of (a) amounts you have paid us in the 12 months preceding the claim, or (b) €100.

Nothing in these Terms limits liability that cannot be excluded under applicable law.`,
      },
      {
        title: '13. Indemnification',
        text: `You agree to indemnify and hold harmless Preter and its operators from any claims, damages, losses, and expenses (including reasonable legal fees) arising out of your use of the service, your violation of these Terms, or your violation of any rights of a third party.`,
      },
      {
        title: '14. Termination',
        text: `We may terminate or suspend your account at any time for violation of these Terms or for any other reason at our sole discretion. You may terminate your account at any time via Profile, then Settings. Upon termination, your right to use the service ceases immediately.`,
      },
      {
        title: '15. Governing Law & Jurisdiction',
        text: `These Terms are governed by the laws of Spain. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of Spain, without prejudice to your rights as a consumer under mandatory local law.`,
      },
      {
        title: '16. Changes to Terms',
        text: `We may update these Terms at any time. We will notify registered users by email at least 30 days before material changes take effect. Continued use after the effective date constitutes acceptance.`,
      },
      {
        title: '17. Contact',
        text: `For legal enquiries regarding these Terms:\nEmail: legal@preter.app`,
      },
    ],
  },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function Legal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('features');

  const TABS = [
    { key: 'features', label: 'What We Do' },
    { key: 'privacy', label: 'Privacy Policy' },
    { key: 'terms', label: 'Terms of Service' },
  ];

  const section = SECTIONS[activeTab];

  return (
    <div className="min-h-screen w-full" style={{ background: 'var(--background)' }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3"
        style={{ background: 'var(--header-bg)', borderColor: 'var(--surface-border)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-black/5 transition-colors flex-shrink-0">
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
        </button>
        <span className="text-base font-semibold font-heading" style={{ color: 'var(--foreground)' }}>
          Preter · Legal & Product Docs
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1.5 mb-8 p-1 rounded-2xl" style={{ background: 'var(--glass-bg-subtle)' }}>
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all"
              style={activeTab === key
                ? { background: 'var(--primary)', color: 'var(--paper)' }
                : { color: 'var(--muted)' }}>
              {label}
            </button>
          ))}
        </div>

        <p className="text-xs mb-6" style={{ color: 'var(--muted)' }}>
          Last updated: June 2026 &nbsp;·&nbsp; Effective date: June 25, 2026
        </p>

        {/* ── Features / Roadmap tab ── */}
        {activeTab === 'features' && (
          <div>
            <h1 className="text-2xl font-semibold mb-2 font-heading" style={{ color: 'var(--foreground)' }}>
              {section.label}
            </h1>
            <p className="text-sm mb-8 leading-relaxed" style={{ color: 'var(--muted)' }}>{section.intro}</p>

            <div className="space-y-8">
              {section.subsections.map((sub, si) => (
                <div key={si}>
                  <h2 className="text-base font-semibold mb-3 font-heading" style={{ color: 'var(--foreground)' }}>
                    {sub.title}
                  </h2>
                  <ul className="space-y-2">
                    {sub.items.map((item, ii) => (
                      <li key={ii} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--foreground)' }}>
                        <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--primary)' }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Privacy / Terms tabs ── */}
        {activeTab !== 'features' && (
          <div className="space-y-8">
            {section.content.map((item, i) => (
              <div key={i}>
                <h2 className="text-base font-semibold mb-2 font-heading" style={{ color: 'var(--foreground)' }}>
                  {item.title}
                </h2>
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--foreground)', opacity: 0.85 }}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 pt-6 border-t text-center" style={{ borderColor: 'var(--surface-border)' }}>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Preter · Governed by the laws of Spain · GDPR compliant · legal@preter.app
          </p>
        </div>
      </div>
    </div>
  );
}