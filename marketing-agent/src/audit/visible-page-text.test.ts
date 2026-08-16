import assert from 'node:assert/strict';
import { test } from 'node:test';
import { visiblePageText } from './preflight';

test('visiblePageText ignores footer jargon and meta, keeps the report main', () => {
  const html = `
    <html>
      <head><meta name="description" content="Swiss Ephemeris, Lahiri Ayanamsa, Vimshottari Dasha"></head>
      <body>
        <nav>Pricing</nav>
        <main id="main-content">Hourly windows — 18 precision slots. Strong 17:00.</main>
        <footer><a href="/dasha">Vimshottari Dasha</a></footer>
      </body>
    </html>
  `;
  const text = visiblePageText(html);
  assert.match(text, /Hourly windows/);
  assert.equal(/vimshottari|swiss ephemeris|lahiri/i.test(text), false);
});
