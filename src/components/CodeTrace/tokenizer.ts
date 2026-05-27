export type TokenType =
  | 'hook'
  | 'keyword'
  | 'string'
  | 'number'
  | 'jsx'
  | 'comment'
  | 'text';

export interface Token {
  type: TokenType;
  text: string;
}

const HOOKS = new Set([
  'useState',
  'useEffect',
  'useRef',
  'useMemo',
  'useCallback',
  'useContext',
  'useReducer',
  'useLayoutEffect',
]);

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for',
  'while', 'import', 'export', 'default', 'from', 'async', 'await',
  'new', 'class', 'null', 'true', 'false', 'undefined', 'void',
  'typeof', 'instanceof', 'extends',
]);

/**
 * Converts a single line of code into typed tokens for syntax colouring.
 * Single-pass, character-level — safe against nested replacements.
 */
export function tokenize(line: string): Token[] {
  if (!line.trim()) return [{ type: 'text', text: line }];

  const tokens: Token[] = [];
  let pos = 0;
  const len = line.length;

  while (pos < len) {
    const ch = line[pos];

    // Comment: //
    if (ch === '/' && line[pos + 1] === '/') {
      tokens.push({ type: 'comment', text: line.slice(pos) });
      break;
    }

    // String: ' " `
    if (ch === '"' || ch === "'" || ch === '`') {
      const q = ch;
      let end = pos + 1;
      while (end < len) {
        if (line[end] === '\\') { end += 2; continue; }
        if (line[end] === q) { end++; break; }
        end++;
      }
      tokens.push({ type: 'string', text: line.slice(pos, end) });
      pos = end;
      continue;
    }

    // Arrow =>
    if (ch === '=' && line[pos + 1] === '>') {
      tokens.push({ type: 'keyword', text: '=>' });
      pos += 2;
      continue;
    }

    // JSX / HTML angle tags: <Tag  </Tag  />
    if (ch === '<') {
      let end = pos + 1;
      if (line[end] === '/') end++;
      while (end < len && /[a-zA-Z0-9._-]/.test(line[end])) end++;
      if (end > pos + 1) {
        tokens.push({ type: 'jsx', text: line.slice(pos, end) });
        pos = end;
        continue;
      }
    }
    if (ch === '/' && line[pos + 1] === '>') {
      tokens.push({ type: 'jsx', text: '/>' });
      pos += 2;
      continue;
    }

    // Identifier / keyword / hook
    if (/[a-zA-Z_$]/.test(ch)) {
      let end = pos;
      while (end < len && /[a-zA-Z0-9_$]/.test(line[end])) end++;
      const word = line.slice(pos, end);
      tokens.push({
        type: HOOKS.has(word) ? 'hook' : KEYWORDS.has(word) ? 'keyword' : 'text',
        text: word,
      });
      pos = end;
      continue;
    }

    // Number
    if (/\d/.test(ch)) {
      let end = pos;
      while (end < len && /[\d.]/.test(line[end])) end++;
      tokens.push({ type: 'number', text: line.slice(pos, end) });
      pos = end;
      continue;
    }

    // Everything else — one char at a time
    tokens.push({ type: 'text', text: ch });
    pos++;
  }

  return tokens;
}
