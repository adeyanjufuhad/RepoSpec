'use client';
import type { DashboardData } from '@/lib/server';
type File = DashboardData['files'][number];
const colors = ['#023e8a', '#0077b6', '#0096c7', '#00b4d8', '#48cae4', '#90e0ef', '#ade8f4', '#caf0f8'];
export default function Treemap({ files, onToggle }: { files: File[]; onToggle: (path: string) => void }) {
  const useful = files.filter(f => f.tokens > 0);
  const groups = new Map<string, File[]>();
  useful.forEach(f => { const dir = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : '.'; groups.set(dir, [...(groups.get(dir) ?? []), f]); });
  const entries = [...groups].sort((a, b) => b[1].reduce((n, f) => n + f.tokens, 0) - a[1].reduce((n, f) => n + f.tokens, 0));
  const total = useful.reduce((n, f) => n + f.tokens, 0);
  if (!total) return <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No extractable contracts yet. Add schema, route, or exported type files to your include patterns.</div>;
  return <div className="flex min-h-64 flex-wrap gap-1.5" aria-label="Source token treemap. Area represents tokens before pruning.">
    {entries.map(([dir, values], i) => {
      const weight = values.reduce((n, f) => n + f.tokens, 0);
      return <div key={dir} className="flex min-w-28 flex-col overflow-hidden rounded-lg bg-slate-100" style={{ flexGrow: weight, flexBasis: `${Math.max(12, weight / total * 80)}%` }}>
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-[10px] font-medium text-slate-600"><span className="truncate font-mono">{dir}/</span><span className="font-mono">{weight.toLocaleString()}</span></div>
        <div className="flex min-h-36 flex-1 flex-wrap gap-px">{values.map((file, j) => <button key={file.path} onClick={() => onToggle(file.path)} aria-pressed={file.included} title={`${file.path}: ${file.tokens} tokens. Click to ${file.included ? 'exclude' : 'include'}.`} className="treemap-cell relative flex min-h-16 min-w-20 flex-col items-start justify-end overflow-hidden p-3 text-left transition-opacity hover:opacity-85" style={{ flexGrow: file.tokens, flexBasis: `${Math.max(20, file.tokens / weight * 70)}%`, background: file.included ? colors[(i + j) % colors.length] : '#e2e8f0', color: file.included && (i + j) % colors.length < 3 ? '#fff' : '#03045e' }}><span className="max-w-full truncate font-mono text-[11px] font-medium">{file.path.split('/').at(-1)}</span><span className="mt-1 font-mono text-[10px] opacity-80">{file.tokens.toLocaleString()} tokens{!file.included ? ' · excluded' : ''}</span></button>)}</div>
      </div>;
    })}
  </div>;
}
