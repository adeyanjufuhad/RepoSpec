'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { ArrowRightIcon, CheckIcon, DownloadIcon, FileTextIcon, GitHubLogoIcon, LayersIcon, CodeIcon } from '@radix-ui/react-icons';
import { Reveal, useLandingMotion } from './landing-motion';

const stages = [
  { title: 'Read the source.', subtitle: 'A snapshot with a reference point', description: 'RepoSpec resolves a branch, tag, or commit to a specific GitHub commit. The context starts with that version of your code.', file: 'github.com/you/project', code: 'prisma/schema.prisma\nsrc/app/api/projects/[id]/route.ts\nsrc/types/project.ts\n.repospec/rules.md', label: 'ILLUSTRATIVE SOURCE FILES', icon: GitHubLogoIcon },
  { title: 'Find the contracts.', subtitle: 'Structure over implementation', description: 'Static parsers extract models, HTTP routes, exported types, and your architecture rules. Your application code is never executed.', file: 'extracted contracts', code: 'Table Project (id: String [PK], name: String, ownerId: String)\n\nGET /api/projects/[id] → ProjectWithTasks\n\ninterface Project { id: string; name: string; ownerId: string }', label: 'ILLUSTRATIVE EXTRACTION', icon: CodeIcon },
  { title: 'Keep what matters.', subtitle: 'Your priorities. A finite window.', description: 'Choose source files and contract sections. Set your token budget and inspect what remains after lower-priority content is pruned.', file: 'context preferences', code: 'Include database schemas     ✓\nInclude API routes           ✓\nInclude TypeScript types     ✓\nInclude architecture rules   ✓\n\nToken budget: your choice', label: 'YOU CONTROL THE SELECTION', icon: LayersIcon },
  { title: 'Make it portable.', subtitle: 'A file you can actually inspect', description: 'Copy the context or download it as Markdown, .cursorrules, or CLAUDE.md. You decide where to put it and when to refresh it.', file: '.ai-context.md', code: '# RepoSpec Context\n\n## Database\nTable Project (...)\n\n## API Routes\nGET /api/projects/[id] → ProjectWithTasks\n\n## Types\ninterface Project { ... }', label: 'ILLUSTRATIVE OUTPUT', icon: FileTextIcon },
];

export function PipelineStory() {
  const [active, setActive] = useState(0), [manual, setManual] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: .25 });
  const { stopped } = useLandingMotion();
  useEffect(() => {
    if (stopped || manual || !inView) return;
    const timer = setInterval(() => setActive(value => (value + 1) % stages.length), 5500);
    return () => clearInterval(timer);
  }, [stopped, manual, inView]);
  const stage = stages[active];
  return <section ref={ref} className="pipeline-section landing-container" id="inside-repospec">
    <Reveal className="section-intro"><div><div className="eyebrow">FOLLOW THE SIGNAL</div><h2>A lot happens.<br/>Only the useful bits stay.</h2></div><p>From a repository full of implementation<br/>to a reference your next prompt can use.<br/>Explore each part of the process.</p></Reveal>
    <div className="pipeline-layout"><div className="pipeline-selector" role="group" aria-label="Explore the extraction process">{stages.map((item, index) => <button key={item.title} aria-pressed={active === index} onClick={() => { setActive(index); setManual(true); }} className={active === index ? 'pipeline-selected' : ''}><span className="pipeline-index">0{index + 1}</span><span><strong>{item.title}</strong><small>{item.subtitle}</small></span><ArrowRightIcon aria-hidden="true"/>{active === index && <motion.i layoutId="pipeline-marker" transition={stopped ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 30 }}/>}</button>)}<button className="pipeline-autoplay" onClick={() => setManual(value => !value)} aria-pressed={!manual}>{manual ? 'Resume walkthrough' : 'Pause walkthrough'}</button></div>
      <div className="pipeline-visual"><div className="beam-grid" aria-hidden="true"><i/><i/><i/><i/><i/></div><div className="pipeline-node-map" aria-hidden="true">{stages.map(({ icon: Icon }, index) => <div key={index} className={index <= active ? 'node-complete' : ''}><Icon/>{index < 3 && <span className={index === active ? 'node-beam' : ''}/>}</div>)}</div><AnimatePresence mode="wait" initial={false}><motion.div key={active} initial={stopped ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: stopped ? 0 : -8 }} transition={{ duration: stopped ? 0 : .25 }} className="pipeline-card"><div className="pipeline-file"><stage.icon aria-hidden="true"/><span>{stage.file}</span><span>0{active + 1} / 04</span></div><pre tabIndex={0}>{stage.code}</pre><div className="pipeline-card-label"><span/>{stage.label}</div></motion.div></AnimatePresence><p className="pipeline-description">{stage.description}</p></div></div>
    <div className="pipeline-honesty"><CheckIcon aria-hidden="true"/>The walkthrough illustrates the process. The playground below runs the actual parser on an example fixture.</div>
  </section>;
}

