import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Link from 'next/link';
import { sourceFiles } from '@/source/files';
import { Code } from '@/components/code';
import { ArchitectureMap } from '@/components/architecture-map';
import { project } from '@/config/project';
import { serviceStatus } from '@/config/services';
export const metadata = { title: 'Source explorer' };
export default async function Source({ searchParams }: { searchParams: Promise<{ file?: string }> }) {
  const { file } = await searchParams;
  const selected = sourceFiles.find(source => source.id === file) || sourceFiles.find(source => source.id === 'pipeline')!;
  const source = await readFile(path.join(process.cwd(), selected.path), 'utf8');
  return <div className="standard-page source-page">
    <div className="page-heading"><span className="path-label">source / core</span><h1>The code is the evidence<span>.</span></h1><p>The actual implementation serving this project. Read it. Question it. Run it yourself.</p></div>
    <ArchitectureMap services={serviceStatus()} repository={project.repository} selectedFile={selected.id}/>
    <div className="source-repo">{project.repository ? <a href={project.repository} target="_blank" rel="noreferrer">⑂ {project.repository.replace('https://github.com/', '')} ↗</a> : <span>Local source · repository has not been published yet</span>}<span>Read-only · explicit file whitelist</span></div>
    <div className="source-layout">
      <nav aria-label="Source files" className="source-files">{sourceFiles.map(item => <Link key={item.id} href={`/source?file=${item.id}`} className={selected.id === item.id ? 'active' : ''}><span>{item.path.endsWith('.sql') ? 'SQL' : 'TS'}</span>{item.path.split('/').at(-1)}</Link>)}</nav>
      <div className="source-content"><div className="source-file-path">{selected.path}{project.repository ? <a href={`${project.repository}/blob/main/${selected.path}`} target="_blank" rel="noreferrer">GitHub ↗</a> : null}</div><p>{selected.description}</p><Code text={source} language={selected.id === 'schema' ? 'sql' : 'typescript'}/><div className="source-line-count">{source.split('\n').length} lines · UTF-8</div></div>
    </div>
  </div>;
}
