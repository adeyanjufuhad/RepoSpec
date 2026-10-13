'use client';

import Waves from './react-bits/waves';
import { useLandingMotion } from './landing-motion';

/** React Bits Waves, tuned for RepoSpec's readable, light blue surfaces. */
export default function LandingBackground({ variant = 'hero' }: { variant?: 'hero' | 'closing' }) {
  const { stopped } = useLandingMotion();
  return <div className={`react-bits-background react-bits-background-${variant}`} aria-hidden="true" data-paused={stopped}>
    <svg className="background-wave-fallback" viewBox="0 0 1400 700" preserveAspectRatio="none" fill="none">
      {Array.from({ length: 9 }, (_, index) => <path key={index} d={`M${460 + index * 60} -50C${160 + index * 70} 210 ${1080 + index * 20} 330 ${800 + index * 65} 750`} stroke="#0096c7" strokeWidth="1"/>)}
    </svg>
    <Waves lineColor="#0077b6" accentColor="#00b4d8" spacing={28} lineWidth={1.1} rotation={-28} amplitude={44} scale={1.5} twist={.8} speed={.4} mouseRadius={180} mouseStrength={.45} bounce={.25} clickRipple={false} intro={false} fade={.3} opacity={variant === 'hero' ? .5 : .32} paused={stopped} dpr={1.25}/>
  </div>;
}
