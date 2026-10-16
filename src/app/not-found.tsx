import Link from 'next/link';
export default function NotFound() { return <div className="standard-page"><div className="page-heading"><h1>File not found<span>.</span></h1><p>This file does not exist, is private, or is unavailable.</p></div><Link href="/" className="primary-button">Back to README ↗</Link></div>; }
