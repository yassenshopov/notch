/** GitHub Linguist–style colors for primary language chips */
const GITHUB_LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Scala: "#c22d40",
  Shell: "#89e051",
  PowerShell: "#012456",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  SQL: "#e38c00",
  R: "#198ce7",
  Objective: "#438eff",
  "Objective-C": "#438eff",
  Lua: "#000080",
  Perl: "#0298c3",
  Haskell: "#5e5086",
  Elixir: "#6e4a7e",
  Clojure: "#db5855",
  Zig: "#ec915c",
  Dockerfile: "#384d54",
  Makefile: "#427819",
  Jupyter: "#DA5B0B",
  Markdown: "#083fa1",
}

function hashHue(text: string) {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0
  return Math.abs(h) % 360
}

export function resolveGitHubLanguageColor(language: string): string {
  const exact = GITHUB_LANGUAGE_COLORS[language]
  if (exact) return exact
  const hue = hashHue(language)
  return `hsl(${hue} 52% 46%)`
}