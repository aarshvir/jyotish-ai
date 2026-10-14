'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Search, X } from 'lucide-react';
import { helpCategories, searchHelpArticles, type HelpCategory } from './articles';

export function HelpSearch({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<HelpCategory>();
  const results = searchHelpArticles(query, category);
  function reset() { setQuery(''); setCategory(undefined); document.getElementById('help-search')?.focus(); }
  return <div>
    <label htmlFor="help-search" className="mb-2 block text-sm font-medium text-star">Search help</label>
    <div className="relative mb-5">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-dust" />
      <input id="help-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Birth time, saved report, privacy..." autoComplete="off" maxLength={200} className="min-h-12 w-full rounded-lg border border-horizon bg-cosmos py-3 pl-11 pr-12 text-base text-star placeholder:text-dust focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber" />
      {query && <button type="button" title="Clear search" aria-label="Clear search" onClick={() => { setQuery(''); document.getElementById('help-search')?.focus(); }} className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center rounded-lg text-dust hover:text-star focus-visible:ring-2 focus-visible:ring-amber"><X aria-hidden="true" className="h-5 w-5" /></button>}
    </div>
    <div role="group" aria-label="Help topics" className="mb-6 flex flex-wrap gap-2">
      {(['All', ...helpCategories] as const).map(item => <button key={item} type="button" aria-pressed={item === (category ?? 'All')} onClick={() => setCategory(item === 'All' ? undefined : item)} className={`min-h-11 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-amber ${item === (category ?? 'All') ? 'border-amber bg-amber/10 text-star' : 'border-horizon text-dust hover:text-star'}`}>{item}</button>)}
    </div>
    <p role="status" aria-live="polite" aria-atomic="true" className="mb-3 text-sm text-dust">{results.length} {results.length === 1 ? 'article' : 'articles'}</p>
    {results.length ? <ul className="divide-y divide-horizon border-y border-horizon">
      {results.map(article => <li key={article.slug} id={article.slug} className="scroll-mt-6"><Link href={`/help/${article.slug}`} className="group flex items-start justify-between gap-4 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber">
        <div className="min-w-0"><p className="mb-1 text-xs text-dust">{article.category}</p><h2 className="text-lg font-semibold text-star group-hover:text-amber">{article.title}</h2><p className="mt-1 text-sm leading-relaxed text-dust">{article.summary}</p></div><ArrowRight aria-hidden="true" className="mt-6 h-5 w-5 shrink-0 text-dust" />
      </Link></li>)}
    </ul> : <div className="border-y border-horizon py-8"><h2 className="text-lg font-semibold text-star">No matching articles</h2><p className="mt-2 text-sm text-dust">Try &quot;birth time&quot;, &quot;report&quot; or &quot;privacy&quot;.</p><button type="button" onClick={reset} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm text-amber focus-visible:ring-2 focus-visible:ring-amber"><X aria-hidden="true" className="h-4 w-4" />Reset search</button></div>}
  </div>;
}
