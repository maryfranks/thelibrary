# Design System: The Chartroom (Terminal & Web)

A compact reference derived from `BRAND.md` and configured in `src/styles.css`. All components, UI chrome, and styling updates must adhere to these tokens and constraints.

---

## 1. Core Visual Principles
- **Aesthetic:** Scholarly nautical terminal / weathered chartroom. Teak and polished marine brass against matte steel, aged parchment panels, engraved labels, and monospaced telemetry.
- **Surface Law:** Every surface represents a physical material (steel, brass, paper). Never use gradient meshes.
- **Accent Law:** Hardware-inspired accents only (brass rules, rivets, hairline plates).
- **Color Law:** Saturation is reserved for state signaling, never ambient decoration.

---

## 2. Token Mappings (`src/styles.css`)

### Color Roles & Semantic Tailwind Utilities
| UI Role | Tailwind Class | Hex Value (Dark Mode) | Material Inspiration |
| :--- | :--- | :--- | :--- |
| **App Background** | `bg-background` | `#16181B` | Matte steel-900 |
| **Sunken / Terminal Well**| `bg-muted` | `#0F1114` | Recessed steel-950 |
| **Card / Surface** | `bg-card` | `#1D2024` | Raised steel plate (steel-800) |
| **Primary Text / Heading**| `text-foreground` | `#EDE6D6` | Parchment ink-050 |
| **Terminal Body / Reading**| `text-body` | `#C6BEB0` | Muted ink-100 |
| **Subdued Chrome / Labels**| `text-muted-foreground` | `#8C8779` | Weathered ink-300 |
| **Primary Accent / Prompt**| `text-primary` / `bg-primary` | `#C7A362` | Polished marine brass-400 |
| **Brass Border** | `border-brass-border` | `#6E5A34` | Antiqued brass-800 |
| **Standard Hairline Border**| `border-border` | `#333A41` | Cold-rolled steel hairline |
| **Success State** | `text-success` | `#86A47E` | Forest foliage-400 |
| **Warning State** | `text-warning` | `#D2BD7A` | Ochre lantern-400 |
| **Error / Destructive** | `text-destructive` | `#A29BBE` | Muted distress violet-400 |

### Elevation & Effects
- **Terminal Shadow:** `var(--shadow-terminal)` (`0 8px 24px -8px rgb(26 21 18 / 0.6), inset 0 1px 0 rgb(237 230 214 / 0.04)`)
- **Blinking Cursor:** `cursor-blink` utility applied to `▌` block.

---

## 3. Typography & Formatting Rules

- **Serif Font (`font-serif`):** `"Spectral", Georgia, serif`
  - Used for headings (`h1`), narrative display cards, and title intros.
- **Mono Font (`font-mono`):** `"IBM Plex Mono", monospace`
  - Used for terminal output streams, command prompts, turn counters, buttons, and navigation chrome.
- **Tabular Figures:** Always apply `tabular-nums` to numerical indicators, turn counters, and coordinates to prevent layout jitter.
- **Punctuation & Tone:** Declarative, low-gloss, concrete. No exclamation points, marketing buzzwords, or emojis.

---

## 4. Layout & Geometry Constraints

- **Border Radii:** Maximum radius ceiling is `0.375rem` (`rounded-md`, 6px). Sharp elements default to 2px–3px (`rounded-sm`).
  - **No pill-shaped badges, circular bubbles, or floating action buttons.**
- **Terminal Container:** Fixed-width centered layout (`max-w-3xl`), sunken background (`bg-muted`), bordered with `border-brass-border` or `border-border`.

---

## 5. Strict Design Anti-Patterns

1. **No Forbidden Hues:** No bright red, orange, or hot pink. Critical failure/death states use distress purple (`#A29BBE`), not saturated red.
2. **No Pure Black / Pure White:** `#FFFFFF` and `#000000` are banned. Use `#EDE6D6` for brightest text and `#0F1114` for deepest background.
3. **No Neons or Glows:** Do not apply high-saturation glows, blur filters, or bright retro-green CRT scanline effects.
4. **No Ad-Hoc Inline Colors:** Never write hex codes or inline `style={{ color: ... }}` in JSX. Reference semantic Tailwind classes mapped in `src/styles.css`.

