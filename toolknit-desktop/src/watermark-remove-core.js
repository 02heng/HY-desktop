/**
 * Local watermark / object removal via MI-GAN (ONNX Runtime Web).
 * Inference path adapted from lxfater/inpaint-web (MI-GAN pipeline v2).
 */

export class WatermarkRemoveError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WatermarkRemoveError';
    this.code = code;
  }
}

export const WATERMARK_REMOVE_LIMITS = {
  maxWidth: 8000,
  maxHeight: 8000,
  /** Longest side for MI-GAN inference; larger images are scaled then composited. */
  maxInferSide: 2048,
  minBrush: 4,
  maxBrush: 128
};

const MODEL_CACHE_NAME = 'hy-migan-v1';
const MODEL_CACHE_KEY = 'migan_pipeline_v2.onnx';
const MODEL_URLS = [
  'https://huggingface.co/andraniksargsyan/migan/resolve/main/migan_pipeline_v2.onnx',
  'https://hf-mirror.com/andraniksargsyan/migan/resolve/main/migan_pipeline_v2.onnx'
];

let sessionPromise = null;
let ortModule = null;

function reportProgress(options, stage, percent) {
  try {
    options?.onProgress?.(stage, percent);
  } catch {
    /* ignore UI progress errors */
  }
}

async function checkWebGpu() {
  try {
    if (!navigator?.gpu) return false;
    const adapter = await navigator.gpu.requestAdapter();
    return Boolean(adapter);
  } catch {
    return false;
  }
}

function ortPublicBase() {
  return (import.meta.env?.BASE_URL || '/').replace(/\/?$/, '/');
}

function configureWasm(ort) {
  ort.env.wasm.wasmPaths = `${ortPublicBase()}ort/`;
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.simd = true;
}

async function importOrtModule(specifier) {
  const mod = await import(specifier);
  return mod?.default && mod.InferenceSession ? mod : mod;
}

/** Load ORT from /public/ort — avoids broken Vite /node_modules dynamic imports in WebView. */
async function importOrtFromPublic(fileName) {
  const url = `${ortPublicBase()}ort/${fileName}`;
  return import(/* @vite-ignore */ url);
}

async function loadOrt() {
  if (ortModule) return ortModule;

  const attempts = [];
  const tryLoad = async (label, loader) => {
    try {
      const mod = await loader();
      if (!mod?.InferenceSession && !mod?.default?.InferenceSession) {
        throw new Error(`${label}: InferenceSession missing`);
      }
      const ort = mod.InferenceSession ? mod : mod.default;
      configureWasm(ort);
      ortModule = ort;
      return ort;
    } catch (error) {
      attempts.push(`${label}: ${error?.message || error}`);
      return null;
    }
  };

  // Prefer /public/ort static bundles first — Vite serving raw /node_modules ESM
  // fails in Tauri WebView ("Failed to fetch dynamically imported module").
  if (await checkWebGpu()) {
    if (await tryLoad('webgpu-public', () => importOrtFromPublic('ort.webgpu.bundle.min.mjs'))) {
      return ortModule;
    }
    if (await tryLoad('webgpu-pkg', () => importOrtModule('onnxruntime-web/webgpu'))) {
      return ortModule;
    }
  }

  if (await tryLoad('bundle-public', () => importOrtFromPublic('ort.bundle.min.mjs'))) {
    return ortModule;
  }
  if (await tryLoad('wasm-public', () => importOrtFromPublic('ort.wasm.bundle.min.mjs'))) {
    return ortModule;
  }
  if (await tryLoad('default-pkg', () => importOrtModule('onnxruntime-web'))) {
    return ortModule;
  }
  if (await tryLoad('wasm-pkg', () => importOrtModule('onnxruntime-web/wasm'))) {
    return ortModule;
  }

  throw new WatermarkRemoveError(
    'engine_load_failed',
    `Failed to load ONNX Runtime (${attempts.join(' | ')})`
  );
}

async function fetchModelBuffer(onProgress) {
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(MODEL_CACHE_NAME);
      const hit = await cache.match(MODEL_CACHE_KEY);
      if (hit) {
        reportProgress({ onProgress }, 'model', 100);
        return hit.arrayBuffer();
      }
    } catch {
      /* ignore cache read errors */
    }
  }

  let lastError;
  for (const url of MODEL_URLS) {
    try {
      reportProgress({ onProgress }, 'model', 0);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const total = Number(response.headers.get('content-length')) || 0;
      if (!response.body?.getReader) {
        const buffer = await response.arrayBuffer();
        await putModelCache(buffer);
        reportProgress({ onProgress }, 'model', 100);
        return buffer;
      }
      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total > 0) {
          reportProgress({ onProgress }, 'model', Math.min(99, Math.round((received / total) * 100)));
        }
      }
      const buffer = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }
      await putModelCache(buffer.buffer);
      reportProgress({ onProgress }, 'model', 100);
      return buffer.buffer;
    } catch (error) {
      lastError = error;
    }
  }
  throw new WatermarkRemoveError(
    'model_download_failed',
    `Failed to download MI-GAN model: ${lastError?.message || lastError}`
  );
}

