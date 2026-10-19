'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { project, launchInfo } from '@/config/project';
import { PixelBackground, useBackgroundMotion } from './pixel-background';

const pages = [
  { href: '/', label: 'Story' },
  { href: '/lab', label: 'Lab' },
  { href: '/source', label: 'Source' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [copyNotice, setCopyNotice] = useState('');
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const motion = useBackgroundMotion();
  const launch = launchInfo(project);

  useEffect(() => {
    if (!open) return;
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') { setOpen(false); menuButtonRef.current?.focus(); }
    }
    function outside(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    const desktop = window.matchMedia('(min-width: 760px)');
    function resize() { if (desktop.matches) setOpen(false); }
    window.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', outside);
    desktop.addEventListener('change', resize);
    return () => {
      window.removeEventListener('keydown', escape);
      document.removeEventListener('pointerdown', outside);
      desktop.removeEventListener('change', resize);
    };
  }, [open]);

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  async function copyCA() {
    try { await navigator.clipboard.writeText(project.solanaCA); setCopyNotice('Contract address copied.'); }
    catch { setCopyNotice('Clipboard unavailable. Please try again.'); }
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyNotice(''), 2200);
  }

  return <>
    <PixelBackground animated={motion.animated} />
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header" ref={headerRef}>
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="REPRO home" onClick={() => setOpen(false)}>
          <img src="/repro-bug.png" alt="" width="42" height="42" />
          <span>REPRO<span className="brand-dot">.</span></span>
        </Link>
        <button className="menu-button" ref={menuButtonRef} type="button" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'}<span aria-hidden="true">{open ? '−' : '+'}</span></button>
        <div id="site-menu" className={`header-menu${open ? ' is-open' : ''}`}>
          <nav className="main-navigation" aria-label="Main navigation">
            {pages.map(page => {
              const selected = page.href === '/' ? pathname === '/' : pathname === page.href || pathname.startsWith(`${page.href}/`);
              return <Link key={page.href} href={page.href} className={selected ? 'active' : undefined} aria-current={selected ? 'page' : undefined} onClick={() => setOpen(false)}>{page.label}</Link>;
            })}
          </nav>
          <nav className="token-actions" aria-label="Project links">
            {project.xUrl ? <a href={project.xUrl} target="_blank" rel="noreferrer">X</a> : <button type="button" disabled title="Official X account has not been configured">X</button>}
            <button type="button" disabled={!launch.launched} title={launch.launched ? 'Copy the contract address' : 'Contract address is not available before launch'} onClick={copyCA}>{copyNotice.startsWith('Contract') ? 'COPIED' : 'CA'}</button>
            {launch.buyUrl ? <a className="buy-link" href={launch.buyUrl} target="_blank" rel="noreferrer">BUY ↗</a> : <button type="button" className="buy-link" disabled title="REPRO has not launched">BUY ↗</button>}
            <span className="launch-state"><i aria-hidden="true" />{launch.launched ? 'LAUNCHED' : 'NOT LAUNCHED'}</span>
          </nav>
        </div>
      </div>
      <span className="sr-only" role="status">{copyNotice}</span>
    </header>
    <main id="main" className="site-main">{children}</main>
    <footer className="site-footer">
      <div><Link href="/">REPRO</Link><span>MAKE IT BREAK FIRST.</span></div>
      <button className="motion-toggle" type="button" aria-label="Background motion" aria-pressed={motion.animated} disabled={!motion.ready || motion.reduced} onClick={motion.toggle} title={motion.reduced ? 'Your system preference reduces motion.' : 'Turn the decorative background animation on or off'}>
        <span className={motion.animated ? 'motion-indicator on' : 'motion-indicator'} aria-hidden="true" />Background motion: {motion.reduced ? 'reduced' : motion.animated ? 'on' : 'off'}
      </button>
    </footer>
  </>;
}
