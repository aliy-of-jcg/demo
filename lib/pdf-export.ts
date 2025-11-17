import jsPDF from 'jspdf';
import html2canvas, { type Options as Html2CanvasOptions } from 'html2canvas';

export interface ExportToPDFOptions {
  /**
   * The element to export to PDF (defaults to document.body)
   */
  element?: HTMLElement;
  /**
   * The filename for the PDF (defaults to 'export.pdf')
   */
  filename?: string;
  /**
   * Title to add to the PDF
   */
  title?: string;
  /**
   * Additional options for html2canvas
   */
  html2canvasOptions?: Html2CanvasOptions;
  /**
   * Callback when export starts
   */
  onStart?: () => void;
  /**
   * Callback when export completes
   */
  onComplete?: () => void;
  /**
   * Callback when export fails
   */
  onError?: (error: Error) => void;
}

/**
 * Exports the specified element (or entire page) to PDF
 */
export async function exportToPDF(options: ExportToPDFOptions = {}): Promise<void> {
  const {
    element,
    filename = 'export.pdf',
    title,
    html2canvasOptions = {},
    onStart,
    onComplete,
    onError,
  } = options;

  try {
    onStart?.();

    // Get the element to capture (default to body if not specified)
    const elementToCapture = element || document.body;

    // Configure html2canvas options
    const canvasOptions: Partial<Html2CanvasOptions> = {
      scale: 2, // Higher quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      ...html2canvasOptions,
    };

    // Convert element to canvas
    const canvas = await html2canvas(elementToCapture, canvasOptions);

    // Calculate PDF dimensions
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const pdfWidth = imgWidth * 0.264583; // Convert pixels to mm (1px = 0.264583mm at 96dpi)
    const pdfHeight = imgHeight * 0.264583;

    // Create PDF
    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight],
    });

    // Add title if provided
    if (title) {
      pdf.setFontSize(16);
      pdf.text(title, 10, 10);
      // Move content down to make room for title
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 15, pdfWidth, pdfHeight - 15);
    } else {
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);
    }

    // Save the PDF
    pdf.save(filename);

    onComplete?.();
  } catch (error) {
    const exportError = error instanceof Error ? error : new Error('Failed to export PDF');
    onError?.(exportError);
    throw exportError;
  }
}

