import { BRAND } from '../brand';
import { lintMany, type VoiceLint } from '../policy/voice';

export interface IdeaRow {
  id: number;
  slug: string;
  title: string;
  angle: string;
  category: string;
  score: number;
}

export interface ScriptBody {
  hook: string;
  lines: string[];
  cta: string;
  duration_sec: number;
}

export interface CarouselSlide {
  kicker: string;
  headline: string;
  body: string;
}

export interface AdVariant {
  name: string;
  primary: string;
  headline: string;
  description: string;
}

export interface CopyPack {
  script_en: ScriptBody;
  script_hi: ScriptBody;
  script_hinglish: ScriptBody;
  carousel: CarouselSlide[];
  blog: { slug: string; title: string; description: string; html: string; faqs: { q: string; a: string }[] };
  ads: AdVariant[];
}

function scriptText(s: ScriptBody): string {
  return [s.hook, ...s.lines, s.cta].join(' ');
}

export function lintPack(pack: CopyPack): VoiceLint {
  return lintMany([
    { label: 'script_en', text: scriptText(pack.script_en), context: 'ad', language: 'en' },
    { label: 'script_hi', text: scriptText(pack.script_hi), context: 'ad', language: 'hi' },
    { label: 'script_hinglish', text: scriptText(pack.script_hinglish), context: 'ad', language: 'hinglish' },
    { label: 'carousel', text: pack.carousel.map((s) => `${s.headline} ${s.body}`).join('\n'), context: 'organic' },
    { label: 'blog', text: pack.blog.html.replace(/<[^>]+>/g, ' '), context: 'organic' },
    { label: 'ads', text: pack.ads.map((a) => `${a.primary} ${a.headline} ${a.description}`).join('\n'), context: 'ad' },
  ]);
}

/** Human-written fallbacks so a dead LLM cannot stall Loop 2. Logged as fallback, never silently. */
export function fallbackPack(idea: IdeaRow): CopyPack {
  const packs: Record<string, () => CopyPack> = {
    career: careerPack,
    family_parents: papaPack,
    timing_basics: rahuPack,
    marriage: vivahPack,
    money_property: leasePack,
    product: hindiPack,
  };
  const fn = packs[idea.category] ?? rahuPack;
  const pack = fn();
  pack.blog.slug = `engine-${idea.slug}`;
  pack.blog.title = idea.title;
  return pack;
}

