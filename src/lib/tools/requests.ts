export class RequestTimeout extends Error {
  constructor() { super('Request timed out. Please try again.'); this.name = 'RequestTimeout'; }
}

/** A logical generation check also rejects late replies from providers ignoring abort. */
export class LatestRequest {
  private controller: AbortController | null = null;
  start(): AbortController {
    this.cancel();
    this.controller = new AbortController();
    return this.controller;
  }
  isCurrent(controller: AbortController): boolean {
    return this.controller === controller && !controller.signal.aborted;
  }
  cancel(): void {
    this.controller?.abort();
    this.controller = null;
  }
}

/** Deadline covers the response body too, not just receipt of HTTP headers. */
export async function requestJson(url: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<{ response: Response; data: unknown }> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { reject(new RequestTimeout()); controller.abort(); }, timeoutMs);
    onAbort = () => { controller.abort(); reject(new DOMException('Request cancelled', 'AbortError')); };
    if (init.signal?.aborted) onAbort();
    else init.signal?.addEventListener('abort', onAbort, { once: true });
  });
  try {
    if (init.signal?.aborted) return await deadline;
    return await Promise.race([
      (async () => {
        const response = await fetch(url, { ...init, signal: controller.signal });
        return { response, data: await response.json() as unknown };
      })(),
      deadline,
    ]);
  } finally {
    clearTimeout(timer);
    if (onAbort) init.signal?.removeEventListener('abort', onAbort);
  }
}
