export class ImageMattingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ImageMattingError';
    this.code = code;
  }
}

export const IMAGE_MATTING_LIMITS = {
  maxBytes: 40 * 1024 * 1024
};

/**
 * Remove image background locally via @imgly/background-removal (AGPL-3.0).
 * @param {Blob|string|URL|ArrayBuffer|Uint8Array} source
 * @param {{ onProgress?: (key: string, current: number, total: number) => void }} [options]
 * @returns {Promise<Blob>} PNG blob with transparency
 */
export async function removeImageBackground(source, options = {}) {
  if (!source) {
    throw new ImageMattingError('empty', 'Please choose an image');
  }

  let input = source;
  if (source instanceof Uint8Array || source instanceof ArrayBuffer) {
    const bytes = source instanceof Uint8Array ? source : new Uint8Array(source);
    if (bytes.byteLength > IMAGE_MATTING_LIMITS.maxBytes) {
      throw new ImageMattingError('too_large', 'Image is too large');
    }
    input = new Blob([bytes], { type: 'image/png' });
  } else if (source instanceof Blob && source.size > IMAGE_MATTING_LIMITS.maxBytes) {
    throw new ImageMattingError('too_large', 'Image is too large');
  }

  try {
    const { removeBackground } = await import('@imgly/background-removal');
    const blob = await removeBackground(input, {
      output: { format: 'image/png', quality: 0.9 },
      progress: (key, current, total) => {
        options.onProgress?.(String(key || 'fetch'), Number(current) || 0, Number(total) || 1);
      }
    });
    if (!(blob instanceof Blob)) {
      throw new ImageMattingError('bad_output', 'Background removal returned empty result');
    }
    return blob;
  } catch (error) {
    if (error instanceof ImageMattingError) throw error;
    throw new ImageMattingError(
      'matting_failed',
      String(error?.message || error || 'Background removal failed')
    );
  }
}
