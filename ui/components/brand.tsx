import { CodeIcon } from '@radix-ui/react-icons';
export default function Brand({ light = false }: { light?: boolean }) {
  return <a href="/" translate="no" className={`brand-lockup ${light ? 'brand-light' : ''}`} aria-label="RepoSpec home"><span className="brand-mark"><CodeIcon aria-hidden="true" width={22} height={22}/></span><span>RepoSpec<span className="brand-period">.</span></span></a>;
}
