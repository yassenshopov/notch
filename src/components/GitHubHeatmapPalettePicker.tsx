import type { GitHubHeatmapPaletteId } from "../lib/github-heatmap-palettes"
import { GITHUB_HEATMAP_PALETTES } from "../lib/github-heatmap-palettes"
import { useTheme } from "../hooks/useTheme"
import { cn } from "../lib/utils"

type Props = {
  value: GitHubHeatmapPaletteId
  onChange: (id: GitHubHeatmapPaletteId) => void
  className?: string
}

export function GitHubHeatmapPalettePicker({ value, onChange, className }: Props) {
  const dark = useTheme()
  const levels = [0, 1, 2, 3, 4] as const

  return (
    <div
      className={cn(
        "notch-scroll grid max-h-[min(52vh,24rem)] grid-cols-2 gap-2 overflow-y-auto pr-0.5 sm:grid-cols-3",
        className,
      )}
      role="radiogroup"
      aria-label="Contribution graph colors"
    >
      {GITHUB_HEATMAP_PALETTES.map((palette) => {
        const selected = palette.id === value
        const ramp = dark ? palette.dark : palette.light
        return (
          <button
            key={palette.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(palette.id)}
            className={cn(
              "flex flex-col gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors",
              selected
                ? "border-black/20 bg-black/[0.04] dark:border-white/25 dark:bg-white/[0.06]"
                : "border-black/[0.08] bg-transparent hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/[0.04]",
            )}
          >
            <span className="text-[11px] font-medium text-black/70 dark:text-white/75">
              {palette.label}
            </span>
            <span className="flex gap-[3px]" aria-hidden>
              {levels.map((level) => (
                <span
                  key={level}
                  className="size-3.5 rounded-[2px]"
                  style={{ backgroundColor: ramp[level] }}
                />
              ))}
            </span>
          </button>
        )
      })}
    </div>
  )
}