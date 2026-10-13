'use client';
import type { ContextResult } from '../../src/snapshot';
type File = ContextResult['files'][number];
type Rect<T> = { item: T; x: number; y: number; width: number; height: number };
const colors = ['#023e8a', '#0077b6', '#0096c7', '#00b4d8', '#48cae4', '#90e0ef', '#ade8f4', '#caf0f8'];
/** Binary partition: rectangle area is proportional to token weight. */
function partition<T>(items: T[], weight: (item: T) => number, x = 0, y = 0, width = 100, height = 100): Rect<T>[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ item: items[0], x, y, width, height }];
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let split = 1, amount = weight(items[0]);
  while (split < items.length - 1 && amount + weight(items[split]) / 2 < total / 2) amount += weight(items[split++]);
  const ratio = amount / total;
  if (width * 2 >= height) return [...partition(items.slice(0, split), weight, x, y, width * ratio, height), ...partition(items.slice(split), weight, x + width * ratio, y, width * (1 - ratio), height)];
  return [...partition(items.slice(0, split), weight, x, y, width, height * ratio), ...partition(items.slice(split), weight, x, y + height * ratio, width, height * (1 - ratio))];
}
export default function Treemap({ files, onToggle }: { files: File[]; onToggle: (path: string) => void }) {
  const useful = files.filter(f => f.tokens > 0).sort((a, b) => b.tokens - a.tokens);
  const groups = new Map<string, File[]>();
  useful.forEach(f => { const dir = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : '.'; groups.set(dir, [...(groups.get(dir) ?? []), f]); });
  const directoryRects = partition([...groups], ([, values]) => values.reduce((n, f) => n + f.tokens, 0));
  const rects = directoryRects.flatMap(rect => partition(rect.item[1], f => f.tokens, rect.x, rect.y, rect.width, rect.height));
  const tiny = rects.filter(r => r.width < 12 || r.height < 18);
  if (!useful.length) return <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No extractable contracts yet. Add schema, route, or exported type files to your include patterns.</div>;
  return <div>
    <div className="relative h-64 overflow-hidden rounded-lg bg-slate-100" aria-label="Source token treemap. Area represents tokens before pruning.">
      {rects.map(({ item: file, x, y, width, height }, index) => {
        const small = width < 12 || height < 18;
        return <button key={file.path} onClick={() => onToggle(file.path)} aria-label={`${file.path}: ${file.tokens} tokens. ${file.included ? 'Included' : 'Excluded'}`} aria-pressed={file.included} tabIndex={small ? -1 : 0} title={`${file.path}: ${file.tokens} tokens. Click to ${file.included ? 'exclude' : 'include'}.`} className="treemap-cell absolute flex flex-col items-start justify-end overflow-hidden border border-white/80 text-left transition-opacity hover:opacity-85" style={{ left: `${x}%`, top: `${y}%`, width: `${width}%`, height: `${height}%`, padding: small ? 0 : 14, background: file.included ? colors[index % colors.length] : '#e2e8f0', color: file.included && index % colors.length < 2 ? '#fff' : '#03045e' }}>
          {!small && <><span className="mb-auto max-w-full truncate font-mono text-[10px] opacity-80">{file.path.slice(0, file.path.lastIndexOf('/') + 1) || './'}</span><span className="max-w-full truncate font-mono text-xs font-medium">{file.path.split('/').at(-1)}</span><span className="mt-1 font-mono text-[11px]">{file.tokens.toLocaleString()} tokens{!file.included ? ' · excluded' : ''}</span></>}
        </button>;
      })}
    </div>
    {tiny.length > 0 && <div className="mt-3 flex flex-wrap gap-2" aria-label="Controls for small treemap files">{tiny.map(({ item: file }) => <button key={file.path} className="min-h-11 rounded-md border border-slate-200 px-2 py-1 font-mono text-[10px] text-slate-600 hover:border-[#0077b6]" aria-pressed={file.included} onClick={() => onToggle(file.path)}>{file.path} · {file.tokens}{!file.included ? ' · excluded' : ''}</button>)}</div>}
  </div>;
}
