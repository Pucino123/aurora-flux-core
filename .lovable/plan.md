

## Plan: Redesign AuraOrb to Match Siri's Ribbon Aesthetic

### Problem
Current implementation uses blurred solid color blobs with `borderRadius` morphing. This produces a fuzzy ball, not the signature Siri look of **thin, flowing, translucent ribbons** that intersect and weave through each other inside a dark sphere.

### Approach: SVG-based animated ribbons
Replace the entire blob system with an SVG containing multiple animated bezier curve paths (ribbons) that morph between different curve shapes. Each ribbon is a semi-transparent gradient stroke that flows and crosses other ribbons, with a bright white radial glow at the center.

### File to edit
`src/components/focus/AuraOrb.tsx` — full rewrite

### Design Details

```text
Visual layers (bottom to top):
1. Dark sphere background (radial gradient: deep purple/blue → near-black)
2. 4-5 SVG ribbon paths — each a cubic bezier with:
   - Gradient stroke (e.g., cyan→pink, pink→purple, green→blue)
   - Semi-transparent fill (0.1-0.2 opacity)
   - Stroke width ~2-3px
   - Animated 'd' attribute morphing between 4-6 curve keyframes
   - Each ribbon on different timing (3-8s cycles)
3. Central white radial glow (where ribbons intersect)
4. Subtle specular highlight at top-left
```

### Animation states
- **Idle**: Slow ribbon morphing (6-10s per ribbon), gentle scale breathing
- **Listening**: Faster morphing (2-3s), ribbons spread wider, brighter colors
- **Processing**: Rapid morphing (0.5-1s), ribbons contract toward center
- **Speaking**: Medium-speed rhythmic pulsing, ribbons expand/contract

### Implementation
- Use Framer Motion to animate SVG path `d` attributes between keyframe strings
- Each ribbon = `<motion.path>` with `animate={{ d: [...paths] }}` cycling through curve shapes
- SVG `<linearGradient>` for each ribbon's color
- Background sphere via a `<circle>` with radial gradient fill
- Central glow via a radial gradient circle on top
- All contained in a single `<svg>` element with `viewBox="0 0 200 200"`

### Key visual elements matching Siri reference
- Ribbons are **thin curves**, not blobs — stroke-based, not filled shapes
- Colors: cyan/teal, pink/magenta, purple, green — translucent
- Ribbons **cross over each other** at different angles
- Bright **white center glow** where ribbons converge
- Dark sphere background gives depth
- Slight blur on ribbons for softness (`filter: blur(1-2px)`)

