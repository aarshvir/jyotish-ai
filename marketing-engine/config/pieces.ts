/** House drafts. The lint gate accepts or rejects them. No LLM is required. */

export const ENGLISH_SCRIPT = `HR sent two slots: ten in the morning, and five in the evening.
Same Tuesday, same call, and a sun-sign line that treats them as one mood.
Your chart can score the hours.
VedicHour asks what is on your mind, then lays the next thirty days out as eighteen windows a day.
Clearer and heavier.
That is a planning aid.
It is not a promise that five o'clock gets you the role.
You pay for one month at the price on the page.
The card is not charged again by itself, because the payment provider does not keep a mandate.
Open VedicHour.com/start.`;

export const HINGLISH_SCRIPT = `HR ne do time bheje. Subah das baje, aur shaam paanch baje.
Same Tuesday hai, same call hai, par sun-sign wali line farq nahi karti.
Aapka chart un hours ko score kar sakta hai.
VedicHour pehle poochta hai dimaag pe kya hai, phir agle tees din ko din mein atharah khidki dikhata hai.
Clearer aur heavier.
Ye planning ke liye hai.
Ye vaada nahi hai ki shaam paanch baje role pakka mil jayegi.
Mahine ka paisa aap dete ho, page pe jo price likha hai.
Card apne aap dobara nahi katta.
VedicHour.com/start khol lo.`;

export const HINDI_SCRIPT = `एचआर ने दो समय भेजे। सुबह दस बजे, और शाम पाँच बजे।
वही मंगलवार है और वही कॉल है, पर सूर्य राशि की एक लाइन इनमें फ़र्क नहीं बताती।
आपकी कुंडली इन घंटों को अंक दे सकती है।
VedicHour पहले पूछता है कि मन पर क्या है, फिर अगले तीस दिन को दिन में अठारह खिड़कियों में रखता है।
किसी घंटे को हल्का कहना, किसी को भारी।
यह योजना के लिए है।
यह वादा नहीं कि शाम पाँच बजे नौकरी पक्की हो जाएगी।
महीने का शुल्क आप देते हैं, जितना पेज पर लिखा है।
कार्ड अपने आप दोबारा नहीं कटता।
VedicHour.com/start खोलें।`;

export const AD_VARIANTS = [
  {
    id: 'rejected-personal',
    ship: false,
    text: `Are you struggling with money and a job you hate?
Your chart says you will get the offer at five.
Start a free trial on VedicHour.`,
  },
  {
    id: 'two-slots',
    ship: true,
    text: `Two meeting times land on one Tuesday. Ten in the morning, or five in the evening.
A one-line horoscope cannot tell them apart.
VedicHour scores eighteen windows a day for the next thirty days, after a short quiz.
For planning, not a guarantee. You pay for the month. The card is not charged again on its own.
VedicHour.com/start`,
  },
  {
    id: 'what-it-is',
    ship: true,
    text: `Eighteen scored windows in a day. Thirty days on the calendar.
VedicHour is a subscription for people who want a timing grid, not a sun-sign sentence.
The quiz starts at VedicHour.com/start. Monthly is the price on that page.
Nothing here promises a job, a wedding, or a cure.`,
  },
];

export const CAROUSEL = [
  { title: 'HR sent two times', body: '10:00 in the morning. 17:00 the same Tuesday.' },
  { title: 'Same call', body: 'A sun-sign line still has one mood for the whole day.' },
  { title: 'The chart can split it', body: 'Eighteen windows. Each one scored. Not a yes or a no.' },
  { title: 'Clearer is not an offer', body: 'A heavier hour is a reason to look twice. It is not a verdict.' },
  { title: 'What you actually get', body: 'A quiz, then thirty days of those windows. Written around the concern you picked.' },
  { title: 'How you pay', body: 'One month at the price on the page. The provider does not keep a card mandate, so it does not charge you again by itself.' },
  { title: 'Open it', body: 'VedicHour.com/start' },
];

