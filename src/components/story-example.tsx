'use client';
import { useEffect, useRef, useState } from 'react';
export function StoryExample({ kind }: { kind: 'error' | 'bug' | 'patch' }) {
  const root = useRef<HTMLDivElement>(null); const [visible, setVisible] = useState(false);
  useEffect(() => { const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); } }, { threshold: 0.2 }); if (root.current) observer.observe(root.current); return () => observer.disconnect(); }, []);
  return <div ref={root} className={visible ? 'example-visible' : 'example-pending'}><Example kind={kind}/></div>;
}
function Example({ kind }: { kind: 'error' | 'bug' | 'patch' }) {
  if (kind === 'error') return <figure className="story-example error-example"><figcaption><span>EXAMPLE 001</span><span>JavaScript · illustrative</span></figcaption><pre><span className="line-number">1</span><span className="syntax-keyword">const</span> user = <span className="syntax-value">undefined</span>;{'\n'}<span className="error-line"><span className="line-number">2</span>console.log(user.id); <span className="error-pointer">←</span></span></pre><div className="example-error"><span>×</span> TypeError: Cannot read properties of undefined</div><p>Narrative example. This is not a live execution log.</p></figure>;
  if (kind === 'bug') return <figure className="story-example bug-example"><figcaption><span>THE IDEA, IN TWO BUGS</span><span>Illustration</span></figcaption><div className="bug-track"><img src="/repro-bug.png" width="92" height="92" alt="Original red pixel bug"/><span>→</span><img className="reproduced-bug" src="/repro-bug.png" width="92" height="92" alt="Reproduced red pixel bug"/><code>BUG REPRODUCED<span>same failure. observable evidence.</span></code></div></figure>;
  return <figure className="story-example patch-example"><figcaption><span>A CANDIDATE, NOT A CONCLUSION</span><span>Example diff</span></figcaption><pre><span className="diff-remove">− console.log(user.id);</span>{'\n'}<span className="diff-add">+ console.log(user?.id ?? null);</span></pre><p>Optional chaining may hide invalid data. Correctness depends on the intended behavior.</p></figure>;
}
