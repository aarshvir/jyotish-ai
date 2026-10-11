export type BlogPost = {
  slug: string;
  /** H1 and the card title on /blog. May be longer than a search result title. */
  title: string;
  /**
   * Optional shorter title for the <title> tag and social cards. Google cuts search titles
   * at roughly 60 characters, so use this when `title` is long. Falls back to `title`.
   */
  seoTitle?: string;
  description: string; // meta description, <= 160 chars
  keywords: string[];
  date: string; // ISO date the article was first published
  /** ISO date of the last substantive edit. Set it whenever facts or advice change. */
  updated?: string;
  readingTimeMin: number;
  /** Body HTML: <h2>,<h3>,<p>,<ul><li>,<strong>,<a href="/...">. No <h1> (the page adds it). */
  html: string;
  faqs?: { q: string; a: string }[];
  /** Language of the article body. Defaults to English. */
  lang?: 'en' | 'hi';
  /** Slug of the same article in the other language. Emits hreflang links in both directions. */
  alternateSlug?: string;
  /** Classical texts or data sources the article relies on. Shown at the foot of the page. */
  sources?: string[];
};
