import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Link from 'next/link';
import Markdown from 'react-markdown';
import { StoryExample } from '@/components/story-example';

export default async function Home() {
  const raw = await readFile(path.join(process.cwd(), 'content/story.md'), 'utf8');
  const sections = raw.split(/^### /m).slice(1).map(section => {
    const split = section.indexOf('\n');
    return { title: section.slice(0, split).trim(), body: section.slice(split + 1) };
  });

  return <article className="story-home">
    <header className="story-hero">
      <h1><span>I got tired of AI</span><span>telling me my</span><span>code was fixed.</span></h1>
      <p className="story-subtitle">Why I’m building an AI that has to prove its answers.</p>
      <div className="story-actions">
        <a className="story-read-link" href="#chapter-1">Read my story <span aria-hidden="true">→</span></a>
        <Link href="/lab">Open the lab <span aria-hidden="true">↗</span></Link>
      </div>
      <p className="author-signature">— REPRO Developer</p>
      <p className="author-note">I wrote this as a creative origin story. My <Link href="/build-log">build log</Link> records what I’ve actually built and tested.</p>
      <div className="hero-mascot"><img src="/repro-bug-transparent.png" alt="REPRO’s red pixel bug" width="360" height="360" fetchPriority="high" /></div>
    </header>

    <div className="story-chapters">
      {sections.map((section, index) => <section className="story-chapter" id={`chapter-${index + 1}`} key={section.title}>
        <header className="chapter-heading">
          <span className="chapter-number">{section.title.slice(0, 2)}<span aria-hidden="true">—</span></span>
          <h2>{section.title.slice(5)}</h2>
        </header>
        <div className="chapter-copy">
          <Markdown components={{ pre: ({ children }) => <div className="markdown-example"><div className="code-caption">EXAMPLE · illustrative code</div><pre>{children}</pre></div> }}>{section.body}</Markdown>
          {index === 0 ? <StoryExample kind="error" /> : index === 3 ? <StoryExample kind="bug" /> : index === 4 ? <StoryExample kind="patch" /> : null}
        </div>
      </section>)}
    </div>

    <div className="story-end">
      <img src="/repro-bug.png" alt="" width="88" height="88" />
      <div><p>I’ve told you why. Now, let’s look at the code.</p><div><Link href="/lab">Open the experiment ↗</Link><Link href="/source">Read the source ↗</Link></div></div>
    </div>
  </article>;
}
