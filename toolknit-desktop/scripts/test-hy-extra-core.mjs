import assert from 'node:assert/strict';
import { hashText } from '../src/hash-core.js';
import { formatJson, minifyJson, validateJson } from '../src/json-format-core.js';
import { diffLines, summarizeDiff, formatUnifiedDiff } from '../src/text-diff-core.js';
import { buildTransformOptions } from '../src/image-transform-core.js';
import { validateImageToPdfSelection } from '../src/image-to-pdf-core.js';

assert.equal(await hashText('md5', ''), 'd41d8cd98f00b204e9800998ecf8427e');
assert.equal(await hashText('sha256', 'abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');

assert.equal(formatJson('{"a":1,"b":[2,3]}'), '{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}');
assert.equal(minifyJson('{\n "a": 1 \n}'), '{"a":1}');
assert.equal(validateJson('{bad').ok, false);

const changes = diffLines('a\nb\nc', 'a\nx\nc');
const summary = summarizeDiff(changes);
assert.equal(summary.added, 1);
assert.equal(summary.removed, 1);
assert.match(formatUnifiedDiff(changes), /^-b$/m);
assert.match(formatUnifiedDiff(changes), /^\+x$/m);

assert.deepEqual(buildTransformOptions('rotate', { degrees: 90 }), { op: 'rotate', degrees: 90 });
assert.deepEqual(buildTransformOptions('grid_split', { rows: 3, cols: 3 }), {
  op: 'grid_split',
  rows: 3,
  cols: 3
});

validateImageToPdfSelection([{ name: 'a.jpg', size: 10 }, { name: 'b.png', size: 20 }]);
assert.throws(() => validateImageToPdfSelection([{ name: 'a.webp', size: 10 }]));

console.log('HY-extra-core tests passed');
