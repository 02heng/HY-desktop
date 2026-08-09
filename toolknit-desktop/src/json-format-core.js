export const JSON_FORMAT_LIMITS = Object.freeze({
  maxInputChars: 2_000_000
});

export class JsonFormatError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'JsonFormatError';
    this.code = code;
  }
}

function assertInput(text) {
  if (typeof text !== 'string') throw new TypeError('JSON input must be a string.');
  if (text.length > JSON_FORMAT_LIMITS.maxInputChars) {
    throw new JsonFormatError('input_too_long', `JSON input exceeds ${JSON_FORMAT_LIMITS.maxInputChars} characters.`);
  }
}

export function formatJson(text, indent = 2) {
  assertInput(text);
  const trimmed = text.trim();
  if (!trimmed) throw new JsonFormatError('empty_input', 'JSON input is empty.');
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    throw new JsonFormatError('invalid_json', error instanceof Error ? error.message : 'Invalid JSON.');
  }
  const spaces = Number.isInteger(indent) && indent >= 0 && indent <= 8 ? indent : 2;
  return JSON.stringify(parsed, null, spaces);
}

export function minifyJson(text) {
  assertInput(text);
  const trimmed = text.trim();
  if (!trimmed) throw new JsonFormatError('empty_input', 'JSON input is empty.');
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    throw new JsonFormatError('invalid_json', error instanceof Error ? error.message : 'Invalid JSON.');
  }
  return JSON.stringify(parsed);
}

export function validateJson(text) {
  try {
    formatJson(text, 2);
    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof JsonFormatError ? error.message : 'Invalid JSON.'
    };
  }
}
