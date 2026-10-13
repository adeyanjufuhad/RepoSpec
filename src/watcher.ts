import chokidar from 'chokidar';
import picomatch from 'picomatch';
import path from 'node:path';
import { ALWAYS_IGNORE, loadConfig, slash } from './config';
import { ScanEngine, syncOutputs } from './engine';

export async function watchWorkspace(root: string, options: { config?: string; budget?: number; dryRun?: boolean; verbose?: boolean }, log: (message: string) => void = console.log) {
  const engine = new ScanEngine();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending = false;
  let running = false;
  let closed = false;
  const ignored = picomatch(ALWAYS_IGNORE, { dot: true });
  const watcher = chokidar.watch(root, {
    ignoreInitial: true,
    ignored: (p: string) => {
      const relative = slash(path.relative(root, p));
      return !!relative && (ignored(relative) || relative.split('/').some(s => ['node_modules', '.git', '.next', 'dist', 'coverage', '.repospec'].includes(s)));
    },
    awaitWriteFinish: { stabilityThreshold: 80, pollInterval: 20 },
  });
  const ready = new Promise<void>((resolve, reject) => { watcher.once('ready', resolve); watcher.once('error', reject); });
  const rebuild = async () => {
    if (closed) return;
    if (running) { pending = true; return; }
    running = true;
    do {
      pending = false;
      try {
        const { config } = await loadConfig(root, options.config, options.budget);
        const result = await engine.scan(root, config);
        if (options.dryRun) log(result.markdown);
        else await syncOutputs(root, config, result);
        log(`Updated ${result.tokens} tokens; parsed ${result.parsedFiles} files in ${result.durationMs} ms.`);
        result.warnings.forEach(w => log(`Warning: ${w}`));
      } catch (error) { log(`Rebuild failed: ${(error as Error).message}. Watching for the next change.`); }
    } while (pending && !closed);
    running = false;
  };
  watcher.on('all', async (_event, file) => {
    try {
      const { config, configFile } = await loadConfig(root, options.config, options.budget);
      const relative = slash(path.relative(root, file));
      if (config.output.includes(relative)) return;
      const includes = picomatch(config.include, { dot: true });
      const excludes = picomatch(config.exclude, { dot: true });
      if (path.resolve(file) !== configFile && relative !== 'package.json' && relative !== config.rulesFile && (!includes(relative) || excludes(relative))) return;
    } catch { /* Invalid config must still allow the next config edit to trigger a retry. */ }
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void rebuild(); }, 100);
  });
  // Rules live in the intentionally ignored .repospec directory: watch them separately.
  const initial = await loadConfig(root, options.config, options.budget);
  const rulesWatcher = chokidar.watch(path.join(root, initial.config.rulesFile), { ignoreInitial: true });
  rulesWatcher.on('all', () => { if (timer) clearTimeout(timer); timer = setTimeout(() => { void rebuild(); }, 100); });
  for (const current of [watcher, rulesWatcher]) current.on('error', error => { log(`Watcher error: ${String(error)}`); process.exitCode = 1; });
  await ready;
  await rebuild();
  log(`Watching ${root}. Press Ctrl+C to stop.`);
  return {
    async close() {
      closed = true;
      if (timer) clearTimeout(timer);
      await Promise.all([watcher.close(), rulesWatcher.close()]);
      while (running) await new Promise(resolve => setTimeout(resolve, 20));
    },
  };
}

