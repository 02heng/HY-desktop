import assert from 'node:assert/strict';
import { stampBrushMask, WATERMARK_REMOVE_LIMITS } from '../src/watermark-remove-core.js';

const width = 40;
const height = 40;
const mask = new Uint8ClampedArray(width * height);
stampBrushMask(mask, width, height, 20, 20, 5);
assert.equal(mask[20 * width + 20], 255);
assert.equal(mask[0], 0);
assert.ok(WATERMARK_REMOVE_LIMITS.maxBrush >= 80);
console.log('watermark-remove-core: ok');
