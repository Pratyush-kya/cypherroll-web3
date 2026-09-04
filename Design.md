# Design System & UI/UX Guidelines

> Generated with AI Design Intelligence (`ui-ux-pro-max`).

## 1. Design System Identity
- **Style Name:** Dark OLED Cyberpunk / High-Tech Web3 Casino
- **Visual Vibe:** Sleek midnight atmosphere, high-contrast neon accents, glowing holographic HUD elements, gold trust badges, and fluid 3D interactive canvases.
- **Target Audience Feel:** Premium, cutting-edge, high-stakes, transparent, and responsive. Evokes the thrill of modern crypto trading terminals combined with Las Vegas luxury.

---

## 2. Color Palette & CSS Variables
All components adhere to these CSS variables defined in `globals.css`:
```css
:root {
  --background: #0F172A;         /* Slate 900: Deep OLED midnight base */
  --foreground: #F8FAFC;         /* Slate 50: Crisp, readable high-contrast text */
  --card: #1E293B;               /* Slate 800: Elevated card panels */
  --card-foreground: #F8FAFC;
  --popover: #1E293B;
  --popover-foreground: #F8FAFC;
  
  --primary: #F59E0B;            /* Amber Gold: Primary brand & high-value badges */
  --primary-foreground: #020617; /* Slate 950: Dark text on gold */
  --secondary: #FBBF24;          /* Warm Amber: Secondary glow and interactive hovers */
  --secondary-foreground: #020617;
  
  --cta: #8B5CF6;                /* Neon Violet: Call-to-action, Roll & Bet triggers */
  --cta-foreground: #FFFFFF;     /* White text on purple CTA */
  --cta-hover: #7C3AED;
  
  --accent-green: #10B981;       /* Emerald: Win outcomes, positive multipliers, profit */
  --accent-red: #EF4444;         /* Rose: Loss outcomes, crash explosion, bust */
  --muted: #334155;              /* Slate 700: Inactive tabs, subtle borders */
  --muted-foreground: #94A3B8;   /* Slate 400: Secondary labels, seed timestamps */
  --border: #334155;             /* Subtle borders */
  --radius: 0.75rem;             /* Modern rounded corners */
}
```

---

## 3. Typography
- **Heading & Multiplier Font:** `Orbitron` (Futuristic, geometric, crypto-native aesthetic)
- **Body & Controls Font:** `Exo 2` (High readability, clean modern proportions)
- **Code & Hash Font:** `JetBrains Mono` (Monospace for Provably Fair hashes, seeds, and wallet addresses)
- **Google Fonts Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;700&family=Orbitron:wght@400;500;600;700;800;900&display=swap');

.font-heading {
  font-family: 'Orbitron', sans-serif;
}

.font-body {
  font-family: 'Exo 2', sans-serif;
}

.font-mono {
  font-family: 'JetBrains Mono', monospace;
}
```

---

## 4. Component Library Composition Matrix
*Prevents visual and CSS collisions by assigning strict responsibilities to each library:*

| UI Area | Library / Registry | Component Examples | Scope & Isolation Rules |
| :--- | :--- | :--- | :--- |
| **Core Foundations** | `shadcn/ui` | Button, Slider, Dialog, Tabs, Table, Badge | Standard accessible controls with custom slate/gold variants. |
| **Live Odds & Micro-motion** | `smoothui` | Spring-animated cash-out button, dynamic balance counter | High-frequency number updates with fluid easing (stiffness 300). |
| **Hero, Grids & VIP Lobby** | `magicui` | Bento Grid, Border Beam, Interactive Particle Background | Background overlays, glowing card borders for VIP tiers. |
| **3D Interactive Game Stage** | `Three.js` + `Blender` | Interactive 3D Dice with physics, 3D Crash Launchpad Rocket | Isolated in `<Canvas>` containers with suspense fallbacks. |

---

## 5. 3D WebGL & Animation Standards
- **Blender Asset Export Standards:**
  - Geometry: Draco mesh compression enabled (`compression_level: 7`).
  - Textures: Baked PBR roughness/metallic/emissive maps packed into `.glb`.
  - Lighting: Environment HDR map with ambient light to prevent expensive real-time shadow passes.
  - Total 3D asset size: Target $<1.2\text{MB}$ per scene.
- **Canvas Fallback:**
  - If the user's browser disables WebGL or runs on an ultra-low-bandwidth Tor circuit, the system automatically falls back to an SVG/HTML5 2D canvas animation.
- **Motion Safety:**
  - Full support for `prefers-reduced-motion`. High-frequency flashes are strictly disabled when the reduced motion media query is active.

---

## 6. Pre-Delivery UX Quality Checklist
- [ ] No emojis as primary icons (use `lucide-react` SVG icons exclusively).
- [ ] Explicit `cursor-pointer` on all clickable chips, bets, and tabs.
- [ ] Strict text contrast minimum 4.5:1 (WCAG AAA) against `#0F172A` background.
- [ ] Visible keyboard focus rings (`focus-visible:ring-2 focus-visible:ring-primary`).
- [ ] Instant numerical formatting for crypto values (e.g. 6 decimal places for SOL, 2 for USD).
- [ ] Responsive testing across 375px (iPhone), 768px (iPad), 1024px, and 1440px (Wide).
