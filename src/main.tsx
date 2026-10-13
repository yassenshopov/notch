import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import { hydrateSettings } from "./config/settings-store"
import "./index.css"

async function boot() {
  await hydrateSettings()
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot()
