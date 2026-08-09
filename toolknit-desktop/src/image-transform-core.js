export const IMAGE_TRANSFORM_LIMITS = Object.freeze({
  maxFiles: 50,
  maxBytesPerFile: 25 * 1024 * 1024,
  maxPixelsPerFile: 40_000_000,
  maxDimension: 12000,
  maxGrid: 10
});

export class ImageTransformError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ImageTransformError';
    this.code = code;
  }
}

const SUPPORTED = new Set(['jpg', 'jpeg', 'png', 'webp', 'bmp']);
const OPS = new Set(['resize', 'rotate', 'flip', 'crop', 'grid_split']);

export function getImageExtension(fileName) {
  if (typeof fileName !== 'string') return '';
  const match = /\.([^.\\/]+)$/.exec(fileName.trim());
  return match ? match[1].toLowerCase() : '';
}

export function isSupportedTransformImageName(fileName) {
  return SUPPORTED.has(getImageExtension(fileName));
}

export function validateTransformSelection(files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new ImageTransformError('missing_input', 'Select at least one image.');
  }
  if (files.length > IMAGE_TRANSFORM_LIMITS.maxFiles) {
    throw new ImageTransformError('too_many_files', `At most ${IMAGE_TRANSFORM_LIMITS.maxFiles} images are allowed.`);
  }
  return files.map((file, index) => {
    const name = typeof file?.name === 'string' ? file.name.trim() : '';
    if (!name || !isSupportedTransformImageName(name)) {
      throw new ImageTransformError('unsupported_input', `Unsupported image at position ${index + 1}.`);
    }
    const size = Number(file?.size);
    if (Number.isFinite(size) && size > IMAGE_TRANSFORM_LIMITS.maxBytesPerFile) {
      throw new ImageTransformError('file_too_large', `${name} exceeds the size limit.`);
    }
    return file;
  });
}

export function normalizeTransformOp(value) {
  const op = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!OPS.has(op)) throw new ImageTransformError('invalid_op', `Unsupported transform: ${value}`);
  return op;
}

export function buildTransformOptions(op, raw = {}) {
  const operation = normalizeTransformOp(op);
  if (operation === 'resize') {
    const width = Number(raw.width) || 0;
    const height = Number(raw.height) || 0;
    const keepAspect = raw.keepAspect !== false;
    if ((!width && !height) || width < 0 || height < 0) {
      throw new ImageTransformError('invalid_resize', 'Provide a positive width and/or height.');
    }
    if (width > IMAGE_TRANSFORM_LIMITS.maxDimension || height > IMAGE_TRANSFORM_LIMITS.maxDimension) {
      throw new ImageTransformError('dimension_too_large', 'Target dimension is too large.');
    }
    return { op: operation, width: Math.round(width), height: Math.round(height), keepAspect: Boolean(keepAspect) };
  }
  if (operation === 'rotate') {
    const degrees = Number(raw.degrees);
    if (![90, 180, 270].includes(degrees)) {
      throw new ImageTransformError('invalid_rotate', 'Rotate degrees must be 90, 180, or 270.');
    }
    return { op: operation, degrees };
  }
  if (operation === 'flip') {
    const axis = String(raw.axis || '').toLowerCase();
    if (axis !== 'horizontal' && axis !== 'vertical') {
      throw new ImageTransformError('invalid_flip', 'Flip axis must be horizontal or vertical.');
    }
    return { op: operation, axis };
  }
  if (operation === 'crop') {
    const x = Math.max(0, Math.round(Number(raw.x) || 0));
    const y = Math.max(0, Math.round(Number(raw.y) || 0));
    const width = Math.round(Number(raw.width) || 0);
    const height = Math.round(Number(raw.height) || 0);
    if (width <= 0 || height <= 0) {
      throw new ImageTransformError('invalid_crop', 'Crop width and height must be positive.');
    }
    return { op: operation, x, y, width, height };
  }
  const rows = Math.round(Number(raw.rows) || 0);
  const cols = Math.round(Number(raw.cols) || 0);
  if (rows < 1 || cols < 1 || rows > IMAGE_TRANSFORM_LIMITS.maxGrid || cols > IMAGE_TRANSFORM_LIMITS.maxGrid) {
    throw new ImageTransformError('invalid_grid', `Grid rows/cols must be 1–${IMAGE_TRANSFORM_LIMITS.maxGrid}.`);
  }
  return { op: 'grid_split', rows, cols };
}
