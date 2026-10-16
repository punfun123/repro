import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-sql';
Prism.manual = true;

export interface SyntaxPart { text: string; className?: string }
export function syntaxParts(text: string, language = 'javascript'): SyntaxPart[] {
  const grammar = Prism.languages[language];
  if (!grammar) return [{ text }];
  const parts: SyntaxPart[] = [];
  function flatten(value: string | Prism.Token | (string | Prism.Token)[], classes: string[] = []) {
    if (typeof value === 'string') { parts.push({ text: value, className: classes.length ? `token ${classes.join(' ')}` : undefined }); return; }
    if (Array.isArray(value)) { for (const child of value) flatten(child, classes); return; }
    const aliases = value.alias ? (Array.isArray(value.alias) ? value.alias : [value.alias]) : [];
    flatten(value.content, [...classes, value.type, ...aliases]);
  }
  flatten(Prism.tokenize(text, grammar));
  return parts;
}

export function syntaxLines(text: string, language = 'javascript'): SyntaxPart[][] {
  const lines: SyntaxPart[][] = [[]];
  for (const part of syntaxParts(text.replaceAll('\r\n', '\n'), language)) {
    const chunks = part.text.split('\n');
    chunks.forEach((chunk, index) => {
      if (index) lines.push([]);
      if (chunk) lines[lines.length - 1].push({ ...part, text: chunk });
    });
  }
  return lines;
}
