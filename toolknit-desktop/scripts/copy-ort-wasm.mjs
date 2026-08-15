import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'node_modules', 'onnxruntime-web', 'dist');
const destDir = path.join(root, 'public', 'ort');
const files = [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.jsep.mjs',
  // Self-contained ORT entry bundles (fallback when package dynamic import fails)
  'ort.bundle.min.mjs',
  'ort.webgpu.bundle.min.mjs',
  'ort.wasm.bundle.min.mjs'
];

fs.mkdirSync(destDir, { recursive: true });
for (const name of files) {
  const from = path.join(srcDir, name);
  if (!fs.existsSync(from)) {
    console.warn(`[copy-ort-wasm] skip missing ${name}`);
    continue;
  }
  fs.copyFileSync(from, path.join(destDir, name));
  console.log(`[copy-ort-wasm] ${name}`);
}
