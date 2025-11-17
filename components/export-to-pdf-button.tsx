"use client";

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { exportToPDF, ExportToPDFOptions } from '@/lib/pdf-export';
import { toast } from 'sonner';

export interface ExportToPDFButtonProps {
  /**
   * The element to export to PDF (defaults to document.body)
   * Can be a ref or a selector string
   */
  element?: HTMLElement | string;
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
  html2canvasOptions?: ExportToPDFOptions['html2canvasOptions'];
  /**
   * Custom button label
   */
  label?: string;
  /**
   * Button variant styling
   */
  variant?: 'default' | 'outline' | 'ghost';
  /**
   * Button size
   */
  size?: 'sm' | 'default' | 'lg';
  /**
   * Custom className for the button
   */
  className?: string;
}

export function ExportToPDFButton({
  element,
  filename = 'export.pdf',
  title,
  html2canvasOptions,
  label = 'Export to PDF',
  variant = 'outline',
  size = 'default',
  className = '',
}: ExportToPDFButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      // Resolve element if it's a string selector
      let targetElement: HTMLElement | undefined;
      if (typeof element === 'string') {
        targetElement = document.querySelector(element) as HTMLElement;
        if (!targetElement) {
          throw new Error(`Element with selector "${element}" not found`);
        }
      } else {
        targetElement = element;
      }

      await exportToPDF({
        element: targetElement,
        filename,
        title,
        html2canvasOptions,
        onStart: () => {
          toast.loading('Generating PDF...', { id: 'pdf-export' });
        },
        onComplete: () => {
          toast.success('PDF exported successfully!', { id: 'pdf-export' });
          setIsExporting(false);
        },
        onError: (error) => {
          toast.error(`Failed to export PDF: ${error.message}`, { id: 'pdf-export' });
          setIsExporting(false);
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export PDF';
      toast.error(errorMessage, { id: 'pdf-export' });
      setIsExporting(false);
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'h-9 px-3 text-sm',
    default: 'h-10 px-4',
    lg: 'h-11 px-8',
  };

  // Variant classes
  const variantClasses = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-700 hover:bg-gray-100',
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-lg font-medium
        transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
        disabled:pointer-events-none disabled:opacity-50
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Exporting...</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