function careerPack(): CopyPack {
  return {
    script_en: {
      hook: 'HR mailed at 9:47. I replied at 4:10. Same mail.',
      lines: [
        'The text did not change. The hour did.',
        'VedicHour rates the eighteen hours of your actual Tuesday against your own chart, on your city clock.',
        'Not a sun-sign mood for everyone born that week. A grid.',
        '9 was heavy. 4 to 5 was clearer. I waited.',
      ],
      cta: 'VedicHour. For reflection, not certainty.',
      duration_sec: 34,
    },
    script_hi: {
      hook: 'HR ने 9:47 पे mail डाला। मैंने 4:10 पे reply किया।',
      lines: [
        'शब्द वही थे। घड़ी अलग थी।',
        'VedicHour आपके जन्म के हिसाब से मंगलवार के अठारह घंटे तौलता है। आपके शहर की घड़ी पर।',
        'पूरे भारत का एक सा राशिफल नहीं।',
        'नौ भारी था। चार से पाँच साफ़ था। मैंने इंतज़ार किया।',
      ],
      cta: 'VedicHour। सोचने के लिए, पक्का वादा नहीं।',
      duration_sec: 36,
    },
    script_hinglish: {
      hook: 'HR ka mail 9:47 pe aaya. Reply 4:10 pe gaya. Same mail.',
      lines: [
        'Text nahi badla. Hour badla.',
        'VedicHour tere actual Tuesday ke 18 hours ko teri chart se tolta hai, teri city ki clock pe.',
        'Sun-sign mood nahi. Ek grid.',
        '9 baje bhaari tha. 4 se 5 saaf. Maine wait kiya.',
      ],
      cta: 'VedicHour. Sochne ke liye. Koi pakka nahi.',
      duration_sec: 33,
    },
    carousel: [
      { kicker: 'Work', headline: 'HR mailed at 9:47', body: 'You will stare at it until lunch. That is not a personality flaw. It is an hour.' },
      { kicker: 'The mistake', headline: 'People pick the month they resign', body: 'Almost nobody picks the hour the mail actually leaves.' },
      { kicker: 'What the grid is', headline: 'Eighteen windows. One Tuesday.', body: 'Each hour scored against your chart, in your city. Not a shared Mumbai panchang.' },
      { kicker: 'Language', headline: 'Clearer. Heavier. That is all.', body: 'We do not say lucky. We do not say this hour will get you the raise.' },
      { kicker: 'A real Tuesday', headline: '9 was heavy. 4 to 5 was clearer.', body: 'I waited. The mail was the same. I was not.' },
      { kicker: 'Not a horoscope', headline: 'Your day is not one mood', body: 'Sun-sign columns flatten 24 hours into a sentence. That is why they feel fake by 11am.' },
      { kicker: 'Honest limit', headline: 'Reflection, not certainty', body: 'A good window does not write the outcome. It just stops you fighting a current you can see.' },
      { kicker: 'VedicHour', headline: 'vedichour.com', body: BRAND.disclaimer },
    ],
    blog: {
      slug: 'engine-hr-mail',
      title: 'Why the hour you send the mail changes how it lands',
      description: 'A practical look at Vedic hourly timing for work messages — without promising the raise.',
      html: `<p>HR sent the mail at 9:47. I read it on the metro and wrote a reply I did not send. I sent it at 4:10. Same sentences. Different hour. I am not going to pretend that one send "got me the outcome". I am saying the 9 o'clock version of me was sharper and worse, and I could feel it.</p>
<p>Most "career muhurat" articles on the internet will sell you a date. Resign on a Thursday. Join on a waxing moon. Fine. You still have to pick an hour on that Thursday, and that is the part the date-pickers skip because they do not have a grid.</p>
<h2>What an hour grid actually is</h2>
<p>VedicHour rates eighteen windows from 6am to midnight against your own birth chart, in the city you are standing in. The score is a reading aid. It is not a verdict on your character and it is not a promise that the mail works. If a window comes in heavy, you can still send. You just know you are doing it on a noisy line.</p>
<h2>What this is not</h2>
<p>It is not a sun-sign column. It is not Rahu Kaal copied from a temple WhatsApp. It is not medical, legal, or financial advice. ${BRAND.disclaimer}</p>
<h2>A way to use it on a workday</h2>
<p>Open the day. Find the two clearer windows. Put the conversation that needs blood in one of them. Put the admin in a heavier one, because admin does not care. If nothing is clear, wait until tomorrow rather than invent urgency. That last sentence has saved me more than any "auspicious date" ever did.</p>
<p>See a full sample day, hour by hour, at <a href="/sample-report">the sample report</a>. Your own chart is free to start.</p>`,
      faqs: [
        { q: 'Does sending at 4pm guarantee a better reply?', a: 'No. The grid is for reflection. It cannot write HR\'s answer.' },
        { q: 'Is this the same as Rahu Kaal?', a: 'Rahu Kaal is one public slice of the day. The grid is eighteen personal windows.' },
      ],
    },
    ads: [
      {
        name: 'meta-story',
        primary:
          'HR mailed at 9:47. I replied at 4:10. Same mail. Different hour. VedicHour rates your actual Tuesday: 18 windows, your chart, your city clock. For reflection, not certainty.',
        headline: 'Your day is not one mood',
        description: 'A personal timing grid written in plain language. No luck talk.',
      },
      {
        name: 'meta-product',
        primary:
          'Eighteen hours. Each one scored against your own chart in your city. Not a sun-sign sentence copied for the whole country. Tuesday 4pm is not Tuesday 9am.',
        headline: 'See a sample day',
        description: BRAND.disclaimer,
      },
      {
        name: 'google-rsa',
        primary:
          'Hour-by-hour Vedic timing for the mail you keep rehearsing on the metro. We do not promise the reply. We name the window.',
        headline: '18 hours. Your chart.',
        description: 'Sample report on vedichour.com — reflection, not certainty.',
      },
    ],
  };
}

