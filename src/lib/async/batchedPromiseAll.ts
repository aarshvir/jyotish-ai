/**
 * Run async factories in fixed-size batches (e.g. 2) to reduce LLM rate-limit pressure
 * while staying faster than fully sequential execution.
 */
export async function batchedPromiseAll<T>(
  factories: Array<() => Promise<T>>,
  batchSize = 2
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < factories.length; i += batchSize) {
    const batch = factories.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((fn) => fn()));
    results.push(...batchResults);
  }
  return results;
}
