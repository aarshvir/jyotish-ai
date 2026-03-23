import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const SECTIONS = ['nativity', 'monthly', 'weekly', 'daily', 'hourly', 'synthesis'];

type HiddenEntry = { el: HTMLElement; display: string };

export async function generateReportPDF(nativeName: string, reportDate: string): Promise<void> {
  const reportRoot = document.getElementById('report-content');
  const fallbackMain = document.querySelector('main') as HTMLElement | null;
  const element = reportRoot ?? fallbackMain;

  if (!element) {
    throw new Error('Report content not found');
  }

  const hiddenSections = document.querySelectorAll('[data-pdf-expand]');
  const originalStyles: HiddenEntry[] = [];
  hiddenSections.forEach((node) => {
    const htmlEl = node as HTMLElement;
    if (htmlEl.style.display === 'none') {
      originalStyles.push({ el: htmlEl, display: 'none' });
      htmlEl.style.display = 'block';
    }
  });

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const addCanvasToPdf = (canvas: HTMLCanvasElement, isFirstPage: boolean) => {
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      if (!isFirstPage) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    };

    if (element.scrollHeight > 15000) {
      let addedAny = false;
      for (const sectionId of SECTIONS) {
        const section = document.getElementById(sectionId);
        if (!section) continue;
        const sectionCanvas = await html2canvas(section, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#0a0a1a',
          logging: false,
          windowWidth: 1280,
          scrollX: 0,
          scrollY: -window.scrollY,
          ignoreElements: (el) => {
            const htmlEl = el as HTMLElement;
            return htmlEl.classList?.contains('pdf-exclude') || htmlEl.tagName === 'NAV' || htmlEl.id === 'pdf-download-btn';
          },
        });
        addCanvasToPdf(sectionCanvas, !addedAny);
        addedAny = true;
      }
      if (!addedAny) {
        throw new Error('No report sections found for PDF export');
      }
    } else {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0a0a1a',
        logging: false,
        windowWidth: 1280,
        scrollX: 0,
        scrollY: -window.scrollY,
        ignoreElements: (el) => {
          const htmlEl = el as HTMLElement;
          return htmlEl.classList?.contains('pdf-exclude') || htmlEl.tagName === 'NAV' || htmlEl.id === 'pdf-download-btn';
        },
      });
      addCanvasToPdf(canvas, true);
    }

    pdf.setProperties({
      title: `VedicHour Report — ${nativeName}`,
      subject: 'Vedic Astrology Forecast',
      author: 'VedicHour',
      creator: 'vedichour.com',
      keywords: 'vedic astrology, jyotish, forecast',
    });

    const safeName = nativeName.replace(/\s+/g, '-');
    pdf.save(`VedicHour-${safeName}-${reportDate}.pdf`);
  } finally {
    originalStyles.forEach(({ el, display }) => {
      el.style.display = display;
    });
  }
}

