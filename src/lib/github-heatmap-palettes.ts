import { contributionLevel } from "./github"

export type GitHubHeatmapPalette = {
  id: string
  label: string
  light: readonly [string, string, string, string, string]
  dark: readonly [string, string, string, string, string]
}

export const GITHUB_HEATMAP_PALETTES = [
  {
    id: "classic",
    label: "Monochrome",
    light: [
      "rgba(17,17,17,0.07)",
      "rgba(17,17,17,0.25)",
      "rgba(17,17,17,0.4)",
      "rgba(17,17,17,0.58)",
      "rgba(17,17,17,0.78)",
    ],
    dark: [
      "rgba(255,255,255,0.1)",
      "rgba(255,255,255,0.28)",
      "rgba(255,255,255,0.44)",
      "rgba(255,255,255,0.62)",
      "rgba(255,255,255,0.82)",
    ],
  },
  {
    id: "github",
    label: "GitHub green",
    light: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
    dark: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
  },
  {
    id: "emerald",
    label: "Emerald",
    light: ["#ecfdf5", "#a7f3d0", "#34d399", "#059669", "#047857"],
    dark: ["#022c22", "#064e3b", "#047857", "#10b981", "#6ee7b7"],
  },
  {
    id: "forest",
    label: "Forest",
    light: ["#f0fdf4", "#86efac", "#22c55e", "#15803d", "#14532d"],
    dark: ["#0a0f0a", "#14532d", "#166534", "#22c55e", "#4ade80"],
  },
  {
    id: "lime",
    label: "Lime",
    light: ["#f7fee7", "#d9f99d", "#a3e635", "#65a30d", "#3f6212"],
    dark: ["#141a0a", "#365314", "#4d7c0f", "#84cc16", "#bef264"],
  },
  {
    id: "mint",
    label: "Mint",
    light: ["#f0fdfa", "#99f6e4", "#2dd4bf", "#0d9488", "#115e59"],
    dark: ["#0a1211", "#134e4a", "#0f766e", "#14b8a6", "#5eead4"],
  },
  {
    id: "ocean",
    label: "Ocean",
    light: ["#eff6ff", "#93c5fd", "#3b82f6", "#1d4ed8", "#1e3a8a"],
    dark: ["#0f172a", "#1e3a8a", "#1d4ed8", "#3b82f6", "#7dd3fc"],
  },
  {
    id: "sky",
    label: "Sky",
    light: ["#f0f9ff", "#7dd3fc", "#38bdf8", "#0284c7", "#075985"],
    dark: ["#0c1220", "#0c4a6e", "#0369a1", "#0ea5e9", "#7dd3fc"],
  },
  {
    id: "ice",
    label: "Ice",
    light: ["#ecfeff", "#a5f3fc", "#22d3ee", "#0891b2", "#155e75"],
    dark: ["#0a1518", "#164e63", "#0e7490", "#06b6d4", "#67e8f9"],
  },
  {
    id: "indigo",
    label: "Indigo",
    light: ["#eef2ff", "#a5b4fc", "#6366f1", "#4338ca", "#312e81"],
    dark: ["#0f1024", "#312e81", "#4338ca", "#6366f1", "#a5b4fc"],
  },
  {
    id: "violet",
    label: "Violet",
    light: ["#f5f3ff", "#c4b5fd", "#8b5cf6", "#6d28d9", "#4c1d95"],
    dark: ["#1e1b4b", "#4c1d95", "#6d28d9", "#8b5cf6", "#c4b5fd"],
  },
  {
    id: "grape",
    label: "Grape",
    light: ["#faf5ff", "#d8b4fe", "#a855f7", "#7e22ce", "#581c87"],
    dark: ["#1a0f24", "#581c87", "#7e22ce", "#a855f7", "#d8b4fe"],
  },
  {
    id: "fuchsia",
    label: "Fuchsia",
    light: ["#fdf4ff", "#f0abfc", "#e879f9", "#c026d3", "#86198f"],
    dark: ["#1a0a1c", "#701a75", "#a21caf", "#e879f9", "#f0abfc"],
  },
  {
    id: "pink",
    label: "Pink",
    light: ["#fdf2f8", "#f9a8d4", "#ec4899", "#db2777", "#9d174d"],
    dark: ["#1a0a14", "#831843", "#be185d", "#ec4899", "#f9a8d4"],
  },
  {
    id: "rose",
    label: "Rose",
    light: ["#fff1f2", "#fda4af", "#fb7185", "#e11d48", "#9f1239"],
    dark: ["#1a0a0d", "#881337", "#be123c", "#f43f5e", "#fda4af"],
  },
  {
    id: "crimson",
    label: "Crimson",
    light: ["#fef2f2", "#fca5a5", "#ef4444", "#b91c1c", "#7f1d1d"],
    dark: ["#1a0909", "#7f1d1d", "#b91c1c", "#ef4444", "#fca5a5"],
  },
  {
    id: "ember",
    label: "Ember",
    light: ["#fff7ed", "#fdba74", "#f97316", "#ea580c", "#9a3412"],
    dark: ["#1c1917", "#7c2d12", "#c2410c", "#f97316", "#fdba74"],
  },
  {
    id: "amber",
    label: "Amber",
    light: ["#fffbeb", "#fcd34d", "#f59e0b", "#d97706", "#92400e"],
    dark: ["#1a1408", "#78350f", "#b45309", "#f59e0b", "#fcd34d"],
  },
  {
    id: "gold",
    label: "Gold",
    light: ["#fefce8", "#fde047", "#eab308", "#ca8a04", "#854d0e"],
    dark: ["#141208", "#713f12", "#a16207", "#eab308", "#fde047"],
  },
  {
    id: "copper",
    label: "Copper",
    light: ["#faf5f0", "#e7b98a", "#c87c4a", "#a45a2a", "#6b3d1f"],
    dark: ["#14100c", "#5c2e18", "#8b4518", "#cd7f32", "#e9b384"],
  },
  {
    id: "coral",
    label: "Coral",
    light: ["#fff5f5", "#feb2b2", "#fc8181", "#e53e3e", "#9b2c2c"],
    dark: ["#180c0c", "#742a2a", "#c53030", "#fc8181", "#fed7d7"],
  },
  {
    id: "peach",
    label: "Peach",
    light: ["#fff8f3", "#ffc9a8", "#ff9a6c", "#e86a3a", "#9c4221"],
    dark: ["#18110c", "#7c2d12", "#c05621", "#ed8936", "#fbd38d"],
  },
  {
    id: "sunset",
    label: "Sunset",
    light: ["#fff5f7", "#fbb6ce", "#f687b3", "#d53f8c", "#97266d"],
    dark: ["#180a12", "#702459", "#b83280", "#ed64a6", "#fbb6ce"],
  },
  {
    id: "dusk",
    label: "Dusk",
    light: ["#f5f3ff", "#c7d2fe", "#818cf8", "#6366f1", "#4338ca"],
    dark: ["#0d0f1a", "#312e81", "#4f46e5", "#818cf8", "#e0e7ff"],
  },
  {
    id: "aurora",
    label: "Aurora",
    light: ["#ecfdf5", "#6ee7b7", "#2dd4bf", "#38bdf8", "#818cf8"],
    dark: ["#0a1218", "#065f46", "#0f766e", "#0284c7", "#6366f1"],
  },
  {
    id: "synth",
    label: "Synthwave",
    light: ["#fdf4ff", "#e9d5ff", "#f472b6", "#a855f7", "#ec4899"],
    dark: ["#0f0518", "#701a75", "#7c3aed", "#ec4899", "#22d3ee"],
  },
  {
    id: "sakura",
    label: "Sakura",
    light: ["#fff5f7", "#fbcfe8", "#f9a8d4", "#f472b6", "#db2777"],
    dark: ["#180a12", "#500724", "#9d174d", "#ec4899", "#fce7f3"],
  },
  {
    id: "slate",
    label: "Slate",
    light: ["#f8fafc", "#cbd5e1", "#64748b", "#475569", "#1e293b"],
    dark: ["#0f1419", "#1e293b", "#334155", "#64748b", "#cbd5e1"],
  },
  {
    id: "stone",
    label: "Stone",
    light: ["#fafaf9", "#d6d3d1", "#78716c", "#57534e", "#292524"],
    dark: ["#141210", "#292524", "#44403c", "#78716c", "#d6d3d1"],
  },
  {
    id: "ink",
    label: "Ink",
    light: ["#f4f4f5", "#a1a1aa", "#52525b", "#3f3f46", "#18181b"],
    dark: ["#09090b", "#18181b", "#27272a", "#52525b", "#a1a1aa"],
  },
  {
    id: "pastel",
    label: "Pastel",
    light: ["#fafafa", "#bfdbfe", "#bbf7d0", "#fde68a", "#fbcfe8"],
    dark: ["#18181b", "#1e3a5f", "#14532d", "#713f12", "#701a75"],
  },
] as const satisfies readonly GitHubHeatmapPalette[]

