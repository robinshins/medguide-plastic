/**
 * OpenAI token accounting for one publish run.
 *
 * Every site shares a single OpenAI key, and that key's free daily allowance is the
 * real budget ceiling — not dollars. Without this we were guessing at consumption from
 * article character counts, which ignores the prompt (the larger half) and reasoning
 * tokens (billed, invisible in the output).
 *
 * Call `record()` at every OpenAI response site; `summary()` at the end of the run.
 */

interface Bucket {
  calls: number;
  input: number;
  output: number;
  reasoning: number;
}

const buckets = new Map<string, Bucket>();

/** The shape both `responses.create` and `chat.completions.create` return. */
export interface AnyUsage {
  input_tokens?: number;
  output_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  output_tokens_details?: { reasoning_tokens?: number };
}

export function record(label: string, usage: AnyUsage | undefined | null): void {
  if (!usage) return;
  const b = buckets.get(label) ?? { calls: 0, input: 0, output: 0, reasoning: 0 };
  b.calls += 1;
  b.input += usage.input_tokens ?? usage.prompt_tokens ?? 0;
  b.output += usage.output_tokens ?? usage.completion_tokens ?? 0;
  b.reasoning += usage.output_tokens_details?.reasoning_tokens ?? 0;
  buckets.set(label, b);
}

export function totals() {
  let input = 0, output = 0, reasoning = 0, calls = 0;
  for (const b of buckets.values()) {
    input += b.input; output += b.output; reasoning += b.reasoning; calls += b.calls;
  }
  return { calls, input, output, reasoning, total: input + output };
}

export function summary(): string {
  const lines: string[] = [];
  for (const [label, b] of buckets) {
    lines.push(
      `    ${label.padEnd(12)} calls=${String(b.calls).padStart(3)} ` +
      `in=${String(b.input).padStart(7)} out=${String(b.output).padStart(6)}` +
      (b.reasoning ? ` (reasoning ${b.reasoning})` : '')
    );
  }
  const t = totals();
  lines.push(`    ${'TOTAL'.padEnd(12)} calls=${String(t.calls).padStart(3)} ` +
    `in=${String(t.input).padStart(7)} out=${String(t.output).padStart(6)} → ${t.total} tokens`);
  return lines.join('\n');
}

export function reset(): void {
  buckets.clear();
}