const exports = [
  { name: '.ai-context.md', title: 'A reference for any workflow.', text: 'A portable Markdown file. Attach it to a prompt, keep it beside your project, or use it as a reference while you work.', tag: 'PLAIN MARKDOWN' },
  { name: '.cursorrules', title: 'Context alongside your editor.', text: 'Download the generated context with this filename if your workflow uses it. Review the file before adding it to your project.', tag: 'EDITOR WORKFLOW' },
  { name: 'CLAUDE.md', title: 'Give Claude a clearer starting point.', text: 'Export the same extracted contracts as CLAUDE.md. Place and maintain the file according to your project’s Claude workflow.', tag: 'PROJECT REFERENCE' },
];

export function ExportStory({ markdown }: { markdown: string }) {
  const [active, setActive] = useState(0);
  const { stopped } = useLandingMotion();
  const item = exports[active];
  return <section className="export-section"><div className="landing-container export-layout"><Reveal><div className="eyebrow">OUT OF THE BROWSER. INTO YOUR FLOW.</div><h2>Good context<br/>travels light.</h2><p className="export-lead">No new way of working to learn.<br/>Just a clearer reference for the tools you already use.</p><div className="export-selector" role="group" aria-label="Choose example export filename">{exports.map((file, index) => <button key={file.name} onClick={() => setActive(index)} aria-pressed={active === index}>{file.name}{active === index && <motion.span layoutId="export-selection" transition={{ duration: stopped ? 0 : .25 }}/>}</button>)}</div><AnimatePresence mode="wait" initial={false}><motion.div key={active} initial={stopped ? false : { opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: stopped ? 0 : .2 }} className="export-description"><h3>{item.title}</h3><p>{item.text}</p></motion.div></AnimatePresence><a className="landing-text-link" download={item.name} href={`data:text/plain;charset=utf-8,${encodeURIComponent(markdown)}`}><DownloadIcon aria-hidden="true"/>Download example file<ArrowRightIcon aria-hidden="true"/></a><p className="export-disclaimer">Example fixture only. No automatic connection to a coding assistant.</p></Reveal><Reveal className="export-file-stack"><div className="export-sheet-back"/><motion.div className="export-sheet" animate={stopped ? { y: 0, rotate: 0 } : { y: [0, -7, 0], rotate: [1, -1, 1] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}><div className="export-sheet-top"><FileTextIcon aria-hidden="true"/><span>{item.name}</span><span>↓</span></div><pre tabIndex={0} aria-label="Downloadable example context">{markdown}</pre><div className="export-sheet-bottom"><span>{item.tag}</span><CheckIcon aria-hidden="true"/>Parsed from the example fixture</div></motion.div><div className="export-seal"><span>YOUR CODE.</span><strong>Your context.</strong><span>YOURS TO TAKE.</span></div></Reveal></div></section>;
}

export function UseCases() {
  return <section className="usecases-section landing-container"><Reveal className="section-intro"><div><div className="eyebrow">FOR THE WORK IN FRONT OF YOU</div><h2>Same codebase.<br/>A better conversation.</h2></div><p>Bring the relevant contracts into view<br/>before asking an assistant to change them.</p></Reveal><div className="usecase-list">{[
    ['01', 'Getting into a new repository', 'Start with the shape of the system.', 'See the models, endpoints, and exported types together. Give your assistant a concrete reference before planning your first change.', 'ONBOARDING'],
    ['02', 'Changing a feature', 'Keep names and contracts in sync.', 'Include the schema and route contracts that touch your feature. Ask for changes against the fields your code actually defines.', 'IMPLEMENTATION'],
    ['03', 'Picking up where you left off', 'Refresh the context. Keep going.', 'Analyze the latest commit and replace your old reference. Context files are snapshots, so reanalyze after relevant code changes.', 'HANDOFFS'],
  ].map(([number, title, headline, description, tag]) => <Reveal className="usecase-row" key={number}><span>{number}</span><div><small>{tag}</small><h3>{title}</h3></div><div><h4>{headline}</h4><p>{description}</p></div><ArrowRightIcon aria-hidden="true"/></Reveal>)}</div></section>;
}
