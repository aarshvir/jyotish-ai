import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CliError, interpretClaudeStdout } from './clis';

/**
 * The payload below is not invented. It is the literal stdout the claude CLI produced on
 * 2026-08-17 with an expired OAuth session, captured from the real binary — 882 characters of
 * well-formed JSON, exit code 1, `"subtype": "success"`, and the actual failure hidden in
 * `result`. The router accepted it as an answer and the creative loop produced zero variants in
 * eighteen seconds while every stage logged "ok".
 */
const EXPIRED_SESSION_STDOUT = JSON.stringify({
  is_error: true,
  duration_api_ms: 0,
  num_turns: 1,
  stop_reason: 'stop_sequence',
  session_id: '2407f1cb-ab4c-4604-8363-a2a7b0610221',
  total_cost_usd: 0,
  usage: { input_tokens: 0, output_tokens: 0 },
  modelUsage: {},
  permission_denials: [],
  terminal_reason: 'api_error',
  subtype: 'success',
  api_error_status: null,
  result: 'Failed to authenticate: OAuth session expired and could not be refreshed',
  type: 'result',
  duration_ms: 799,
});

test('an expired session throws instead of being returned as the answer', () => {
  assert.throws(
    () => interpretClaudeStdout(EXPIRED_SESSION_STDOUT),
    (e: unknown) => e instanceof CliError && /api_error|not authenticated/.test((e as Error).message),
  );
});

test('the envelope being long does not hide a short auth failure inside it', () => {
  // The whole point: this JSON is ~880 chars, far past the 400-char window the auth heuristic
  // uses, so the check has to run on `result`, not on the packaging.
  assert.ok(EXPIRED_SESSION_STDOUT.length > 400);
  assert.throws(() => interpretClaudeStdout(EXPIRED_SESSION_STDOUT), CliError);
});

test('is_error alone is enough, even without recognisable auth wording', () => {
  const blob = JSON.stringify({ is_error: true, subtype: 'success', result: 'Something went wrong upstream.' });
  assert.throws(() => interpretClaudeStdout(blob), CliError);
});

test('a real answer is unwrapped from the envelope', () => {
  const blob = JSON.stringify({ is_error: false, subtype: 'success', type: 'result', result: '[{"hookText":"Aaj bol dunga."}]' });
  assert.equal(interpretClaudeStdout(blob), '[{"hookText":"Aaj bol dunga."}]');
});

test('plain non-JSON stdout is passed through', () => {
  assert.equal(interpretClaudeStdout('OK'), 'OK');
});

test('long copy that merely mentions logging in is not mistaken for a failure', () => {
  // The 400-char window exists so generated ad copy can legitimately discuss sessions and logins.
  const copy = `${'Ek baar login karke dekh lo, phir samajh aayega. '.repeat(12)}`;
  assert.equal(interpretClaudeStdout(JSON.stringify({ is_error: false, result: copy })), copy.trim());
});
