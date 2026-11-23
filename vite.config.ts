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
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined
          if (id.includes("@react-three")) return "react-three"
          if (id.includes("three/examples") || id.includes("three/addons")) {
            return "three-addons"
          }
          if (id.includes("three")) return "three"
          if (id.includes("leaflet")) return "leaflet"
          if (id.includes("motion")) return "motion"
          if (id.includes("lucide-react")) return "icons"
          return undefined
        },
      },
    },
  },
})
