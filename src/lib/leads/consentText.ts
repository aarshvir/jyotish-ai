/**
 * The exact words shown next to the email field and the two tick boxes on "Save your chart",
 * in English and Hinglish (Roman-script Hindi). One source for the screen and for the consent
 * ledger: the server records THESE strings (looked up by purpose, language and notice
 * version), never text a browser claims it showed, so the ledger cannot be forged and
 * cannot drift from what people saw.
 *
 * Wording is from LEAD_CAPTURE_NURTURE_SPEC §3.3. It is not legal advice and has not had a
 * counsel read; changing a string means bumping NOTICE_VERSION so old grants keep the
 * words they were given under.
 */

export const NOTICE_VERSION = 'notice_v2';
export const PRIVACY_CONTACT = 'privacy@vedichour.com';

export type Purpose = 'service' | 'marketing';
export type ConsentLang = 'en' | 'hi';

const TEXT: Record<'notice' | Purpose, Record<ConsentLang, string>> = {
  /** Shown under the email field. States the purpose the address is given for. */
  notice: {
    en: `We use your email to send your chart link and keep it saved. Details are in our privacy notice. Questions or deletion: ${PRIVACY_CONTACT}.`,
    hi: `Aapki email se hum aapka chart link bhejenge aur use save rakhenge. Poori detail privacy notice mein hai. Sawal ya delete karwane ke liye: ${PRIVACY_CONTACT}.`,
  },
  /** Box 1, unticked: the chart link itself. */
  service: {
    en: 'Email my chart link to this address and keep my chart saved.',
    hi: 'Mere chart ka link is email par bhejein aur mera chart save rakhein.',
  },
  /**
   * Box 2, unticked: optional emails. It promises only what is true today: now and then, no
   * schedule (no email sequence exists). v1 said "about one email a week", so v2 replaces it.
   */
  marketing: {
    en: 'Also email me occasionally about my chart and new tools. I can unsubscribe in one tap.',
    hi: 'Mujhe kabhi-kabhi mere chart aur naye tools ke baare mein bhi email karein. Main ek tap mein unsubscribe kar sakta/sakti hoon.',
  },
};

export function consentText(kind: 'notice' | Purpose, lang: ConsentLang): string {
  return TEXT[kind][lang] ?? TEXT[kind].en;
}

/** Devanagari draft of the key notice paragraph, for the notice page (DPDP asks for an Eighth Schedule language on request). */
export const NOTICE_HINDI =
  'VedicHour आपका ईमेल, पहला नाम, जन्म की तारीख/समय/स्थान और क्विज़ के जवाब इन कामों के लिए लेता है: (1) आपका चार्ट बनाना और दिखाना, (2) चार्ट का लिंक भेजना और सेव रखना, (3) सिर्फ़ तब, जब आप हाँ कहें: आपके चार्ट और नए टूल्स के बारे में कभी-कभी ईमेल। आप कभी भी सहमति वापस ले सकते हैं: हर ईमेल में अनसब्सक्राइब लिंक, या ' +
  PRIVACY_CONTACT +
  ' पर लिखकर। अपना डेटा देखने, सुधारने या मिटाने के लिए भी इसी पते पर लिखें। शिकायत Data Protection Board of India को भी की जा सकती है।';
