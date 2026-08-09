export const HASH_LIMITS = Object.freeze({
  maxInputChars: 2_000_000,
  maxFileBytes: 50 * 1024 * 1024
});

export class HashError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'HashError';
    this.code = code;
  }
}

const ALGORITHMS = new Set(['md5', 'sha1', 'sha256', 'sha512']);

export function normalizeHashAlgorithm(value) {
  const algo = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!ALGORITHMS.has(algo)) {
    throw new HashError('invalid_algorithm', `Unsupported hash algorithm: ${value}`);
  }
  return algo;
}

function assertTextInput(text) {
  if (typeof text !== 'string') throw new TypeError('Hash text input must be a string.');
  if (text.length > HASH_LIMITS.maxInputChars) {
    throw new HashError('input_too_long', `Text exceeds ${HASH_LIMITS.maxInputChars} characters.`);
  }
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** Compact MD5 for local text/file hashing (RFC 1321). */
function md5(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const originalLength = data.length;
  const bitLength = originalLength * 8;
  const paddedLength = (((originalLength + 8) >> 6) + 1) << 6;
  const padded = new Uint8Array(paddedLength);
  padded.set(data);
  padded[originalLength] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, bitLength >>> 0, true);
  view.setUint32(paddedLength - 4, Math.floor(bitLength / 0x100000000), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
  ];
  const K = new Uint32Array(64);
  for (let i = 0; i < 64; i += 1) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000);

  const rotateLeft = (value, bits) => (value << bits) | (value >>> (32 - bits));

  for (let offset = 0; offset < paddedLength; offset += 64) {
    const M = new Uint32Array(16);
    for (let i = 0; i < 16; i += 1) M[i] = view.getUint32(offset + i * 4, true);
    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;
    for (let i = 0; i < 64; i += 1) {
      let F;
      let g;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + rotateLeft(F, S[i])) >>> 0;
    }
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  const out = new ArrayBuffer(16);
  const outView = new DataView(out);
  outView.setUint32(0, a0, true);
  outView.setUint32(4, b0, true);
  outView.setUint32(8, c0, true);
  outView.setUint32(12, d0, true);
  return toHex(out);
}

async function subtleDigest(algorithm, bytes) {
  if (!globalThis.crypto?.subtle?.digest) {
    throw new HashError('crypto_unavailable', 'Web Crypto API is unavailable.');
  }
  const name = algorithm === 'sha1' ? 'SHA-1' : algorithm === 'sha256' ? 'SHA-256' : 'SHA-512';
  const digest = await globalThis.crypto.subtle.digest(name, bytes);
  return toHex(digest);
}

export async function hashBytes(algorithm, bytes) {
  const algo = normalizeHashAlgorithm(algorithm);
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (data.byteLength > HASH_LIMITS.maxFileBytes) {
    throw new HashError('file_too_large', `Input exceeds ${HASH_LIMITS.maxFileBytes} bytes.`);
  }
  if (algo === 'md5') return md5(data);
  return subtleDigest(algo, data);
}

export async function hashText(algorithm, text) {
  assertTextInput(text);
  return hashBytes(algorithm, new TextEncoder().encode(text));
}
