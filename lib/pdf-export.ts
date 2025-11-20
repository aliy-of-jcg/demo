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

    // Validate canvas
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('Failed to capture content: canvas is empty');
    }

    // Convert canvas to data URL with error handling
    let imageData: string;
    try {
      imageData = canvas.toDataURL('image/png', 1.0);
      // Validate the data URL
      if (!imageData || !imageData.startsWith('data:image/png;base64,')) {
        throw new Error('Invalid PNG data generated');
      }
    } catch (error) {
      throw new Error(`Failed to convert canvas to image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Calculate PDF dimensions
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const pdfWidth = imgWidth * 0.264583; // Convert pixels to mm (1px = 0.264583mm at 96dpi)
    const pdfHeight = imgHeight * 0.264583;

    // Validate dimensions
    if (pdfWidth <= 0 || pdfHeight <= 0) {
      throw new Error('Invalid PDF dimensions calculated');
    }

    // Create PDF with standard format if dimensions are too large
    const maxDimension = 1000; // Max 1000mm (about 39 inches)
    let finalPdfWidth = pdfWidth;
    let finalPdfHeight = pdfHeight;
    
    if (pdfWidth > maxDimension || pdfHeight > maxDimension) {
      // Scale down proportionally
      const scale = Math.min(maxDimension / pdfWidth, maxDimension / pdfHeight);
      finalPdfWidth = pdfWidth * scale;
      finalPdfHeight = pdfHeight * scale;
    }

    // Create PDF
    const pdf = new jsPDF({
      orientation: finalPdfWidth > finalPdfHeight ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [finalPdfWidth, finalPdfHeight],
    });

    // Add title if provided
    if (title) {
      pdf.setFontSize(16);
      pdf.text(title, 10, 10);
      // Calculate image dimensions accounting for title space
      const titleSpace = 15;
      const imageHeight = Math.max(1, finalPdfHeight - titleSpace); // Ensure positive height
      try {
        pdf.addImage(imageData, 'PNG', 0, titleSpace, finalPdfWidth, imageHeight);
      } catch (error) {
        throw new Error(`Failed to add image to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      try {
        pdf.addImage(imageData, 'PNG', 0, 0, finalPdfWidth, finalPdfHeight);
      } catch (error) {
        throw new Error(`Failed to add image to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
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

