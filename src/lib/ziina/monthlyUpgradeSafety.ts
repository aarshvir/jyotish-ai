export interface MonthlyUpgradeReportState {
  status?: unknown;
  report_data?: unknown;
}

export interface MonthlyExtensionResult {
  ok: boolean;
  message: string;
}

/** A delta upgrade is only safe once the complete seven-day base report exists. */
export function isMonthlyUpgradeReady(report: MonthlyUpgradeReportState): boolean {
  if (report.status !== 'complete') return false;
  if (!report.report_data || typeof report.report_data !== 'object' || Array.isArray(report.report_data)) {
    return false;
  }

  const days = (report.report_data as { days?: unknown }).days;
  return Array.isArray(days) && days.length >= 7;
}

/** Convert logical extension failures into errors so the background job retries. */
export function assertMonthlyExtensionSucceeded(result: MonthlyExtensionResult): void {
  if (!result.ok) {
    throw new Error(`Monthly report extension failed: ${result.message}`);
  }
}
