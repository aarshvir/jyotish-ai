export async function generateReportPDF(
  nativeName: string,
  reportDate: string,
  onProgress?: (msg: string) => void
): Promise<void> {
  onProgress?.('Preparing report for print...');

  const originalTitle = document.title;
  document.title = `VedicHour-${nativeName.replace(/\s+/g, '-')}-${reportDate}`;

  await new Promise((r) => setTimeout(r, 100));

  onProgress?.('Opening print dialog...');

  window.print();

  setTimeout(() => {
    document.title = originalTitle;
    onProgress?.('Download PDF');
  }, 2000);
}
