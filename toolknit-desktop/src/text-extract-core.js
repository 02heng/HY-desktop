export const TEXT_EXTRACT_LIMITS = Object.freeze({
  maxFileBytes: 30 * 1024 * 1024,
  maxOutputChars: 2_000_000
});

export class TextExtractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'TextExtractError';
    this.code = code;
  }
}

const SUPPORTED = new Set(['pdf', 'txt', 'md', 'docx', 'csv', 'json', 'log']);

export function getExtractExtension(fileName) {
  if (typeof fileName !== 'string') return '';
  const match = /\.([^.\\/]+)$/.exec(fileName.trim());
  return match ? match[1].toLowerCase() : '';
}

export function isSupportedExtractName(fileName) {
  return SUPPORTED.has(getExtractExtension(fileName));
}

function clipText(text) {
  if (text.length <= TEXT_EXTRACT_LIMITS.maxOutputChars) return text;
  return `${text.slice(0, TEXT_EXTRACT_LIMITS.maxOutputChars)}\n\n[truncated]`;
}

export async function extractTextFromBytes(fileName, bytes, { pdfjsLib, mammoth } = {}) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TextExtractError('invalid_bytes', 'File bytes are required.');
  }
  if (bytes.byteLength > TEXT_EXTRACT_LIMITS.maxFileBytes) {
    throw new TextExtractError('file_too_large', 'File exceeds the extract size limit.');
  }
  const ext = getExtractExtension(fileName);
  if (!SUPPORTED.has(ext)) {
    throw new TextExtractError('unsupported_input', `Unsupported file type: ${ext || 'unknown'}`);
  }

  if (ext === 'txt' || ext === 'md' || ext === 'csv' || ext === 'json' || ext === 'log') {
    return clipText(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
  }

  if (ext === 'pdf') {
    if (!pdfjsLib?.getDocument) {
      throw new TextExtractError('pdfjs_missing', 'PDF.js is unavailable.');
    }
    const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
    const pdf = await loadingTask.promise;
    const parts = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str || '').join(' ');
      parts.push(`--- Page ${pageNumber} ---\n${pageText}`);
    }
    return clipText(parts.join('\n\n'));
  }

  if (ext === 'docx') {
    if (!mammoth?.extractRawText) {
      throw new TextExtractError('mammoth_missing', 'DOCX extractor is unavailable.');
    }
    const result = await mammoth.extractRawText({ arrayBuffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
    return clipText(String(result?.value || ''));
  }

  throw new TextExtractError('unsupported_input', 'Unsupported file type.');
}
