/** Default hues for repo breakdown donut, charts, and bars (in stable order). */
export const GITHUB_REPO_DEFAULT_PALETTE = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#6366f1",
  "#14b8a6",
  "#ec4899",
] as const

export const GITHUB_REPO_OTHER_COLOR = "rgba(120,120,120,0.55)"

const HEX = /^#[0-9a-fA-F]{6}$/

export function isValidRepoColor(value: string) {
  return HEX.test(value)
}

export function defaultRepoColor(index: number) {
  return GITHUB_REPO_DEFAULT_PALETTE[index % GITHUB_REPO_DEFAULT_PALETTE.length]!
}

export function resolveRepoColor(
  repo: string,
  index: number,
  overrides: Record<string, string> | undefined,
): string {
  const custom = overrides?.[repo]?.trim()
  if (custom && isValidRepoColor(custom)) return custom
  return defaultRepoColor(index)
}