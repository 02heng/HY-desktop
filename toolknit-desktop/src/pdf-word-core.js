import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const PDF_WORD_LIMITS = Object.freeze({
  maxFileBytes: 30 * 1024 * 1024,
  maxChars: 500_000
});

export class PdfWordError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PdfWordError';
    this.code = code;
  }
}

function assertTextBudget(text) {
  if (typeof text !== 'string') throw new TypeError('Text must be a string.');
  if (text.length > PDF_WORD_LIMITS.maxChars) {
    throw new PdfWordError('text_too_long', `Text exceeds ${PDF_WORD_LIMITS.maxChars} characters.`);
  }
}

/** Minimal OOXML DOCX builder (text paragraphs only). */
export async function buildDocxFromText(text, title = 'HY Document') {
  assertTextBudget(text);
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const paragraphs = String(text || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => {
      const escaped = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<w:p><w:r><w:t xml:space="preserve">${escaped || ' '}</w:t></w:r></w:p>`;
    })
    .join('');

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );
  zip.folder('_rels')?.file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );
  zip.folder('word')?.file(
    'document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${String(title).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</w:t></w:r></w:p>
    ${paragraphs}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`
  );

  const output = await zip.generateAsync({ type: 'uint8array' });
  return output;
}

export async function buildPdfFromPlainText(text, title = 'HY Document') {
  assertTextBudget(text);
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontSize = 11;
  const lineHeight = 14;
  const margin = 48;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const maxWidth = pageWidth - margin * 2;
  const lines = [];

  for (const paragraph of String(text || '').replace(/\r\n?/g, '\n').split('\n')) {
    if (!paragraph) {
      lines.push('');
      continue;
    }
    let current = '';
    for (const word of paragraph.split(/(\s+)/)) {
      const next = current + word;
      if (font.widthOfTextAtSize(next, fontSize) > maxWidth && current) {
        lines.push(current);
        current = word.trimStart();
      } else {
        current = next;
      }
    }
    lines.push(current);
  }

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  page.drawText(title, { x: margin, y, size: 16, font, color: rgb(0.1, 0.1, 0.1) });
  y -= 28;

  for (const line of lines) {
    if (y < margin + lineHeight) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    if (line) {
      page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0.15, 0.15, 0.15) });
    }
    y -= lineHeight;
  }
  return pdf.save();
}
