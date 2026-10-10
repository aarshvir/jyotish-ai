/** House drafts. The lint gate accepts or rejects them. No LLM is required. */

export { ENGLISH_SCRIPT } from './beats';

export const HINGLISH_SCRIPT = `Ek asli chart dikhata hoon. Cancer rising. Moon Scorpio mein hai.
Sample day Monday hai, Bangalore. Din ka score 70 hai.
Do window. Subah 9 se 10, aur shaam 5 se 6.
Subah wala score 94 hai. Clearer window.
Noon ka score 49 hai. Same Monday, heavier.
Shaam 5 se 6 ka score 98 hai. Is chart pe sabse strong stretch.
Din mein atharah khidki. Clearer aur heavier.
Quiz pehle poochta hai, dimaag pe kya hai. Work and money.
Phir job change wala sawal.
Paid grid agle 30 din ki planning hai, aur ye vaada nahi ki shaam wali window aapko role dila degi.
Mahine ka paisa aap dete ho, $41.99 ya ₹3,999, aur card apne aap nahi katta.
VedicHour.com/start khol lo.`;

export const HINDI_SCRIPT = `यह एक असली कुंडली है। कर्क लग्न। चंद्रमा वृश्चिक में।
नमूना दिन सोमवार है, बेंगलुरु। दिन का अंक 70 है।
दो खिड़कियाँ हैं। सुबह 9 से 10, और शाम 5 से 6।
सुबह 9 से 10 का अंक 94 है।
दोपहर का अंक 49 है। वही सोमवार, भारी घंटा।
शाम 5 से 6 का अंक 98 है। इस चार्ट पर दिन का सबसे सशक्त पड़ाव।
एक दिन में अठारह खिड़कियाँ।
प्रश्न पूछता है कि मन पर क्या है। काम और पैसा।
फिर नौकरी बदलने वाला सवाल।
अगले 30 दिन की योजना है। यह वादा नहीं कि यह घंटा नौकरी दिला देगा।
महीने का शुल्क $41.99 या ₹3,999 है। कार्ड अपने आप दोबारा नहीं कटता।
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
    text: `A public sample Monday in Bangalore scores the day at 70.
9 to 10 in the morning is 94. 5 to 6 in the evening is 98. Noon is 49.
Eighteen windows in the day. The paid grid is 30 days, after a short quiz.
For planning, not a guarantee. You pay for the month. The card is not charged again on its own.
VedicHour.com/start`,
  },
  {
    id: 'what-it-is',
    ship: true,
    text: `Eighteen scored windows in a day. The public sample is a Monday in Bangalore: 9 to 10 is 94, and 5 to 6 is 98.
VedicHour is a subscription for a timing grid, not a sun-sign sentence.
The quiz starts at VedicHour.com/start. Monthly is $41.99 or ₹3,999.
Nothing here promises a job, a wedding, or a cure.`,
  },
];

export const CAROUSEL = [
  { title: 'A real Monday', body: 'Bangalore. The public sample scores this day at 70. Cancer rising. Moon in Scorpio.' },
  { title: 'Two windows', body: '9 to 10 in the morning, and 5 to 6 in the evening. The page names both.' },
  { title: '94 in the morning', body: "9 to 10 is the morning's clearer window on this chart." },
  { title: '49 at noon', body: 'Same Monday. Heavier than the morning. The day is not one mood.' },
  { title: '98 in the evening', body: "5 to 6 is the day's strongest stretch on this sample. A score, not an offer letter." },
  { title: 'What you pay', body: 'One month. $41.99 or ₹3,999. The card is not charged again by itself. The paid grid is 30 days of eighteen windows.' },
  { title: 'Open it', body: 'VedicHour.com/start' },
];

export const CAPTION = `Monday in Bangalore. A real sample, day score 70.

9 to 10 scores 94. 5 to 6 scores 98. Noon scores 49. Eighteen windows, not one mood for the whole day.

The quiz asks what is weighing on you. The paid grid is 30 days. Not a promise the evening window gets you the role.

One month is $41.99 or ₹3,999. The card is not charged again by itself.

VedicHour.com/start`;

export const BLOG_HTML = `<p>The public sample on VedicHour is not a slogan. It is one fixed chart. Cancer rising. Moon in Scorpio. The day on the page is Monday, in Bangalore, and the day scores 70.</p>
<h2>The day still splits</h2>
<p>A sun-sign line would give that Monday one mood. The sample does not. It names two windows: 9 to 10 in the morning, and 5 to 6 in the evening. 9 to 10 scores 94. That is the morning's clearer window. 5 to 6 scores 98, the day's strongest stretch on this chart. Noon, on that same Monday, scores 49. Heavier. I can read those three numbers without asking the grid to attend the meeting for me.</p>
<h2>What I would not do with them</h2>
<p>I would not treat 98 as an offer letter. If the evening window is the strongest stretch, that is a reason to notice my own energy and the other person's, not a reason to skip preparing. If the morning is clearer, I still have to know the brief. Eighteen windows in the day are a contrast. They are not a command.</p>
<p>The honest use is comparison. A score from 0 to 100 does not sign anything.</p>
<h2>What the product will and will not charge</h2>
<p>Free calculators on the site give chart facts with no account and no card. The timing grid is the subscription. You answer the quiz at <a href="/start">/start</a>, then you pay for a month or a year at the price on the page. Monthly is $41.99, or ₹3,999. The paid grid is the next 30 days. Ziina, the payment provider, does not store a card mandate, so a second month does not charge itself. You choose to pay again. There is no unpaid first month, because that flow does not exist.</p>
<p>If you only wanted the birth-chart facts, start at the <a href="/free-kundli">free kundli calculator</a> and stop there.</p>
<h2>A way to read the sample</h2>
<ul>
<li>Look at Monday in Bangalore and find the morning window, then noon, then the evening.</li>
<li>Read 94 beside 49, then 98, as a contrast inside one day.</li>
<li>Keep the decision. The chart does not sign the offer letter.</li>
</ul>
<p>For reflection and planning, not certainty.</p>`;

export const BLOG_TITLE = 'Two windows on a sample Monday';
export const BLOG_DESCRIPTION = 'The public sample is a Monday in Bangalore. 9 to 10 scores 94, 5 to 6 scores 98, and noon scores 49. How to read that without treating a score as a job offer.';

export const EMAILS = [
  {
    id: 'e1',
    subject: '9 to 10, or 5 to 6',
    body: `The public sample is a Monday in Bangalore, and the day scores 70 even though the hours inside it do not share one mood.

9 to 10 scores 94. Noon scores 49. 5 to 6 scores 98.

Eighteen windows sit inside that single day, which is the whole point of opening the sample before you pay.

It is a planning grid. It will not promise you the role. You pay for the month. Monthly is $41.99 or ₹3,999. The card is not charged again by itself.

https://www.vedichour.com/start

For reflection and planning, not certainty.`,
  },
  {
    id: 'e2',
    subject: 'What the free calculators leave out',
    body: `The free kundli calculator gives chart facts. No account. No card.

The subscription is the other thing: 30 days of eighteen scored windows, written around the concern you picked in the quiz. Monthly is ₹3,999 or $41.99. You pay that period. Nothing renews on its own.

https://www.vedichour.com/free-kundli
https://www.vedichour.com/start`,
  },
  {
    id: 'e3',
    subject: 'If the grid is not your problem this month',
    body: `No guilt. If two meeting times are not on your calendar, leave it.

If they are, the quiz is at VedicHour.com/start. The sample Monday is there too: 94 in the morning, 49 at noon, 98 in the evening. A score, not a guarantee.

For reflection and planning, not certainty.`,
  },
];