async function putModelCache(buffer) {
  if (typeof caches === 'undefined') return;
  try {
    const cache = await caches.open(MODEL_CACHE_NAME);
    await cache.put(
      MODEL_CACHE_KEY,
      new Response(buffer, {
        headers: { 'Content-Type': 'application/octet-stream' }
      })
    );
  } catch {
    /* ignore cache write errors */
  }
}

async function getSession(onProgress) {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      reportProgress({ onProgress }, 'engine', 10);
      const ort = await loadOrt();
      reportProgress({ onProgress }, 'engine', 30);
      const modelBuffer = await fetchModelBuffer(onProgress);
      reportProgress({ onProgress }, 'engine', 70);
      const providers = [];
      if (await checkWebGpu()) providers.push('webgpu');
      providers.push('wasm');
      const session = await ort.InferenceSession.create(modelBuffer, {
        executionProviders: providers
      });
      reportProgress({ onProgress }, 'engine', 100);
      return { ort, session };
    })().catch((error) => {
      sessionPromise = null;
      throw error;
    });
  }
  return sessionPromise;
}

function rgbaToRgbChw(data, width, height) {
  const size = width * height;
  const out = new Uint8Array(3 * size);
  for (let i = 0; i < size; i += 1) {
    const p = i * 4;
    out[i] = data[p];
    out[size + i] = data[p + 1];
    out[size * 2 + i] = data[p + 2];
  }
  return out;
}

/** Mask for MI-GAN: 255 = inpaint hole, 0 = keep. */
function maskToChw(maskAlpha, width, height) {
  const out = new Uint8Array(width * height);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = maskAlpha[i] > 0 ? 255 : 0;
  }
  return out;
}

function chwRgbToRgba(uint8Data, width, height) {
  const size = width * height;
  const rgba = new Uint8ClampedArray(size * 4);
  for (let i = 0; i < size; i += 1) {
    const p = i * 4;
    rgba[p] = uint8Data[i];
    rgba[p + 1] = uint8Data[size + i];
    rgba[p + 2] = uint8Data[size * 2 + i];
    rgba[p + 3] = 255;
  }
  return rgba;
}

function scaleImageData(imageData, targetW, targetH) {
  const src = document.createElement('canvas');
  src.width = imageData.width;
  src.height = imageData.height;
  src.getContext('2d').putImageData(imageData, 0, 0);
  const dst = document.createElement('canvas');
  dst.width = targetW;
  dst.height = targetH;
  const ctx = dst.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, targetW, targetH);
  return ctx.getImageData(0, 0, targetW, targetH);
}

function scaleMask(maskAlpha, srcW, srcH, targetW, targetH) {
  const src = document.createElement('canvas');
  src.width = srcW;
  src.height = srcH;
  const sctx = src.getContext('2d');
  const img = sctx.createImageData(srcW, srcH);
  for (let i = 0; i < srcW * srcH; i += 1) {
    const v = maskAlpha[i] > 0 ? 255 : 0;
    const p = i * 4;
    img.data[p] = v;
    img.data[p + 1] = v;
    img.data[p + 2] = v;
    img.data[p + 3] = 255;
  }
  sctx.putImageData(img, 0, 0);
  const dst = document.createElement('canvas');
  dst.width = targetW;
  dst.height = targetH;
  const dctx = dst.getContext('2d');
  dctx.imageSmoothingEnabled = false;
  dctx.drawImage(src, 0, 0, targetW, targetH);
  const scaled = dctx.getImageData(0, 0, targetW, targetH);
  const out = new Uint8ClampedArray(targetW * targetH);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = scaled.data[i * 4] > 127 ? 255 : 0;
  }
  return out;
}

function dilateMask(mask, width, height, radius = 2) {
  if (radius <= 0) return mask;
  const out = new Uint8ClampedArray(mask.length);
  out.set(mask);
  const r = Math.max(1, Math.round(radius));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] === 0) continue;
      for (let dy = -r; dy <= r; dy += 1) {
        for (let dx = -r; dx <= r; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          out[ny * width + nx] = 255;
        }
      }
    }
  }
  return out;
}

