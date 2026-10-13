# RepoSpec design system

Sources: https://vercel.com/design/guidelines,
https://github.com/VoltAgent/awesome-design-md (Linear reference), and
https://github.com/tasteskill/tasteskill (taste-skill).

Use a technical workspace with a compact sidebar, restrained surface hierarchy,
hairline borders, asymmetrical main/inspector columns, and generous content spacing.
Geist Sans for interface text and Geist Mono for source paths and token counts.
Use neutral light surfaces, deep navy ink, and a single blue action family.

Required brand palette: #03045e, #023e8a, #0077b6, #0096c7, #00b4d8,
#48cae4, #90e0ef, #ade8f4, #caf0f8.
Dark blues carry readable text and buttons. Pale blues carry selection and charts.
Chart labels and patterns supplement color. Never put white small text on cyan.

Prefer precise product controls over decorative cards. Use 8px controls, 12px
panels, 4px spacing increments, and touch targets of at least 44px on mobile.
Use labeled inputs, semantic navigation, visible keyboard focus, a skip link,
inline errors, loading skeletons, and useful empty states. Navigation and filters
must survive refresh in the URL. Honor reduced motion and browser zoom.
Vercel's motion accessibility and functional requirements take precedence over
Taste Skill's decorative perpetual motion. Never invent success, scans, or data.

## Public landing page

The user requested fluid motion and Pinterest research. References discovered:
- https://in.pinterest.com/pin/371828513004018876/
- https://dribbble.com/shots/19623630-SaaS-Landing-Page-for-Developers-Tool
- https://it.pinterest.com/pin/64317100925143805/
Pinterest presented a login wall during visual inspection. Use the references as
direction, not as a claim that all details were inspected or as assets to copy.

Compose a light editorial split hero with deep navy type, oversized geometric
repository-to-context visual, fine blueprint grid, cyan accents, and a dark navy
interactive demonstration. Use asymmetric sections, generous space, and an
immersive closing CTA. Spring-based hover and scroll-linked transforms should
feel fluid. All automatic motion can be paused and honors reduced motion.
Do not invent testimonials, adoption counts, integrations, or performance claims.

## Expanded landing motion

21st.dev visual research: https://21st.dev/@cult-ui/components/grid-beam
and https://21st.dev/@uilayout.contact/components/text-marque. The Grid Beam
implementation was locked during inspection; no gated code was copied. The
blue beam grid, stack marquee, extraction walkthrough, and export selector are
original implementations inspired by these motion patterns, using the existing
Framer Motion dependency. Do not claim they are installed third-party components.

One page-wide control pauses automatic motion. The walkthrough also pauses
after manual selection and while outside the viewport. Device reduced-motion
preferences disable automatic cycling and decorative movement. Walkthrough
content is explicitly illustrative; the playground and downloadable example
use the actual parser against a labeled fixture. Do not confuse export filenames
with automatic integrations or promise that a snapshot stays up to date.

## Logo

The RepoSpec monogram is an original SVG with three separated rounded forms,
inspired by the user's R reference. Preserve visible negative space between the
upper bowl and the right stroke at small sizes. Use the shared BrandMark in the
public site and local dashboard, and the matching App Router SVG favicon.
Source: ui/public/brand/repospec-mark.svg. No reference watermark or image is embedded.