function papaPack(): CopyPack {
  const base = careerPack();
  base.script_en = {
    hook: 'Papa is on the balcony at 7:40 with tea. I have a sentence in my notes app.',
    lines: [
      'I have rewritten it four times since Tuesday.',
      'The sentence is not the problem. The hour I walk out there is.',
      'VedicHour does not tell him for me. It just marks 7am heavy and 9pm clearer on my own chart.',
      'I waited for the later window. He still might say no. At least I was not shaking the first cup of tea.',
    ],
    cta: 'VedicHour. A grid. Not a script for your father.',
    duration_sec: 38,
  };
  base.script_hi = {
    hook: 'पापा 7:40 पे बालकनी में चाय लेकर बैठे हैं। वाक्य नोट्स में पड़ा है।',
    lines: [
      'मंगलवार से चार बार लिख चुका हूँ।',
      'वाक्य मुश्किल नहीं। समय मुश्किल है।',
      'VedicHour पापा से बात नहीं करता। मेरी कुंडली पर सुबह भारी है, रात साफ़।',
      'मैंने बाद वाला समय पकड़ा। ना भी बोल सकते हैं। कम से कम पहली चाय नहीं हिली।',
    ],
    cta: 'VedicHour। ग्रिड है। पिताजी के लिए स्क्रिप्ट नहीं।',
    duration_sec: 38,
  };
  base.script_hinglish = {
    hook: 'Papa balcony pe 7:40. Chai. Mere notes mein ek line hai.',
    lines: [
      'Mangalvaar se chaar baar rewrite kar chuka.',
      'Line mushkil nahi hai. Hour hai.',
      'VedicHour papa se baat nahi karega. Meri chart pe subah bhaari hai, 9 baje saaf.',
      'Main wait kiya. Wo na bhi bol sakte hain. Kam se kam pehli chai nahi kaanpi.',
    ],
    cta: 'VedicHour. Grid. Father ke liye script nahi.',
    duration_sec: 36,
  };
  return base;
}

function rahuPack(): CopyPack {
  const base = careerPack();
  base.script_en = {
    hook: 'Rahu Kaal is 90 minutes. India treats it like the whole day died.',
    lines: [
      'Your Tuesday still has sixteen other hours.',
      'VedicHour rates all eighteen against your chart, on your city clock — including the ones WhatsApp never forwards.',
      'I still skip Rahu Kaal for new starts. I also skip pretending 4pm is the same as 9am.',
    ],
    cta: 'VedicHour. The rest of the day, named.',
    duration_sec: 32,
  };
  base.script_hi = {
    hook: 'राहु काल डेढ़ घंटे का होता है। लोग पूरा दिन मरा समझ लेते हैं।',
    lines: [
      'मंगलवार में और सोलह घंटे हैं।',
      'VedicHour अठारह घंटे आपकी कुंडली से तौलता है — वो भी जो व्हाट्सऐप पर नहीं आते।',
      'राहु काल मैं भी छोड़ता हूँ। चार बजे को नौ बजे का जुड़वा नहीं मानता।',
    ],
    cta: 'VedicHour। बाकी दिन का नाम।',
    duration_sec: 32,
  };
  base.script_hinglish = {
    hook: 'Rahu Kaal 90 minutes ka hota hai. Log poora din dead maan lete hain.',
    lines: [
      'Tuesday mein aur solah hours hain.',
      'VedicHour un unnees ke aatharah ko teri chart se tolta hai, WhatsApp wale ko chhod ke bhi.',
      'Rahu Kaal main bhi skip karta hoon. 4pm ko 9am ka twin nahi samajhta.',
    ],
    cta: 'VedicHour. Baaki din ka naam.',
    duration_sec: 30,
  };
  return base;
}

function vivahPack(): CopyPack {
  const base = careerPack();
  base.script_en = {
    hook: 'The pandit gave us a wedding date in February. Then we still had to live every Tuesday until then.',
    lines: [
      'A muhurat is a door. The year is a corridor.',
      'VedicHour is for the corridor — the 4pm call to her father, the lease, the quiet hour you should not pick a fight.',
      'I am not selling you a perfect marriage. I am selling you a clock you can read.',
    ],
    cta: 'VedicHour. Dates are easy. Hours are the work.',
    duration_sec: 36,
  };
  base.script_hi = {
    hook: 'पंडित ने फरवरी की तारीख दी। फिर हर मंगलवार जीना बाकी था।',
    lines: [
      'मुहूर्त दरवाज़ा है। साल गलियारा है।',
      'VedicHour गलियारे के लिए है — चार बजे का फोन, मकान का कागज़, वो घंटा जिसमें लड़ाई मत छेड़ो।',
      'मैं शादी का वादा नहीं कर रहा। घड़ी पढ़ना सिखा रहा हूँ।',
    ],
    cta: 'VedicHour। तारीख आसान है। घंटे काम हैं।',
    duration_sec: 36,
  };
  base.script_hinglish = {
    hook: 'Pandit ne February ki date di. Phir har Tuesday jeena baaki tha.',
    lines: [
      'Muhurat darwaza hai. Saal corridor hai.',
      'VedicHour corridor ke liye hai — 4pm ka call, lease, wo hour jisme ladai mat chedo.',
      'Main shaadi ka waada nahi kar raha. Clock padhna sikha raha hoon.',
    ],
    cta: 'VedicHour. Date aasan hai. Hours kaam hain.',
    duration_sec: 34,
  };
  return base;
}

