import { AsyncLocalStorage } from 'async_hooks';

export interface ReportRunContext {
  reportId: string;
  reportRunId?: string | null;
  correlationId?: string | null;
}

const storage = new AsyncLocalStorage<ReportRunContext>();

export function withReportRunContext<T>(
  context: ReportRunContext,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(context, fn);
}

export function getReportRunContext(): ReportRunContext | undefined {
  return storage.getStore();
}
