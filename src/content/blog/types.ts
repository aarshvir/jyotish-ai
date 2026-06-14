export type BlogPost = {
  slug: string;
  title: string; // used as <title> and H1
  description: string; // meta description, <= 160 chars
  keywords: string[];
  date: string; // ISO date
  readingTimeMin: number;
  /** Body HTML: <h2>,<h3>,<p>,<ul><li>,<strong>,<a href="/...">. No <h1> (the page adds it). */
  html: string;
  faqs?: { q: string; a: string }[];
};
