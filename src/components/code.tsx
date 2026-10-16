import { syntaxParts, type SyntaxPart } from '@/source/syntax';
export function SyntaxText({ parts }: { parts: SyntaxPart[] }) { return <>{parts.map((part, index) => <span key={index} className={part.className}>{part.text}</span>)}</>; }
export function Code({ text, language = 'typescript' }: { text: string; language?: string }) {
  return <pre className="code-block"><code data-language={language}><SyntaxText parts={syntaxParts(text, language)}/></code></pre>;
}
