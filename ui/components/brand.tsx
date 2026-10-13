export function BrandMark() {
  return <span className="brand-mark"><img src="/brand/repospec-mark.svg" className="brand-monogram" alt="" aria-hidden="true" width={30} height={30}/></span>;
}
export default function Brand({ light = false }: { light?: boolean }) {
  return <a href="/" translate="no" className={`brand-lockup ${light ? 'brand-light' : ''}`} aria-label="RepoSpec home"><BrandMark/><span>RepoSpec<span className="brand-period">.</span></span></a>;
}
