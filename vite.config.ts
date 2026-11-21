import fs from "node:fs"
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

function notchBuildMeta() {
  return {
    name: "notch-build-meta",
    closeBundle() {
      const outDir = path.resolve("dist")
      const pkg = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"))
      fs.writeFileSync(
        path.join(outDir, "build-meta.json"),
        JSON.stringify(
          { builtAt: new Date().toISOString(), version: pkg.version ?? "0.0.0" },
          null,
          2,
        ),
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), notchBuildMeta()],
  base: "./",
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
})
