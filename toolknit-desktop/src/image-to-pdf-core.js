import { PDFDocument } from 'pdf-lib';

export const IMAGE_TO_PDF_LIMITS = Object.freeze({
  maxFiles: 50,
  maxBytesPerFile: 25 * 1024 * 1024
});

export class ImageToPdfError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ImageToPdfError';
    this.code = code;
  }
}

const SUPPORTED = new Set(['jpg', 'jpeg', 'png']);

export function getImageExtension(fileName) {
  if (typeof fileName !== 'string') return '';
  const match = /\.([^.\\/]+)$/.exec(fileName.trim());
  return match ? match[1].toLowerCase() : '';
}

export function isSupportedImageToPdfName(fileName) {
  return SUPPORTED.has(getImageExtension(fileName));
}

export function validateImageToPdfSelection(files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new ImageToPdfError('missing_input', 'Select at least one JPG/PNG image.');
  }
  if (files.length > IMAGE_TO_PDF_LIMITS.maxFiles) {
    throw new ImageToPdfError('too_many_files', `At most ${IMAGE_TO_PDF_LIMITS.maxFiles} images are allowed.`);
  }
  const seen = new Set();
  return files.map((file, index) => {
    const name = typeof file?.name === 'string' ? file.name.trim() : '';
    if (!name || !isSupportedImageToPdfName(name)) {
      throw new ImageToPdfError('unsupported_input', `Unsupported image at position ${index + 1}. Use JPG or PNG.`);
    }
    const identity = typeof file?.path === 'string' && file.path
      ? `path:${file.path}`
      : `file:${name}\u0000${file?.size ?? ''}`;
    if (seen.has(identity)) {
      throw new ImageToPdfError('duplicate_input', `Duplicate image: ${name}`);
    }
    seen.add(identity);
    const size = Number(file?.size);
    if (!Number.isSafeInteger(size) || size < 0) {
      throw new ImageToPdfError('invalid_file_size', `Invalid size at position ${index + 1}.`);
    }
    if (size > IMAGE_TO_PDF_LIMITS.maxBytesPerFile) {
      throw new ImageToPdfError('file_too_large', `${name} exceeds the size limit.`);
    }
    return file;
  });
}

/**
 * @param {Array<{ name: string, bytes: Uint8Array }>} images
 * @returns {Promise<Uint8Array>}
 */
export async function buildPdfFromImages(images) {
  if (!Array.isArray(images) || images.length === 0) {
    throw new ImageToPdfError('missing_input', 'No images to convert.');
  }
  const pdf = await PDFDocument.create();
  for (const [index, image] of images.entries()) {
    const name = image?.name || `image-${index + 1}`;
    const bytes = image?.bytes instanceof Uint8Array ? image.bytes : null;
    if (!bytes) throw new ImageToPdfError('invalid_bytes', `Missing bytes for ${name}`);
    const ext = getImageExtension(name);
    let embedded;
    try {
      embedded = ext === 'png'
        ? await pdf.embedPng(bytes)
        : await pdf.embedJpg(bytes);
    } catch {
      throw new ImageToPdfError('embed_failed', `Cannot embed ${name}. Re-export as JPG/PNG and retry.`);
    }
    const page = pdf.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: embedded.width,
      height: embedded.height
    });
  }
  return pdf.save();
}
