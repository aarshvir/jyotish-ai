export type HelpCategory = 'Birth details' | 'Results' | 'Account' | 'Privacy';

export interface HelpArticle {
  slug: string;
  title: string;
  category: HelpCategory;
  summary: string;
  keywords: string[];
  sections: { heading: string; paragraphs: string[]; steps?: string[] }[];
  action: { label: string; href: string };
  related: string[];
}

export const helpArticles: HelpArticle[] = [
  {
    slug: 'free-birth-chart', title: 'Make a free birth chart', category: 'Birth details',
    summary: 'Start with your birth date, recorded birth time and birthplace. No purchase is needed.',
    keywords: ['kundli', 'kundali', 'calculator', 'first chart', 'cost', 'walkthrough'],
    sections: [{ heading: 'Calculate your chart', paragraphs: ['Use your recorded local birth time, not the current time or a converted time in another country.'], steps: ['Open the free birth-chart calculator.', 'Enter your birth date. Choose whether your birth time is known, approximate or unknown; enter your local time if known or approximate.', 'Search for the city where you were born, then select the correct city and country from the suggestions.', 'Choose Calculate free. Unknown time stops this calculation; it does not substitute noon. Check the details and any provisional label before interpreting a result.'] }, { heading: 'Keep or clear your result', paragraphs: ['Saving on this device is optional. Leave it off on shared devices. A saved result is a calculated snapshot with a timestamp, not a newly calculated forecast every time you reopen it. Use Edit birth details to correct the inputs; calculate again for an updated result.'] }, { heading: 'See an example first', paragraphs: ['The example reading is illustrative, not your personal chart. Opening it does not create a report or start a purchase.'] }],
    action: { label: 'Open free birth chart', href: '/free-kundli' }, related: ['birth-time', 'choose-city', 'chart-terms'],
  },
  {
    slug: 'birth-time', title: 'My birth time is missing or uncertain', category: 'Birth details',
    summary: 'Keep uncertainty visible. A guessed time is not a verified birth time.',
    keywords: ['unknown', 'approximate', 'noon', '12:00', 'am', 'pm', 'rectification', 'time of birth'],
    sections: [{ heading: 'Missing time', paragraphs: ['Look for a birth record or ask someone who was present. Do not enter noon or another convenient time as if it were known.', 'Choose unknown time to make the uncertainty explicit. The current free chart calculator stops rather than inventing a time; it cannot determine the Moon sign, nakshatra or periods reliably across an entire day. View the example while looking for a record. VedicHour does not verify or rectify your birth time.'] }, { heading: 'Approximate time', paragraphs: ['Choose approximate and enter your estimate only if you have one. The result is provisional at that entered estimate, not verified over a range of possible times. The Lagna (ascendant), houses and fine timing can change with the time. Even the Moon sign or nakshatra can change near a boundary.', '12 AM is midnight; 12 PM is noon. Enter the recorded local time at the birthplace. Testing several guesses does not reveal the correct birth time.'] }],
    action: { label: 'View example reading', href: '/sample-report' }, related: ['free-birth-chart', 'choose-city', 'chart-terms'],
  },
  {
    slug: 'choose-city', title: 'Choose the right birth city', category: 'Birth details',
    summary: 'Select your birthplace from the suggestions, not just the typed city name.',
    keywords: ['location', 'place', 'country', 'coordinates', 'timezone', 'time zone', 'town'],
    sections: [{ heading: 'Confirm the place', paragraphs: ['Use the city where you were born, not where you live now. Cities with the same name can have different coordinates and time zones.'], steps: ['Type the city name and, if needed, its country.', 'Select the matching suggestion and check its country or region.', 'If you change the typed name afterward, select a suggestion again.'] }, { heading: 'Cannot find your birthplace?', paragraphs: ['Try another spelling or a nearby known city. A nearby city is an approximation, not the same coordinates as your birthplace. Stop if the location is unclear rather than choosing an unrelated place.', 'Location search can be temporarily unavailable. Keep your details, check your connection and try again. Forecast tools that ask for a current city need that separately.'] }],
    action: { label: 'Open free birth chart', href: '/free-kundli' }, related: ['birth-time', 'troubleshooting'],
  },
  {
    slug: 'chart-terms', title: 'Understand the terms in my result', category: 'Results',
    summary: 'Lagna, Rashi, nakshatra, dasha and dosha in plain language.',
    keywords: ['meaning', 'ascendant', 'rising', 'moon sign', 'sun sign', 'mahadasha', 'antardasha', 'manglik', 'sade sati', 'rahu', 'score'],
    sections: [{ heading: 'Chart placements', paragraphs: ['Lagna (ascendant) is the sign rising at the birth moment; it is especially sensitive to time and place. Rashi usually means the Moon sign in these results. The Vedic Sun sign is shown separately.', 'Nakshatra is the traditional lunar division containing the Moon. Pada is one of its four subdivisions.'] }, { heading: 'Timing and traditional patterns', paragraphs: ['Dasha is a traditional planetary-period system. Mahadasha is the main period and antardasha is a smaller period within it.', 'Dosha labels refer to traditional chart patterns, not a diagnosis or proof that something bad will happen. A compatibility score is not a verdict on a relationship.', 'Forecast scores are modelled astrology indicators, not measured probabilities or promises. Calculation does not establish that astrology predicts real-world outcomes.'] }],
    action: { label: 'View example reading', href: '/sample-report' }, related: ['calculation-and-interpretation', 'birth-time'],
  },
  {
    slug: 'compatibility', title: 'Understand a compatibility result', category: 'Results',
    summary: 'Read the calculated match factors without treating a score as a relationship verdict.',
    keywords: ['synastry', 'match', 'matchmaking', 'guna', 'ashtakoot', '36', 'partners', 'marriage'],
    sections: [{ heading: 'Check both people\'s details', paragraphs: ['Use each person\'s own birth date, recorded local birth time and birthplace. Do not copy one person\'s city or time into the other person\'s fields.', 'If either time is uncertain, keep the limitations visible. Do not turn an approximate chart into a definitive relationship conclusion.'] }, { heading: 'Calculated factors and interpretation', paragraphs: ['The free compatibility preview shows calculated match information. Ashtakoot is a traditional eight-factor comparison, usually expressed out of 36; it is not a scientifically established probability of relationship success.', 'Generated interpretation is separate from those calculations. An existing full reading requires the access shown for your account; do not make a new purchase to retrieve one you already have.', 'Use results for reflection, alongside communication, consent and real circumstances. A low or high score is not a direction to end or pursue a relationship.'] }],
    action: { label: 'Open free compatibility preview', href: '/synastry' }, related: ['birth-time', 'chart-terms', 'existing-reports'],
  },
  {
    slug: 'edit-save-clear', title: 'Edit, keep or clear my chart details', category: 'Privacy',
    summary: 'Browser drafts, account preferences and saved reports are different kinds of saved work.',
    keywords: ['remember', 'forget', 'delete', 'reset', 'storage', 'refresh', 'draft', 'change', 'correct', 'save'],
    sections: [{ heading: 'Correct a chart', paragraphs: ['Use Edit birth details in the calculator, correct the fields and calculate again. Editing cancels an in-flight calculation and invalidates the old displayed result. A changed result does not edit an older report stored in your account.', 'Account settings save default birth details for later forms. They do not rewrite existing reports. Leave an unknown birth time blank in your defaults.'] }, { heading: 'Keep work and retrieve it', paragraphs: ['The free calculator offers an unticked Save my draft and result on this device option, for up to 7 days. Keep it off on shared devices. A restored result is a dated snapshot, not a fresh calculation. Private browsing, a different device or cleared storage may not restore it.', 'A saved account report can be opened from the dashboard while signed in to its owning account. Optional chart-link delivery is separate from account reports and is saved only when its form confirms success.'] }, { heading: 'Clear device drafts', paragraphs: ['The calculator trash control clears its entered details and saved result. Turning off device saving removes its saved copy. The broader privacy control removes the calculator record plus the identified quiz and onboarding drafts from this browser.', 'These controls do not sign you out or delete account reports, payments or a chart already saved through email delivery. Close other open chart or quiz tabs before clearing; an active form can write a draft again. For account data or an emailed saved chart, use the privacy contact instead.'] }],
    action: { label: 'Open privacy controls', href: '/chart-privacy#device-controls' }, related: ['existing-reports', 'privacy'],
  },
  {
    slug: 'existing-reports', title: 'Find a report I already have', category: 'Account',
    summary: 'Sign in to the same account, then open your saved forecast, Kundli reading or match.',
    keywords: ['retrieve', 'return', 'returning', 'missing report', 'paid', 'purchase', 'dashboard', 'history', 'email link'],
    sections: [{ heading: 'Open saved work', paragraphs: ['No new purchase is needed to open an existing report you have access to. New-offer availability does not erase an existing record.'], steps: ['Sign in with the same email or Google account used for the original report.', 'Open your dashboard. Forecasts, Kundli readings and matches are listed separately.', 'Open the existing report. Check payment history separately for a transaction.'] }, { heading: 'It is missing', paragraphs: ['Check whether you used a different Google account or email before. A calculator draft or an emailed quiz chart is not necessarily an account report.', 'A loading error does not mean your reports were deleted. Retry loading. A report still processing may take longer than expected; check its progress rather than starting or paying for another.', 'Contact support with the approximate date, report type and any receipt reference. Do not send passwords, verification links or card details.'] }],
    action: { label: 'Open my account', href: '/dashboard' }, related: ['sign-in', 'report-processing', 'unavailable-offers'],
  },
  {
    slug: 'sign-in', title: 'Recover access to my account', category: 'Account',
    summary: 'Use your original sign-in method, confirm your email or request a password reset.',
    keywords: ['login', 'log in', 'password', 'forgot', 'google', 'verification', 'confirmation', 'expired link'],
    sections: [{ heading: 'Email and password', paragraphs: ['For a forgotten password, enter your account email on the sign-in page, then choose Forgot password. Open the latest reset email and follow its link. Check spam if it does not arrive.', 'If a confirmation link is required, open the confirmation email before signing in. An expired link does not delete your reports. Do not create another account just to retrieve them.'] }, { heading: 'Google and connection problems', paragraphs: ['For an account created with Google, use Continue with Google and select the same Google account. Check your connection and retry if sign-in could not complete.', 'After too many attempts, wait before retrying. Support cannot see your password; never share passwords or recovery links. If you cannot reach your original inbox or recovery still fails, contact support.'] }],
    action: { label: 'Go to sign in', href: '/login' }, related: ['existing-reports', 'troubleshooting'],
  },
  {
    slug: 'unavailable-offers', title: 'A reading or renewal is unavailable', category: 'Account',
    summary: 'Use the free calculator or example, and keep access to existing saved reports.',
    keywords: ['checkout', 'billing', 'subscription', 'buy', 'purchase', 'commercial', 'plans', 'payment', 'renew'],
    sections: [{ heading: 'What you can do now', paragraphs: ['New paid readings and renewals may be unavailable. When checkout is unavailable, do not send a payment elsewhere or use an old checkout link. No release date is promised.', 'The free calculator and example reading are available without a new purchase. Sign in to retrieve reports already in your account.'] }, { heading: 'Existing access', paragraphs: ['Your dashboard shows the existing subscription period and its reported access status. Renewal offers are shown only when checkout is enabled.', 'An existing entitled forecast action may still be available according to your account status and unlock date. It is not a new checkout, and availability of generated content is separate from deterministic free calculation.', 'If an earlier payment is missing, check account payment history and contact support with its reference. Do not pay again to recover an existing purchase.'] }],
    action: { label: 'Open free birth chart', href: '/free-kundli' }, related: ['existing-reports', 'calculation-and-interpretation'],
  },
  {
    slug: 'calculation-and-interpretation', title: 'Separate calculation from generated interpretation', category: 'Results',
    summary: 'Computed placements are different from written commentary and real-world predictions.',
    keywords: ['ai', 'artificial intelligence', 'language model', 'accuracy', 'deterministic', 'ephemeris', 'provider', 'generated'],
    sections: [{ heading: 'Calculated information', paragraphs: ['The free calculator computes chart placements from the date, time and location you enter. The ephemeris and chosen astrology conventions determine those values; an incorrect input can still produce a plausible-looking chart.'] }, { heading: 'Interpretation', paragraphs: ['Traditional explanations give meaning to chart patterns. Generated report commentary uses language models to describe supplied chart information. It is not the same thing as calculating a placement and can contain mistakes.', 'Astrology is an interpretive tradition, not a scientifically established way to predict personal outcomes. Do not use chart labels or generated commentary as medical, legal or financial advice.'] }],
    action: { label: 'View example reading', href: '/sample-report' }, related: ['chart-terms', 'privacy', 'birth-time'],
  },
  {
    slug: 'privacy', title: 'Know where my details go', category: 'Privacy',
    summary: 'Understand device drafts, account records and service-provider processing separately.',
    keywords: ['data', 'personal', 'email', 'consent', 'unsubscribe', 'delete', 'browser', 'providers', 'retention'],
    sections: [{ heading: 'This device', paragraphs: ['Some unfinished chart and quiz details are stored in browser storage to continue your task. They are not private from someone using the same browser profile. Clearing a draft removes the identified local copy, not previously submitted data.'] }, { heading: 'Account and optional delivery', paragraphs: ['Account reports and profile defaults are kept with your account. Optional emailed chart links use a separate save-and-delivery flow. Only submit an email for delivery when you choose it; marketing consent is separate.', 'Use the privacy notice for the data included in optional chart delivery, the unsubscribe option in those emails, and the privacy contact for access, correction or deletion requests.'] }, { heading: 'Providers', paragraphs: ['Free calculation sends birth inputs to the site and its calculation service. Account storage and authentication use Supabase; site hosting uses Vercel; chart email delivery uses Resend.', 'Generated readings can send birth details, calculated chart data and supplied context to model providers. A free calculation is not itself a language-model reading. Clearing device drafts does not remove provider or account records. See the full privacy policy for the wider site.'] }],
    action: { label: 'Read privacy notice and controls', href: '/chart-privacy' }, related: ['edit-save-clear', 'calculation-and-interpretation'],
  },
  {
    slug: 'troubleshooting', title: 'Fix a calculation, city search or loading problem', category: 'Results',
    summary: 'Keep your inputs, check the connection, and retry the task that failed.',
    keywords: ['error', 'timeout', 'offline', 'network', 'broken', 'failed', 'slow', 'empty', 'mobile'],
    sections: [{ heading: 'Before retrying', paragraphs: ['Check your connection, the birth date and time, and whether the birthplace is selected from the suggestions. Correcting a field may require calculating again.', 'If a provider is temporarily unavailable, wait and retry that calculation. Do not change a valid birth time or place just to remove an error.'] }, { heading: 'Account or saved-work errors', paragraphs: ['If your session expired, sign in again with the original account. A retrieval error is different from an empty list.', 'If browser storage is blocked, work may not survive refresh or closing the tab. A local clear error does not mean account records were removed.', 'For persistent problems, tell support which task failed, the approximate time and the visible error. Avoid sharing full birth details, passwords, reset links or payment-card information.'] }],
    action: { label: 'Try free birth chart', href: '/free-kundli' }, related: ['choose-city', 'sign-in', 'existing-reports'],
  },
  {
    slug: 'report-processing', title: 'My existing report is still processing', category: 'Account',
    summary: 'Open its progress page. A delay is not proof that your payment or report was lost.',
    keywords: ['generating', 'generation', 'pending', 'stuck', 'delayed', 'failed', 'retry', 'refund'],
    sections: [{ heading: 'Check the existing report', paragraphs: ['Open the report from your dashboard to see its current progress. A report taking longer than expected is shown as delayed, not automatically declared failed.', 'If it shows an actual failure, follow the recovery options on that report. Do not start a duplicate purchase or generation just to check its status.'] }, { heading: 'Ask for help', paragraphs: ['Contact support with the report link or reference, the approximate start time and the visible status. If payment is involved, check the account payment history and the published refund policy.', 'Older reports may not have processing details. Missing details alone do not prove a failure.'] }],
    action: { label: 'Open my existing reports', href: '/dashboard?tab=reports' }, related: ['existing-reports', 'troubleshooting'],
  },
];

export const helpCategories: HelpCategory[] = ['Birth details', 'Results', 'Account', 'Privacy'];
export function findHelpArticle(slug: string): HelpArticle | undefined { return helpArticles.find(article => article.slug === slug); }

export function searchHelpArticles(query: string, category?: HelpCategory): HelpArticle[] {
  const words = query.trim().toLocaleLowerCase('en').split(/\s+/).filter(Boolean);
  return helpArticles.filter(article => {
    if (category && article.category !== category) return false;
    const text = [article.title, article.summary, ...article.keywords, ...article.sections.flatMap(section => [section.heading, ...section.paragraphs, ...(section.steps ?? [])])].join(' ').toLocaleLowerCase('en');
    return words.every(word => text.includes(word));
  });
}
