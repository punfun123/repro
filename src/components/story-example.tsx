'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { BugMascotAnimation } from './bug-mascot-animation';
import { CodeDiffViewer } from './code-diff-viewer';

export function StoryExample({ kind }: { kind: 'error' | 'bug' | 'patch' }) {
  const root = useRef<HTMLDivElement>(null); const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); } }, { threshold: 0.2 });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={root} className={visible ? 'example-visible' : 'example-pending'}><Example kind={kind} visible={visible}/></div>;
}
function DemoLabel() { return <figcaption><span>ILLUSTRATIVE DEMO — NOT A LIVE AI EXPERIMENT</span></figcaption>; }
function Example({ kind, visible }: { kind: 'error' | 'bug' | 'patch'; visible: boolean }) {
  if (kind === 'error') return <figure className="story-example error-example"><DemoLabel/><p className="illustrative-claim">AI: “The issue has been fixed.”</p><pre><span className="line-number">1</span><span className="syntax-keyword">const</span> user = <span className="syntax-value">undefined</span>;{'\n'}<span className="error-line"><span className="line-number">2</span>console.log(user.id); <span className="error-pointer">←</span></span></pre><div className="example-error"><span>×</span> TypeError: Cannot read properties of undefined</div><p>Conceptual failure display. No model call or code execution occurs here.</p></figure>;
  if (kind === 'bug') return <figure className="story-example bug-example"><DemoLabel/><BugMascotAnimation illustrative animate={visible}/><p className="story-repro-principle">MAKE IT BREAK FIRST.</p></figure>;
  return <figure className="story-example patch-example"><DemoLabel/><CodeDiffViewer original="console.log(user.id);" candidate="console.log(user?.id ?? null);" outcome="UNVERIFIED" allowCopy/><p>Removing an exception may hide invalid data. The intended behavior still needs a test. <Link href="/build-log/2026-10-16-002-isolated-harness">Read the recorded controlled harness test ↗</Link></p></figure>;
}
