# Third-party component notices

## React Bits Waves

- Author: David Haz, copyright 2026
- Component: https://reactbits.dev/backgrounds/waves
- Source: https://github.com/DavidHDev/react-bits/blob/496968c4117e21278f13917201b7d615bc5e7450/src/ts-tailwind/Backgrounds/Waves/Waves.tsx
- Vendored source: `ui/components/react-bits/waves.tsx`
- License: MIT + Commons Clause; the full upstream notice is preserved in
  [LICENSE.react-bits.md](ui/components/react-bits/LICENSE.react-bits.md).

The component is used as part of the RepoSpec website. Its separate license
applies to that vendored source; RepoSpec's MIT license does not replace it.
An attribution header and a DOM renderer-status attribute for fallback selection
were added. Cleanup deletes GPU resources without forcibly losing the canvas
context, allowing React Strict Mode to replay the effect. RepoSpec-specific color, motion, pixel ratio,
masking, and static fallback settings live in `landing-background.tsx` and CSS.
