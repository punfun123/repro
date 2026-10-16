'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { project, launchInfo } from '@/config/project';
const files = [{ href: '/', name: 'README.md', icon: 'M', folder: '' }, { href: '/lab', name: 'experiment', icon: 'λ', folder: 'lab' }, { href: '/source', name: 'core', icon: '{ }', folder: 'source' }, { href: '/build-log', name: 'experiments', icon: '≡', folder: 'build-log' }];
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const [open, setOpen] = useState(false); const [copied, setCopied] = useState(false);
  const active = files.find(file => file.href === '/' ? pathname === '/' : pathname.startsWith(file.href)) || files[0];
  const launch = launchInfo(project);
  useEffect(() => { if (!open) return; const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); }; window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape); }, [open]);
  async function copyCA() { try { await navigator.clipboard.writeText(project.solanaCA); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); } }
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="topbar"><Link href="/" className="brand" onClick={() => setOpen(false)}><img src="/repro-bug.png" alt="" width="41" height="41"/><span>REPRO<span className="brand-dot">.</span></span></Link><span className="top-description">a public software experiment</span><nav className="top-actions" aria-label="Project links">{project.xUrl ? <a href={project.xUrl} target="_blank" rel="noreferrer">X ↗</a> : <button disabled title="Official X account has not been configured">X ↗</button>}<button disabled={!launch.launched} onClick={copyCA}>{copied ? 'COPIED' : 'CA'}</button>{launch.buyUrl ? <a className="buy" href={launch.buyUrl} target="_blank" rel="noreferrer">BUY ↗</a> : <button className="buy" disabled>BUY ↗</button>}<span className="launch-state"><i/>{launch.launched ? 'LAUNCHED' : 'NOT LAUNCHED'}</span></nav></header>
    <button className="mobile-directory" aria-expanded={open} aria-controls="explorer" onClick={() => setOpen(!open)}><span>{open ? '×' : '☰'} &nbsp; Files</span><span>{active.name}</span></button>
    {open ? <button className="nav-scrim" aria-label="Close file explorer" onClick={() => setOpen(false)}/> : null}
    <aside id="explorer" className={`explorer ${open ? 'is-open' : ''}`} aria-label="File explorer"><div className="explorer-title">EXPLORER <span>···</span></div><div className="root-label">⌄ &nbsp; REPRO<span>/</span></div><nav>{files.map(file => <div key={file.href}>{file.folder ? <div className="folder-label">⌄ &nbsp;<span className="folder-icon">▱</span> {file.folder}<span>/</span></div> : null}<Link className={`file-link ${active.href === file.href ? 'selected' : ''} ${file.folder ? 'nested' : ''}`} href={file.href} onClick={() => setOpen(false)} aria-current={active.href === file.href ? 'page' : undefined}><span className={`file-icon ${file.href === '/' ? 'md-icon' : ''}`}>{file.icon}</span>{file.name}{active.href === file.href ? <span className="file-dot"/> : null}</Link></div>)}</nav><div className="explorer-note"><span className="tiny-label">THE PRINCIPLE</span><p>An answer is a hypothesis.<br/>A test is evidence.</p><Link href="/lab" onClick={() => setOpen(false)}>Open the lab <span>↗</span></Link></div><div className="explorer-bottom"><span className="branch">⑂ &nbsp; main</span><span>v0.1.0</span></div></aside>
    <div className="workspace"><div className="file-tab"><span className="tab-icon">{active.icon}</span>{active.name}<span className="tab-close">×</span></div><div className="breadcrumb">REPRO <span>/</span> {active.folder ? <>{active.folder}<span>/</span></> : null}<strong>{active.name}</strong><span className="breadcrumb-type">{active.href === '/' ? 'Markdown' : 'Workspace'}</span></div><main id="main">{children}</main></div>
    <footer className="statusbar"><span><span className="status-square">↗</span> MAKE IT BREAK FIRST.</span><span>JavaScript <span className="footer-separator">·</span> UTF-8 <span className="footer-separator">·</span> <span className="status-muted">$REPRO</span></span></footer>
  </>;
}
