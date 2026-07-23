/** Worth another attempt: transient API/network failures, truncation, empty output. */
export class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableError';
  }
}

/** Will fail identically on retry: safety refusal, schema violation, bad input. */
export class FatalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatalError';
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  { attempts = 3, baseMs = 4000, label = 'op' }: { attempts?: number; baseMs?: number; label?: string } = {}
): Promise<T> {
  let lastError: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (e instanceof FatalError) throw e;

      const status = (e as { status?: number })?.status;
      const retryableStatus = status === 429 || (typeof status === 'number' && status >= 500);
      const retryable = e instanceof RetryableError || retryableStatus || status === undefined;
      if (!retryable || i === attempts) throw e;

      const wait = baseMs * i;
      console.log(`  [retry] ${label} ${i}/${attempts} in ${wait}ms — ${(e as Error).message?.slice(0, 120)}`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw lastError;
}
