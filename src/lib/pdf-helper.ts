/**
 * PDF Helper - Conversión de texto a PDF
 * Función reutilizable para convertir cualquier contenido de texto a PDF
 */

import jsPDF from 'jspdf';

/**
 * Convierte texto a PDF y lo descarga
 * @param content Contenido de texto a convertir
 * @param filename Nombre del archivo (sin extensión)
 * @param options Opciones adicionales para el PDF
 */
export function downloadTextAsPDF(
  content: string,
  filename: string,
  options?: {
    orientation?: 'portrait' | 'landscape';
    fontSize?: number;
    fontFamily?: string;
    margin?: number;
    lineHeight?: number;
  }
): void {
  try {
    const {
      orientation = 'portrait',
      fontSize = 10,
      fontFamily = 'courier',
      margin = 20,
      lineHeight = 1.2
    } = options || {};

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const maxWidth = pageWidth - (margin * 2);
    const maxHeight = pageHeight - (margin * 2);

    pdf.setFont(fontFamily);
    pdf.setFontSize(fontSize);

    // Dividir el contenido en líneas
    const lines = content.split('\n');
    let y = margin;
    let currentPage = 1;

    lines.forEach((line) => {
      // Si la línea es muy larga, dividirla
      const textLines = pdf.splitTextToSize(line || ' ', maxWidth);
      
      textLines.forEach((textLine: string) => {
        // Verificar si necesitamos una nueva página
        if (y + (fontSize * lineHeight) > pageHeight - margin) {
          pdf.addPage();
          currentPage++;
          y = margin;
        }

        pdf.text(textLine, margin, y, {
          maxWidth,
          align: 'left'
        });

        y += fontSize * lineHeight;
      });
    });

    // Guardar el PDF
    pdf.save(`${filename}_${Date.now()}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
}

/**
 * Convierte texto a PDF con formato monospace mejorado
 * Útil para documentos con formato ASCII art o tablas
 */
export function downloadTextAsPDFMonospace(
  content: string,
  filename: string,
  options?: {
    orientation?: 'portrait' | 'landscape';
    fontSize?: number;
    margin?: number;
  }
): void {
  downloadTextAsPDF(content, filename, {
    ...options,
    fontFamily: 'courier',
    fontSize: options?.fontSize || 8,
    lineHeight: 1.15
  });
}

