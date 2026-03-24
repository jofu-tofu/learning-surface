// --- Theme system ---
// Each theme defines the same set of CSS custom property values.
// applyTheme() writes them to :root so Tailwind utilities + var() references
// pick them up automatically — no component changes needed.

const THEME_IDS = ['midnight', 'light', 'galaxy'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

const STORAGE_KEY = 'learning-surface-theme';
const DEFAULT_THEME: ThemeId = 'midnight';

// --- Token shape ---

interface ThemeTokens {
  // Surface scale (backgrounds, text, borders)
  'surface-50': string;
  'surface-100': string;
  'surface-200': string;
  'surface-300': string;
  'surface-400': string;
  'surface-500': string;
  'surface-600': string;
  'surface-700': string;
  'surface-800': string;
  'surface-900': string;

  // Accent scale (focus rings, active states, links)
  'accent-400': string;
  'accent-500': string;
  'accent-600': string;
  'accent-700': string;

  // Semantic status colors
  'emerald-400': string;
  'emerald-500': string;
  'amber-400': string;
  'amber-500': string;

  // Semantic UI colors (error, branch badge, inverse text)
  'danger-bg': string;
  'danger-border': string;
  'danger-text': string;
  'danger-muted': string;
  'danger-solid': string;
  'branch-bg': string;
  'branch-border': string;
  'branch-text': string;
  'inverse-text': string;
  'shadow-color': string;

  // Diagram category palette
  'cat-input-fill': string;
  'cat-input-stroke': string;
  'cat-input-text': string;
  'cat-process-fill': string;
  'cat-process-stroke': string;
  'cat-process-text': string;
  'cat-output-fill': string;
  'cat-output-stroke': string;
  'cat-output-text': string;
  'cat-decision-fill': string;
  'cat-decision-stroke': string;
  'cat-decision-text': string;
  'cat-concept-fill': string;
  'cat-concept-stroke': string;
  'cat-concept-text': string;
  'cat-warning-fill': string;
  'cat-warning-stroke': string;
  'cat-warning-text': string;
}

// --- Scale generator ---
// OKLCH lightness ramp produces perceptually uniform steps.
// Each theme only needs a base hue + chroma; the 10-step surface scale is derived.

const SURFACE_LIGHTNESS = [97, 95, 90, 80, 64, 46, 33, 25, 15, 10] as const;
const SHADE_NAMES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const;

function oklch(lightness: number, chroma: number, hue: number): string {
  return `oklch(${(lightness / 100).toFixed(3)} ${chroma.toFixed(4)} ${hue})`;
}

type SurfaceScale = Record<`surface-${typeof SHADE_NAMES[number]}`, string>;

function generateSurfaceScale(hue: number, chroma: number): SurfaceScale {
  const surfaceTokens = {} as SurfaceScale;
  for (let i = 0; i < SHADE_NAMES.length; i++) {
    // Boost chroma slightly in the mid-range for richness
    const chromaScale = i >= 3 && i <= 6 ? chroma * 1.2 : chroma;
    surfaceTokens[`surface-${SHADE_NAMES[i]}`] = oklch(SURFACE_LIGHTNESS[i], chromaScale, hue);
  }
  return surfaceTokens;
}

// --- Theme definitions ---

interface ThemeMeta {
  id: ThemeId;
  label: string;
  tokens: ThemeTokens;
}

const MIDNIGHT_TOKENS: ThemeTokens = {
  // Current palette — hand-tuned slate-blue
  'surface-50': '#f8fafc',
  'surface-100': '#f1f5f9',
  'surface-200': '#e2e8f0',
  'surface-300': '#cbd5e1',
  'surface-400': '#94a3b8',
  'surface-500': '#64748b',
  'surface-600': '#475569',
  'surface-700': '#334155',
  'surface-800': '#1e293b',
  'surface-900': '#0f172a',

  'accent-400': '#60a5fa',
  'accent-500': '#3b82f6',
  'accent-600': '#2563eb',
  'accent-700': '#1d4ed8',

  'emerald-400': '#34d399',
  'emerald-500': '#10b981',
  'amber-400': '#fbbf24',
  'amber-500': '#f59e0b',

  'danger-bg': 'rgba(239, 68, 68, 0.1)',
  'danger-border': 'rgba(239, 68, 68, 0.2)',
  'danger-text': '#f87171',
  'danger-muted': 'rgba(248, 113, 113, 0.7)',
  'danger-solid': '#dc2626',
  'branch-bg': 'rgba(168, 85, 247, 0.2)',
  'branch-border': 'rgba(168, 85, 247, 0.3)',
  'branch-text': '#c084fc',
  'inverse-text': '#ffffff',
  'shadow-color': 'rgba(0, 0, 0, 0.2)',

  'cat-input-fill': '#1e3a5f',
  'cat-input-stroke': '#3b82f6',
  'cat-input-text': '#93c5fd',
  'cat-process-fill': '#14532d',
  'cat-process-stroke': '#22c55e',
  'cat-process-text': '#86efac',
  'cat-output-fill': '#431407',
  'cat-output-stroke': '#f97316',
  'cat-output-text': '#fdba74',
  'cat-decision-fill': '#422006',
  'cat-decision-stroke': '#eab308',
  'cat-decision-text': '#fde047',
  'cat-concept-fill': '#2e1065',
  'cat-concept-stroke': '#a855f7',
  'cat-concept-text': '#d8b4fe',
  'cat-warning-fill': '#450a0a',
  'cat-warning-stroke': '#ef4444',
  'cat-warning-text': '#fca5a5',
};

const LIGHT_SURFACE = generateSurfaceScale(250, 0.01);

const LIGHT_TOKENS: ThemeTokens = {
  // Inverted — light surface scale (swap 50↔900 direction)
  'surface-50': LIGHT_SURFACE['surface-900'],  // darkest text
  'surface-100': LIGHT_SURFACE['surface-800'],
  'surface-200': LIGHT_SURFACE['surface-700'],
  'surface-300': LIGHT_SURFACE['surface-600'],
  'surface-400': LIGHT_SURFACE['surface-500'],
  'surface-500': LIGHT_SURFACE['surface-400'],
  'surface-600': LIGHT_SURFACE['surface-300'],
  'surface-700': LIGHT_SURFACE['surface-200'],
  'surface-800': LIGHT_SURFACE['surface-100'],
  'surface-900': LIGHT_SURFACE['surface-50'],   // lightest background

  'accent-400': '#2563eb',
  'accent-500': '#3b82f6',
  'accent-600': '#3b82f6',
  'accent-700': '#60a5fa',

  'emerald-400': '#059669',
  'emerald-500': '#10b981',
  'amber-400': '#d97706',
  'amber-500': '#f59e0b',

  'danger-bg': 'rgba(239, 68, 68, 0.08)',
  'danger-border': 'rgba(239, 68, 68, 0.2)',
  'danger-text': '#dc2626',
  'danger-muted': 'rgba(220, 38, 38, 0.7)',
  'danger-solid': '#dc2626',
  'branch-bg': 'rgba(147, 51, 234, 0.1)',
  'branch-border': 'rgba(147, 51, 234, 0.2)',
  'branch-text': '#7c3aed',
  'inverse-text': '#ffffff',
  'shadow-color': 'rgba(0, 0, 0, 0.08)',

  // Diagram categories — lighter fills for light mode
  'cat-input-fill': '#dbeafe',
  'cat-input-stroke': '#2563eb',
  'cat-input-text': '#1e40af',
  'cat-process-fill': '#d1fae5',
  'cat-process-stroke': '#16a34a',
  'cat-process-text': '#15803d',
  'cat-output-fill': '#ffedd5',
  'cat-output-stroke': '#ea580c',
  'cat-output-text': '#c2410c',
  'cat-decision-fill': '#fef9c3',
  'cat-decision-stroke': '#ca8a04',
  'cat-decision-text': '#a16207',
  'cat-concept-fill': '#f3e8ff',
  'cat-concept-stroke': '#9333ea',
  'cat-concept-text': '#7c3aed',
  'cat-warning-fill': '#fee2e2',
  'cat-warning-stroke': '#dc2626',
  'cat-warning-text': '#b91c1c',
};

const GALAXY_SURFACE = generateSurfaceScale(280, 0.035);

const GALAXY_TOKENS: ThemeTokens = {
  // Deep purple/violet base
  'surface-50': GALAXY_SURFACE['surface-50'],
  'surface-100': GALAXY_SURFACE['surface-100'],
  'surface-200': GALAXY_SURFACE['surface-200'],
  'surface-300': GALAXY_SURFACE['surface-300'],
  'surface-400': GALAXY_SURFACE['surface-400'],
  'surface-500': GALAXY_SURFACE['surface-500'],
  'surface-600': GALAXY_SURFACE['surface-600'],
  'surface-700': GALAXY_SURFACE['surface-700'],
  'surface-800': GALAXY_SURFACE['surface-800'],
  'surface-900': GALAXY_SURFACE['surface-900'],

  // Cyan/teal accent for contrast against purple
  'accent-400': '#22d3ee',
  'accent-500': '#06b6d4',
  'accent-600': '#0891b2',
  'accent-700': '#0e7490',

  'emerald-400': '#34d399',
  'emerald-500': '#10b981',
  'amber-400': '#fbbf24',
  'amber-500': '#f59e0b',

  'danger-bg': 'rgba(244, 63, 94, 0.12)',
  'danger-border': 'rgba(244, 63, 94, 0.25)',
  'danger-text': '#fb7185',
  'danger-muted': 'rgba(251, 113, 133, 0.7)',
  'danger-solid': '#e11d48',
  'branch-bg': 'rgba(232, 121, 249, 0.2)',
  'branch-border': 'rgba(232, 121, 249, 0.3)',
  'branch-text': '#e879f9',
  'inverse-text': '#ffffff',
  'shadow-color': 'rgba(0, 0, 0, 0.3)',

  // Diagram categories — richer tones against purple background
  'cat-input-fill': '#164e63',
  'cat-input-stroke': '#22d3ee',
  'cat-input-text': '#a5f3fc',
  'cat-process-fill': '#14532d',
  'cat-process-stroke': '#4ade80',
  'cat-process-text': '#bbf7d0',
  'cat-output-fill': '#431407',
  'cat-output-stroke': '#fb923c',
  'cat-output-text': '#fed7aa',
  'cat-decision-fill': '#422006',
  'cat-decision-stroke': '#facc15',
  'cat-decision-text': '#fef08a',
  'cat-concept-fill': '#3b0764',
  'cat-concept-stroke': '#e879f9',
  'cat-concept-text': '#f5d0fe',
  'cat-warning-fill': '#4c0519',
  'cat-warning-stroke': '#fb7185',
  'cat-warning-text': '#fecdd3',
};

export const THEMES: ThemeMeta[] = [
  { id: 'midnight', label: 'Midnight', tokens: MIDNIGHT_TOKENS },
  { id: 'light', label: 'Light', tokens: LIGHT_TOKENS },
  { id: 'galaxy', label: 'Galaxy', tokens: GALAXY_TOKENS },
];

// --- Runtime theme application ---

/** Write theme tokens as CSS custom properties on :root. */
export function applyTheme(id: ThemeId): void {
  const theme = THEMES.find(theme => theme.id === id);
  if (!theme) return;

  const root = document.documentElement;
  for (const [token, value] of Object.entries(theme.tokens)) {
    root.style.setProperty(`--color-${token}`, value);
  }
  root.dataset.theme = id;

  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Storage unavailable — silently ignore
  }
}

/** Read persisted theme choice, falling back to default. */
export function getStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && THEME_IDS.includes(stored as ThemeId)) return stored as ThemeId;
  } catch {
    // Storage unavailable
  }
  return DEFAULT_THEME;
}