function compositeMasked(original, repaired, maskAlpha) {
  const out = new ImageData(
    new Uint8ClampedArray(original.data),
    original.width,
    original.height
  );
  for (let i = 0; i < maskAlpha.length; i += 1) {
    if (maskAlpha[i] === 0) continue;
    const p = i * 4;
    out.data[p] = repaired.data[p];
    out.data[p + 1] = repaired.data[p + 1];
    out.data[p + 2] = repaired.data[p + 2];
    out.data[p + 3] = original.data[p + 3];
  }
  return out;
}

/**
 * @param {ImageData} imageData
 * @param {Uint8ClampedArray|Uint8Array} maskAlpha mask where >0 means inpaint
 * @param {{ onProgress?: (stage: string, percent?: number) => void }} [options]
 * @returns {Promise<ImageData>}
 */
export async function inpaintImageData(imageData, maskAlpha, options = {}) {
  if (!imageData?.data?.length) {
    throw new WatermarkRemoveError('empty_image', 'Image is empty');
  }
  const { width, height, data } = imageData;
  if (width > WATERMARK_REMOVE_LIMITS.maxWidth || height > WATERMARK_REMOVE_LIMITS.maxHeight) {
    throw new WatermarkRemoveError('too_large', 'Image is too large');
  }
  if (!maskAlpha || maskAlpha.length < width * height) {
    throw new WatermarkRemoveError('bad_mask', 'Mask is invalid');
  }

  let painted = 0;
  for (let i = 0; i < width * height; i += 1) {
    if (maskAlpha[i] > 0) painted += 1;
  }
  if (painted === 0) {
    throw new WatermarkRemoveError('empty_mask', 'Please brush the watermark area first');
  }

  const { ort, session } = await getSession(options.onProgress);
  reportProgress(options, 'inpaint', 15);

  const maxSide = WATERMARK_REMOVE_LIMITS.maxInferSide;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const inferW = Math.max(1, Math.round(width * scale));
  const inferH = Math.max(1, Math.round(height * scale));

  let inferImage = imageData;
  let inferMask = maskAlpha;
  if (inferW !== width || inferH !== height) {
    inferImage = scaleImageData(imageData, inferW, inferH);
    inferMask = scaleMask(maskAlpha, width, height, inferW, inferH);
  }
  // Slightly expand brush so edges blend more cleanly.
  inferMask = dilateMask(inferMask, inferW, inferH, 2);

  const rgb = rgbaToRgbChw(inferImage.data, inferW, inferH);
  const maskChw = maskToChw(inferMask, inferW, inferH);

  const imageTensor = new ort.Tensor('uint8', rgb, [1, 3, inferH, inferW]);
  const maskTensor = new ort.Tensor('uint8', maskChw, [1, 1, inferH, inferW]);
  const feeds = {
    [session.inputNames[0]]: imageTensor,
    [session.inputNames[1]]: maskTensor
  };

  reportProgress(options, 'inpaint', 40);
  const results = await session.run(feeds);
  reportProgress(options, 'inpaint', 85);

  const outTensor = results[session.outputNames[0]];
  const rgba = chwRgbToRgba(outTensor.data, inferW, inferH);
  let repaired = new ImageData(rgba, inferW, inferH);

  if (inferW !== width || inferH !== height) {
    repaired = scaleImageData(repaired, width, height);
  }

  // Keep unmasked pixels from the original (avoids global color shift).
  const result = compositeMasked(
    { data, width, height },
    repaired,
    dilateMask(maskAlpha, width, height, Math.max(1, Math.round(2 / scale)))
  );
  reportProgress(options, 'inpaint', 100);
  return result;
}

/**
 * Pure helper for tests: expand brush stamp into mask buffer.
 */
export function stampBrushMask(mask, width, height, x, y, radius) {
  const r = Math.max(
    WATERMARK_REMOVE_LIMITS.minBrush / 2,
    Math.min(WATERMARK_REMOVE_LIMITS.maxBrush / 2, radius)
  );
  const r2 = r * r;
  const minX = Math.max(0, Math.floor(x - r));
  const maxX = Math.min(width - 1, Math.ceil(x + r));
  const minY = Math.max(0, Math.floor(y - r));
  const maxY = Math.min(height - 1, Math.ceil(y + r));
  for (let py = minY; py <= maxY; py += 1) {
    for (let px = minX; px <= maxX; px += 1) {
      const dx = px - x;
      const dy = py - y;
      if (dx * dx + dy * dy <= r2) {
        mask[py * width + px] = 255;
      }
    }
  }
}
