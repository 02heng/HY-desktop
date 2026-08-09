export const TEXT_DIFF_LIMITS = Object.freeze({
  maxInputChars: 500_000,
  maxLines: 20_000
});

export class TextDiffError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'TextDiffError';
    this.code = code;
  }
}

function splitLines(text) {
  if (typeof text !== 'string') throw new TypeError('Diff input must be a string.');
  if (text.length > TEXT_DIFF_LIMITS.maxInputChars) {
    throw new TextDiffError('input_too_long', `Diff input exceeds ${TEXT_DIFF_LIMITS.maxInputChars} characters.`);
  }
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (lines.length > TEXT_DIFF_LIMITS.maxLines) {
    throw new TextDiffError('too_many_lines', `Diff supports at most ${TEXT_DIFF_LIMITS.maxLines} lines.`);
  }
  return lines;
}

/** Myers-inspired O(ND) line diff for local text comparison. */
export function diffLines(leftText, rightText) {
  const a = splitLines(leftText);
  const b = splitLines(rightText);
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const offset = max;
  const v = new Array(2 * max + 1).fill(0);
  const trace = [];

  for (let d = 0; d <= max; d += 1) {
    const current = v.slice();
    for (let k = -d; k <= d; k += 2) {
      let x;
      if (k === -d || (k !== d && v[k - 1 + offset] < v[k + 1 + offset])) {
        x = v[k + 1 + offset];
      } else {
        x = v[k - 1 + offset] + 1;
      }
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x += 1;
        y += 1;
      }
      current[k + offset] = x;
      if (x >= n && y >= m) {
        trace.push(current);
        return buildDiff(a, b, trace, offset);
      }
    }
    v.splice(0, v.length, ...current);
    trace.push(current);
  }
  return [];
}

function buildDiff(a, b, trace, offset) {
  const changes = [];
  let x = a.length;
  let y = b.length;

  for (let d = trace.length - 1; d >= 0; d -= 1) {
    const v = trace[d];
    const k = x - y;
    let prevK;
    if (k === -d || (k !== d && v[k - 1 + offset] < v[k + 1 + offset])) prevK = k + 1;
    else prevK = k - 1;
    const prevX = v[prevK + offset];
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      changes.push({ type: 'equal', left: a[x - 1], right: b[y - 1], leftLine: x, rightLine: y });
      x -= 1;
      y -= 1;
    }
    if (d === 0) break;
    if (x === prevX) {
      changes.push({ type: 'add', left: null, right: b[prevY], leftLine: null, rightLine: prevY + 1 });
      y = prevY;
    } else {
      changes.push({ type: 'remove', left: a[prevX], right: null, leftLine: prevX + 1, rightLine: null });
      x = prevX;
    }
  }

  return changes.reverse();
}

export function summarizeDiff(changes) {
  let added = 0;
  let removed = 0;
  let equal = 0;
  for (const change of changes) {
    if (change.type === 'add') added += 1;
    else if (change.type === 'remove') removed += 1;
    else equal += 1;
  }
  return { added, removed, equal, total: changes.length };
}

export function formatUnifiedDiff(changes, leftLabel = 'a', rightLabel = 'b') {
  const lines = [`--- ${leftLabel}`, `+++ ${rightLabel}`];
  for (const change of changes) {
    if (change.type === 'equal') lines.push(` ${change.left}`);
    else if (change.type === 'add') lines.push(`+${change.right}`);
    else lines.push(`-${change.left}`);
  }
  return lines.join('\n');
}
