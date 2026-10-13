'use client';
import { useEffect, useState } from 'react';
import { CheckIcon, CopyIcon, FileTextIcon, MixerHorizontalIcon } from '@radix-ui/react-icons';
import type { ContextResult, Snapshot } from '../../src/snapshot';
import type { Section } from '../../src/model';
const labels: Record<Section, string> = { database: 'Database schemas', routes: 'API routes', types: 'TypeScript contracts', rules: 'Architecture rules' };
export default function LandingDemo({ snapshot, initial }: { snapshot: Snapshot; initial: ContextResult }) {
  const [result, setResult] = useState(initial), [disabled, setDisabled] = useState<Section[]>([]), [budget, setBudget] = useState(2500), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const response = await fetch('/api/context', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ snapshot, options: { budget, disabledFiles: [], disabledSections: disabled } }), signal: controller.signal });
        if (!response.ok) throw new Error('Preview unavailable. Try opening the workspace.');
        setResult(await response.json()); setMessage('');
      } catch (error) { if (!controller.signal.aborted) setMessage((error as Error).message); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [budget, disabled, snapshot]);
  async function copy() { try { await navigator.clipboard.writeText(result.markdown); setMessage('Example context copied.'); } catch { setMessage('Select the preview text to copy it.'); } }
  return <div className="demo-shell">
    <div className="demo-topbar"><span><span className="demo-window-dot"/>CONTEXT WORKSPACE</span><span className="demo-fixture">EXAMPLE REPOSITORY</span></div>
    <div className="demo-columns"><div className="demo-controls"><div className="demo-label"><MixerHorizontalIcon aria-hidden="true"/>Make room for what matters</div><h3>One budget.<br/>Your priorities.</h3><p>Try the controls. These contracts come from a real, small fixture parsed by RepoSpec.</p><div className="demo-section-toggles">{(Object.keys(labels) as Section[]).map(section => <label key={section}><span>{labels[section]}</span><input className="toggle" type="checkbox" checked={!disabled.includes(section)} onChange={() => setDisabled(current => current.includes(section) ? current.filter(s => s !== section) : [...current, section])}/></label>)}</div><label htmlFor="demo-budget" className="demo-budget-label">Token budget <span>{budget.toLocaleString()}</span></label><input id="demo-budget" type="range" min="100" max="2500" step="100" value={budget} onChange={e => setBudget(Number(e.target.value))}/><div className="demo-budget-meter"><div style={{ width: `${Math.min(100, result.tokens / budget * 100)}%` }}/></div><div className="demo-total"><strong>{result.tokens.toLocaleString()}</strong> / {budget.toLocaleString()} tokens<span>{busy ? 'Updating…' : result.pruned ? 'Compacted to fit' : 'Within budget'}</span></div></div>
    <div className="demo-editor"><div className="demo-editor-bar"><span><FileTextIcon aria-hidden="true"/>.ai-context.md</span><button aria-label="Copy example context" onClick={() => void copy()}><CopyIcon aria-hidden="true"/></button></div><pre aria-busy={busy} tabIndex={0} aria-label="Example generated context">{result.markdown}</pre><div className="demo-editor-footer"><span><CheckIcon aria-hidden="true"/>Generated from source</span><span>o200k_base</span></div></div></div><div className="demo-notice" role="status" aria-live="polite">{message || 'Example data only. Your repository analysis uses your actual code.'}</div>
  </div>;
}