export type GitHubHeatmapPaletteId = (typeof GITHUB_HEATMAP_PALETTES)[number]["id"]

const PALETTE_BY_ID = Object.fromEntries(
  GITHUB_HEATMAP_PALETTES.map((p) => [p.id, p]),
) as Record<GitHubHeatmapPaletteId, (typeof GITHUB_HEATMAP_PALETTES)[number]>

export function resolveGitHubHeatmapPalette(id: string | undefined): GitHubHeatmapPaletteId {
  if (id && id in PALETTE_BY_ID) return id as GitHubHeatmapPaletteId
  return "classic"
}

export function getGitHubHeatmapPalette(id: string | undefined): (typeof GITHUB_HEATMAP_PALETTES)[number] {
  return PALETTE_BY_ID[resolveGitHubHeatmapPalette(id)]
}

export function heatmapLevelColor(
  level: 0 | 1 | 2 | 3 | 4,
  paletteId: string | undefined,
  dark: boolean,
): string {
  const palette = getGitHubHeatmapPalette(paletteId)
  return (dark ? palette.dark : palette.light)[level]
}

export function heatmapCellFill(
  count: number,
  maxCount: number,
  paletteId: string | undefined,
  dark: boolean,
): string | undefined {
  if (count <= 0 && maxCount <= 0) return undefined
  const level = contributionLevel(count, maxCount)
  return heatmapLevelColor(level, paletteId, dark)
}