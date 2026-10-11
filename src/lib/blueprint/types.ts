/**
 * The Karmic Blueprint document (VEDICHOUR_QUIZ_SPEC §6): what is stored in
 * `reports.report_data` and rendered at /report/{id}.
 *
 * Every paragraph says what kind of claim it is, in the four categories the benchmark
 * methodology uses, so the reader can tell a calculation from a tradition from a hunch:
 *  - fact            a calculated position, date or boundary
 *  - interpretation  what Jyotish traditionally reads from that fact
 *  - hypothesis      how it might show up in THIS person's life, given what they told us
 *  - advice          an ordinary, practical step that stands on its own merits
 *  - limit           what this report cannot tell you
 */

import type { Sign } from '@/lib/funnel/reveal/astro';

export type ClaimKind = 'fact' | 'interpretation' | 'hypothesis' | 'advice' | 'limit';

export interface BlueprintParagraph {
  text: string;
  kind: ClaimKind;
  /** Chart facts or answers this paragraph rests on. Hidden from readers; used for QA (spec §6). */
  source_keys: string[];
}

export type SectionId =
  | 'brief'
  | 'snapshot'
  | 'ketu'
  | 'rahu'
  | 'axis'
  | 'fifth_ninth'
  | 'dasha'
  | 'debt'
  | 'windows'
  | 'focus'
  | 'event'
  | 'partner'
  | 'thirty'
  | 'limits';

export interface BlueprintTable {
  caption?: string;
  head: string[];
  rows: string[][];
}

export type WindowKind = 'ingress' | 'touch' | 'eclipse_season';

export interface NodalWindow {
  id: string;
  kind: WindowKind;
  /** ISO dates, inclusive. */
  start: string;
  end: string;
  /** Exact-contact date inside the window, when the window is built around one. */
  peak: string | null;
  title: string;
  /** A calculated statement of what is happening in the sky. */
  fact: string;
  /** Houses of the Rahu–Ketu axis during the window, counted from the reference sign. */
  rahuHouse: number;
  ketuHouse: number;
  /** Natal point the nodes touch, when kind is "touch". */
  natal: string | null;
  /** 0–100: how sensitive; used only to choose which windows to show. */
  weight: number;
  /** True when the window falls on a house the reader said matters to them. */
  onFocusHouse: boolean;
  source_keys: string[];
}

export interface BlueprintSection {
  id: SectionId;
  title: string;
  /** "Why this is in your report": the answer or chart fact that put this section here. */
  why: string;
  paragraphs: BlueprintParagraph[];
  table?: BlueprintTable;
  windows?: NodalWindow[];
  /** True when the narrative failed the banned-content lint after retries and a plain fallback is shown. */
  flagged?: boolean;
}

export interface BlueprintBrief {
  heading: string;
  /** Each selection quoted back in the person's own terms. */
  selections: { topic: string; value: string }[];
  /** How the report was arranged because of them. */
  arrangement: string[];
}

export interface BlueprintQa {
  /** Total regeneration attempts spent clearing the banned-content lint. */
  lintRetries: number;
  /** Section ids that still failed after the retry limit and are showing fallback text. */
  flaggedSections: SectionId[];
  /** Every model that wrote any part of the document (the fallback chain can change it mid-way). */
  models: string[];
  /** Tokens, summed over every call, when the provider reported them. */
  usage: { input: number; output: number } | null;
  /** Model spend for this document, USD, summed per call. Null when any call's model price is unknown. */
  costUsd: number | null;
  /** Number of model calls, retries included. */
  calls: number;
  /** Why each flagged section failed the lint, for review. */
  flagReasons: Partial<Record<SectionId, string[]>>;
}

export interface BlueprintDoc {
  kind: 'blueprint';
  version: 1;
  generatedAt: string;
  plan: 'blueprint' | 'blueprint_plus30';
  name: string;
  /** Houses counted from the rising sign, or from the Moon when the birth time is unknown. */
  reference: 'lagna' | 'moon';
  referenceSign: Sign;
  timeConfidence: 'exact' | 'approx' | 'unknown';
  brief: BlueprintBrief;
  sections: BlueprintSection[];
  qa: BlueprintQa;
}

/** What the narrative step is asked to add to a section on top of its calculated paragraphs. */
export interface NarrativeSpec {
  id: SectionId;
  title: string;
  /** Facts the paragraphs may rest on, by key. A paragraph citing any other key is rejected. */
  facts: { key: string; text: string }[];
  /** Traditional readings to build on (already shown or implied); not to be repeated. */
  reading: string[];
  /** What the section shows, in addition to its calculated paragraphs, if the model's text cannot be used. */
  fallback: string[];
  /** Plain instruction for this section. */
  ask: string;
  /** How many paragraphs, and which kinds, in order. */
  kinds: ClaimKind[];
  /** Extra text the paragraphs may legitimately mention (dates, names) beyond the facts. */
  allow: string;
}
