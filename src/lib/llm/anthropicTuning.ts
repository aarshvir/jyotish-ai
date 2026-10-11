/**
 * Request fields that keep structured writing from spending its token budget on thinking.
 *
 * Claude Sonnet 5.5 and Haiku 5.5 think by default, and thinking counts toward max_tokens. On the
 * first real runs a Sonnet 5.5 reply was cut off at 4,800 tokens, and a pinned Haiku 5.5 hourly batch
 * was cut off and re-run on the model chain, which cost more than the whole call should have.
 * Writing prose from supplied facts does not need up-front thinking, so it is switched off:
 * Sonnet 5.5 "between_tools" (its lowest setting), Haiku 5.5 "disabled".
 *
 * Opus 5 / 5.5 cannot switch thinking off. Their only lever is `effort`; set LLM_ANTHROPIC_EFFORT
 * (low | medium | high) to apply it to them. Unset (the default) adds nothing, so the owner's model
 * order behaves exactly as before until someone chooses to change it.
 */
export function anthropicTuning(model: string, env: Record<string, string | undefined> = process.env): Record<string, unknown> {
  if (model.startsWith('claude-sonnet-5-5')) return { thinking: { type: 'between_tools' }, output_config: { effort: 'medium' } };
  if (model.startsWith('claude-haiku-5-5')) return { thinking: { type: 'disabled' }, output_config: { effort: 'medium' } };
  const effort = (env.LLM_ANTHROPIC_EFFORT ?? '').trim();
  if (model.startsWith('claude-opus-5') && ['low', 'medium', 'high'].includes(effort)) return { output_config: { effort } };
  return {};
}
