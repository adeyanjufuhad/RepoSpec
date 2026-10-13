'use client';
import { createContext, useContext, useRef, useState } from 'react';
import { MotionConfig, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRightIcon, GitHubLogoIcon, PauseIcon, PlayIcon, CodeIcon, FileTextIcon } from '@radix-ui/react-icons';

const MotionContext = createContext({ paused: false, toggle: () => {} });
export function useLandingMotion() {
  const { paused, toggle } = useContext(MotionContext);
  const reduced = useReducedMotion();
  return { stopped: paused || !!reduced, paused, toggle, reduced };
}
export function LandingMotion({ children }: { children: React.ReactNode }) {
  const [paused, setPaused] = useState(false);
  return <MotionConfig reducedMotion="user"><MotionContext.Provider value={{ paused, toggle: () => setPaused(value => !value) }}><div className={`landing ${paused ? 'all-motion-paused' : ''}`}>{children}</div></MotionContext.Provider></MotionConfig>;
}
export function MotionControl() {
  const { paused, toggle, reduced } = useLandingMotion();
  return <button className="landing-motion-control" onClick={toggle} aria-pressed={paused} aria-label={paused ? 'Resume page motion' : 'Pause page motion'} title={reduced ? 'Reduced motion follows your device settings' : paused ? 'Resume page motion' : 'Pause page motion'}>{paused ? <PlayIcon/> : <PauseIcon/>}<span>{paused ? 'Play' : 'Pause'} motion</span></button>;
}
export function StackMarquee() {
  return <section className="stack-strip moving-stack" aria-label="Supported source technologies"><div className="landing-container"><span>BUILT AROUND<br/>YOUR ACTUAL STACK</span><div className="stack-window"><div className="stack-track">{[false, true].map(duplicate => <div className="stack-group" key={String(duplicate)} aria-hidden={duplicate || undefined}><b><span className="stack-monogram">TS</span>TypeScript</b><b><span className="stack-next">N</span>Next.js</b><b>◭ Prisma</b><b>Drizzle<span className="stack-drizzle">///</span></b><b>zod<span className="stack-zod">{'{ }'}</span></b></div>)}</div></div></div></section>;
}

export function FluidScene({ tokens }: { tokens: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { stopped, paused, toggle } = useLandingMotion();
  const reduce = stopped;
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [24, -30]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-4, 4]);
  return <div ref={ref} className={`fluid-scene ${paused || reduce ? 'motion-paused' : ''}`}>
    <div className="scene-grid" aria-hidden="true"/>
    <svg className="scene-paths" viewBox="0 0 600 540" fill="none" aria-hidden="true"><path d="M65 120C300 120 170 390 345 300S510 120 560 180" stroke="#90e0ef" strokeWidth="2"/><path className="flow-path" d="M65 120C300 120 170 390 345 300S510 120 560 180" stroke="#0077b6" strokeWidth="3" strokeDasharray="5 12"/><path d="M100 390C180 390 180 160 360 160S460 430 570 400" stroke="#ade8f4" strokeWidth="2"/></svg>
    <motion.div className="scene-stack" style={reduce ? undefined : { y, rotate }}>
      <div className="scene-layer scene-layer-back"/>
      <div className="scene-layer scene-layer-middle"/>
      <div className="scene-document"><div className="scene-document-header"><span className="scene-dots"><i/><i/><i/></span><span>.ai-context.md</span><FileTextIcon aria-hidden="true"/></div><div className="scene-code"><p className="scene-comment"># Your repo, distilled.</p><p><span>Table</span> Project (</p><p className="indent">id: String <b>[PK]</b>,</p><p className="indent">name: String,</p><p className="indent">ownerId: String</p><p>)</p><div className="scene-code-divider"/><p><span>GET</span> /api/projects/[id]</p><p className="scene-comment">→ ProjectWithTasks</p><div className="scene-code-divider"/><p><span>interface</span> Project {'{'}</p><p className="indent">id: string;</p><p className="indent">name: string;</p><p>{'}'}</p></div><div className="scene-document-footer"><span className="scene-status-dot"/>Example context<span>{tokens.toLocaleString()} tokens</span></div></div>
    </motion.div>
    <motion.div className="scene-source source-top" animate={!paused && !reduce ? { y: [0, -8, 0] } : { y: 0 }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}><GitHubLogoIcon aria-hidden="true"/><span>your-repository</span><ArrowRightIcon aria-hidden="true"/></motion.div>
    <motion.div className="scene-source source-bottom" animate={!paused && !reduce ? { y: [0, 7, 0] } : { y: 0 }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}><CodeIcon aria-hidden="true"/><span>Less noise. More context.</span></motion.div>
    <div className="scene-orbit orbit-one" aria-hidden="true"><span>schema.prisma</span></div><div className="scene-orbit orbit-two" aria-hidden="true"><span>route.ts</span></div>
    <div className="scene-caption">ILLUSTRATIVE WORKFLOW <button aria-label={paused ? 'Resume page motion' : 'Pause page motion'} aria-pressed={paused} onClick={toggle}>{paused ? <PlayIcon aria-hidden="true"/> : <PauseIcon aria-hidden="true"/>}</button></div>
  </div>;
}
export function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { stopped: reduce } = useLandingMotion();
  return <motion.div className={className} initial={reduce ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .15 }} transition={{ type: 'spring', stiffness: 85, damping: 20 }}>{children}</motion.div>;
}