function leasePack(): CopyPack {
  const base = careerPack();
  base.script_en = {
    hook: 'The broker said the owner is free at 11. The grid said wait till 4.',
    lines: [
      'I told him 4. He rolled his eyes. We still signed.',
      'Nothing magical happened at 4. I just was not bargaining on an empty stomach in a noisy window.',
      'VedicHour does not bless flats. It rates the hour you sit at the table.',
    ],
    cta: 'VedicHour. A clock for the afternoon you already have.',
    duration_sec: 32,
  };
  base.script_hi = {
    hook: 'ब्रोकर ने कहा मालिक ग्यारह बजे फ़्री है। ग्रिड ने कहा चार का इंतज़ार करो।',
    lines: [
      'मैंने चार बोला। उन्होंने आँखें घुमाईं। दस्तखत हुए।',
      'चार बजे जादू नहीं हुआ। भूखे पेट शोर वाले घंटे में मोलभाव नहीं किया।',
      'VedicHour फ्लैट को आशीर्वाद नहीं देता। मेज़ वाले घंटे को तौलता है।',
    ],
    cta: 'VedicHour। जो दोपहर पहले से है, उसकी घड़ी।',
    duration_sec: 34,
  };
  base.script_hinglish = {
    hook: 'Broker bola owner 11 pe free hai. Grid boli 4 tak wait kar.',
    lines: [
      'Maine 4 kaha. Aankh ghumayi usne. Sign ho gaya.',
      '4 pe jaadu nahi hua. Khali pet, noisy window mein bargain nahi kiya.',
      'VedicHour flat ko bless nahi karta. Table wale hour ko tolta hai.',
    ],
    cta: 'VedicHour. Jo dopahar pehle se hai, uski clock.',
    duration_sec: 32,
  };
  return base;
}

function hindiPack(): CopyPack {
  const base = careerPack();
  base.script_en = {
    hook: 'If the app only speaks textbook Sanskrit at me, I close it.',
    lines: [
      'I am 34. I want to know whether 4pm is clearer than 9. I do not want a lecture on a library name.',
      'VedicHour writes the hours in the language I actually talk — English, Hindi, the mix.',
      'The math is still the old math. The sentence is not trying to impress my grandfather\'s priest.',
    ],
    cta: 'VedicHour. Plain language. Eighteen hours.',
    duration_sec: 32,
  };
  base.script_hi = {
    hook: 'ऐप संस्कृत का भाषण दे तो मैं बंद कर देता हूँ।',
    lines: [
      'मैं 34 का हूँ। मुझे यह चाहिए कि चार साफ़ है या नौ। लाइब्रेरी का नाम नहीं।',
      'VedicHour घंटे उसी भाषा में लिखता है जिसमें मैं बात करता हूँ।',
      'गणित पुराना है। वाक्य दादा के पुजारी को impress नहीं कर रहा।',
    ],
    cta: 'VedicHour। सादी भाषा। अठारह घंटे।',
    duration_sec: 32,
  };
  base.script_hinglish = {
    hook: 'Agar app textbook Sanskrit mein lecture de, main band kar deta hoon.',
    lines: [
      'Main 34 ka hoon. Mujhe chahiye 4pm saaf hai ya 9. Library ka naam nahi.',
      'VedicHour hours usi language mein likhta hai jisme main baat karta hoon.',
      'Math purana hai. Sentence dada ke pandit ko impress nahi kar raha.',
    ],
    cta: 'VedicHour. Seedhi bhasha. Atharah hours.',
    duration_sec: 30,
  };
  return base;
}