export const CAPTION = `HR sent 10:00 and 17:00. Same Tuesday.

A daily horoscope still speaks in one mood. VedicHour scores eighteen windows a day, for thirty days, after a short quiz.

Planning aid. Not a promise that five o'clock gets you the role. You pay for the month. It does not charge the card again on its own.

VedicHour.com/start`;

export const BLOG_HTML = `<p>HR sent two times for the same call. Ten in the morning. Five in the evening. Same Tuesday. The calendar treats them as twins. Most daily horoscopes do too, because they only had one sentence to give the whole day.</p>
<h2>A day is not one mood</h2>
<p>I have sat in that thread. Someone forwards a slot, you hesitate, and a horoscope app offers a paragraph that could have been written on Monday. It is not useless because astrology is empty. It is useless because it refused to look inside the day.</p>
<p>Jyotish already has a smaller unit than the day. Planetary hours, horas, cut the daylight and the night into stretches with a ruling planet. VedicHour turns the next thirty days into eighteen scored windows a day. Clearer and heavier. That score is a reflection of the chart you were born with and the concern you named in the quiz. It is not a receipt for the outcome you want.</p>
<h2>What I would not do with two slots</h2>
<p>I would not ask the grid to pick the job for me. If five in the evening scores heavier, that is a reason to check my own energy, the other person's, and whether I am walking into a hard conversation already tired. If ten in the morning scores clearer, I still have to know the brief. A number from 0 to 100 does not attend the meeting.</p>
<p>I would also not trust a line that says "best hour" as if the rest of the day were cursed. The product marks windows so you can see the contrast. The honest use is comparison, not superstition.</p>
<h2>What the product will and will not charge</h2>
<p>Free calculators on the site give you chart facts with no account and no card. The timing grid is the subscription. You answer the quiz at <a href="/start">/start</a>, then you pay for a month or a year at the price on the page. Monthly is $41.99, or ₹3,999. Ziina, the payment provider, does not store a card mandate, so a second month does not charge itself. You choose to pay again. There is no card-required free trial, because that flow does not exist.</p>
<p>If you only wanted the birth-chart facts, start at the <a href="/free-kundli">free kundli calculator</a> and stop there. The subscription is for the person who wants the thirty-day grid and is willing to pay for the period up front.</p>
<h2>A way to use Tuesday</h2>
<ul>
<li>Write down the two times and what the call is actually for.</li>
<li>Read the eighteen windows for that date as a contrast, not a command.</li>
<li>Keep the decision. The chart does not sign the offer letter.</li>
</ul>
<p>For reflection and planning, not certainty.</p>`;

export const BLOG_TITLE = 'Two meeting times, one Tuesday';
export const BLOG_DESCRIPTION = 'How to read two slots on the same day with a timing grid, without treating a score as a job offer. What VedicHour charges, and what it does not.';

export const EMAILS = [
  {
    id: 'e1',
    subject: 'Two times. One Tuesday.',
    body: `HR sent 10:00 and 17:00 for the same call.

A daily line cannot tell those apart. VedicHour scores eighteen windows across each of the next thirty days, after a short quiz.

It is a planning grid. It will not promise you the role. You pay for the month at the price on the page. The card is not charged again by itself.

https://www.vedichour.com/start

For reflection and planning, not certainty.`,
  },
  {
    id: 'e2',
    subject: 'What the free calculators leave out',
    body: `The free kundli calculator gives chart facts. No account. No card.

The subscription is the other thing: thirty days of eighteen scored windows, written around the concern you picked in the quiz. Monthly is ₹3,999 or $41.99. You pay that period. Nothing renews on its own.

https://www.vedichour.com/free-kundli
https://www.vedichour.com/start`,
  },
  {
    id: 'e3',
    subject: 'If you have not opened the grid',
    body: `No guilt. If two meeting times are not your problem this month, leave it.

If they are, the quiz is still at VedicHour.com/start. Eighteen windows a day. Thirty days. A score, not a guarantee.

For reflection and planning, not certainty.`,
  },
];
