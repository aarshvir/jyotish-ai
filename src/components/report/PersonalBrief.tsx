import type { ForecastBrief, EventView } from '@/lib/personalization/forecastView';
import { longDate } from '@/lib/personalization/selections';

/**
 * The top of a paid forecast, written for the person reading it: their own selections quoted back,
 * how the report was arranged because of them, a plain caution about their birth time when it
 * matters, and a card for the date they told us about. Deterministic (no request, no model), so it
 * is also what an ad screenshot of the report shows.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function short(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

function EventCard({ ev }: { ev: EventView }) {
  const shell = 'mt-5 rounded-card border border-amber/30 bg-amber/[0.05] p-4';
  const label = 'font-body text-body-sm font-medium text-amber';
  const text = 'font-body text-body-md text-dust-light leading-relaxed';

  if (ev.kind === 'in_window') {
    return (
      <div className={shell} data-testid="event-card">
        <p className={label}>Around your date: {ev.text}</p>
        <p className={`mt-2 ${text}`}>
          {longDate(ev.date)} scores <span className="font-medium text-star">{ev.score}</span> ({ev.word}). Your strongest hours that day are{' '}
          <span className="font-medium text-star">{ev.bestHours.join(', ') || 'none clear of Rahu Kaal'}</span>
          {ev.rahuKaal ? `; keep ${ev.rahuKaal} (Rahu Kaal) for routine tasks.` : '.'}
        </p>
        {ev.prepDay && (
          <p className={`mt-2 ${text}`}>
            For preparing, your strongest day in the week before is {short(ev.prepDay.date)} ({ev.prepDay.score}
            {ev.prepDay.hours.length ? `, best at ${ev.prepDay.hours.join(' and ')}` : ''}).
          </p>
        )}
        {ev.around.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="The days around your date">
            {ev.around.map((d) => (
              <li key={d.date} className="rounded-pill border border-horizon/40 bg-bg-3/60 px-3 py-1 font-body text-body-sm text-dust">
                {short(d.date)}: {d.score} ({d.word})
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  if (ev.kind === 'beyond') {
    return (
      <div className={shell} data-testid="event-card">
        <p className={label}>Your date: {ev.text}</p>
        <p className={`mt-2 ${text}`}>
          {longDate(ev.date)} is beyond the 30 days in this forecast.
          {ev.month ? ` Its month, ${ev.month}, scores ${ev.monthScore ?? '–'}${ev.theme ? `: ${ev.theme}` : ''}.` : ''} Renew when it gets closer and its days will be scored hour by hour.
        </p>
      </div>
    );
  }
  if (ev.kind === 'past') {
    return (
      <div className={shell} data-testid="event-card">
        <p className={label}>Your date: {ev.text}</p>
        <p className={`mt-2 ${text}`}>{longDate(ev.date)} falls before this forecast starts, so it is not scored here.</p>
      </div>
    );
  }
  return (
    <div className={shell} data-testid="event-card">
      <p className={label}>{ev.text ? `Your decision: ${ev.text}` : 'Your decision, soon'}</p>
      <p className={`mt-2 ${text}`}>You did not give an exact date, so here are the three strongest days in this forecast to pick from:</p>
      <ul className="mt-3 space-y-1">
        {ev.best.map((d) => (
          <li key={d.date} className={text}>
            <span className="font-medium text-star">{short(d.date)}</span>: {d.score} ({d.word})
            {d.hours.length ? `, best at ${d.hours.join(', ')}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PersonalBrief({ brief }: { brief: ForecastBrief }) {
  return (
    <section aria-labelledby="personal-brief" className="mb-6 rounded-card border border-horizon/40 bg-cosmos p-5 sm:p-6" data-testid="personal-brief">
      <h2 id="personal-brief" className="font-display text-headline-sm text-star">
        {brief.heading}
      </h2>
      {brief.selections.length > 0 && (
        <dl className="mt-3 space-y-1.5">
          {brief.selections.map((s, i) => (
            <div key={i} className="font-body text-body-md text-dust">
              <dt className="inline">{s.topic}: </dt>
              <dd className="inline font-medium text-star">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {brief.arrangement.length > 0 && (
        <>
          <h3 className="mt-4 font-body text-body-md font-medium text-star">How this report is arranged for you</h3>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 font-body text-body-md text-dust">
            {brief.arrangement.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </>
      )}
      {brief.timeNote && (
        <p className="mt-4 rounded-card border border-caution/30 bg-caution/10 px-4 py-3 font-body text-body-md text-dust-light" role="note">
          {brief.timeNote}
        </p>
      )}
      {brief.event && <EventCard ev={brief.event} />}
    </section>
  );
}

/** One line under a section's title saying which answer put the section here. */
export function WhyHere({ text }: { text: string }) {
  if (!text) return null;
  return (
    <p className="mb-2 font-body text-body-sm italic leading-relaxed text-dust/80" data-testid="why-here">
      <span className="font-medium not-italic text-dust">Why this is in your report: </span>
      {text}
    </p>
  );
}
