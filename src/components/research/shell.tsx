'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { project, launchInfo } from '@/config/project';
import { PixelBackground, useBackgroundMotion } from '../pixel-background';
import { CursorFollower } from './cursor-follower';
const pages = [
  { href: '/', label: 'Observatory', index: '01', file: 'observatory' },
  { href: '/experiments', label: 'Experiments', index: '02', file: 'cases/' },
  { href: '/diagnostics', label: 'Diagnostics', index: '03', file: 'diagnostics' },
  { href: '/source', label: 'Source', index: '04', file: 'source/' },
  { href: '/build-log', label: 'Build Log', index: '05', file: 'build-log/' },
  { href: '/origin', label: 'Origin / README', index: '06', file: 'README.md' },
];
export function ResearchShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const [open, setOpen] = useState(false); const [notice, setNotice] = useState('');
  const side = useRef<HTMLElement>(null); const menu = useRef<HTMLButtonElement>(null); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const motion = useBackgroundMotion(); const launch = launchInfo(project); const origin = pathname.startsWith('/origin');
  const current = pages.find(page => page.href === '/' ? pathname === '/' : pathname.startsWith(page.href)) || (pathname.startsWith('/lab') ? pages[1] : pages[0]);
  useEffect(() => {
    if (!open) return;
    function escape(event: KeyboardEvent) { if (event.key === 'Escape') { setOpen(false); menu.current?.focus(); } }
    function outside(event: PointerEvent) { if (!side.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) setOpen(false); }
    const media = matchMedia('(min-width: 901px)'); const resize = () => { if (media.matches) setOpen(false); };
    document.addEventListener('keydown', escape); document.addEventListener('pointerdown', outside); media.addEventListener('change', resize);
    return () => { document.removeEventListener('keydown', escape); document.removeEventListener('pointerdown', outside); media.removeEventListener('change', resize); };
  }, [open]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { if (pathname === '/' && /^#chapter-\d+$/.test(location.hash)) location.replace('/origin' + location.hash); }, [pathname]);
  async function copyCA() {
    try { await navigator.clipboard.writeText(project.solanaCA); setNotice('Contract address copied.'); } catch { setNotice('Clipboard unavailable.'); }
    if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setNotice(''), 2200);
  }
  return <div className={'research-frame' + (origin ? ' origin-frame' : '')}>
    <PixelBackground animated={motion.animated}/>
    <CursorFollower enabled={motion.ready&&!motion.reduced}/>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="research-mobile-header"><Link href="/" className="research-brand" onClick={() => setOpen(false)}><img src="/repro-token-logo.png" alt="" width="34" height="34"/>REPRO<span>.</span></Link><button ref={menu} type="button" className="research-menu-button" aria-expanded={open} aria-controls="research-explorer" onClick={() => setOpen(!open)}>{open ? 'Close −' : 'Explorer +'}</button></header>
    {open ? <div className="explorer-backdrop" aria-hidden="true"/> : null}
    <aside ref={side} className={'research-explorer' + (open ? ' explorer-open' : '')} id="research-explorer" aria-label="Project explorer">
      <Link href="/" className="research-brand" onClick={() => setOpen(false)}><img src="/repro-token-logo.png" alt="" width="38" height="38"/>REPRO<span>.</span></Link>
      <p className="explorer-description">Software failure<br/>research environment.</p>
      <div className="explorer-root"><span>⌄</span> REPRO /</div>
      <nav aria-label="Main navigation">{pages.map(page => <Link key={page.href} href={page.href} aria-current={current.href === page.href ? 'page' : undefined} onClick={() => setOpen(false)}><span>{page.index}</span><div>{page.label}<code>{page.file}</code></div><span className="explorer-active-mark" aria-hidden="true">↗</span></Link>)}</nav>
      <div className="explorer-method"><span>METHOD</span><p>Failure → reproduction<br/>→ diagnosis → verification</p><Link href="/source?file=research-interpreter" onClick={() => setOpen(false)}>Inspect the model ↗</Link></div>
      <div className="explorer-project-links"><nav aria-label="Project links">{project.xUrl ? <a href={project.xUrl} target="_blank" rel="noreferrer">X ↗</a> : <button type="button" disabled title="Official X account not configured">X</button>}<button type="button" disabled={!launch.launched} onClick={copyCA} title={launch.launched ? 'Copy contract address' : 'Contract address unavailable before launch'}>{notice.startsWith('Contract') ? 'COPIED' : 'CA'}</button>{launch.buyUrl ? <a href={launch.buyUrl} target="_blank" rel="noreferrer">BUY ↗</a> : <button type="button" disabled title="REPRO has not launched">BUY ↗</button>}</nav><span className="research-launch-state">{launch.launched ? 'LAUNCHED' : 'NOT LAUNCHED'}</span><a href={project.repository} target="_blank" rel="noreferrer">GitHub / source ↗</a></div>
    </aside>
    <div className="research-content"><div className="research-topbar"><span>REPRO / <strong>{current.label}</strong></span><span>{['/', '/experiments', '/diagnostics', '/lab'].includes(pathname) ? 'DETERMINISTIC LOCAL MODEL' : origin ? 'ORIGIN / AUTHOR NARRATIVE' : 'SOURCE & ENGINEERING RECORDS'}</span></div>
      <main id="main" className="site-main">{children}</main>
      <footer className="research-footer"><div><span>REPRO</span><span>MAKE IT BREAK FIRST.</span></div><button className="motion-toggle" type="button" aria-label="Background motion" aria-pressed={motion.animated} disabled={!motion.ready || motion.reduced} onClick={motion.toggle}>Background motion: {motion.reduced ? 'reduced' : motion.animated ? 'on' : 'off'}</button></footer>
    </div><span className="sr-only" role="status">{notice}</span>
  </div>;
}
