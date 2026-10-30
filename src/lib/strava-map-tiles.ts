/** CARTO “light, no labels” — minimal basemap (requires API key on CDN). */
const CARTO_LIGHT_NOLABELS =
  "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"

export type StravaMapTileLayerProps = {
  url: string
  subdomains: string
}

function cartoApiKey(): string {
  const fromVite = import.meta.env.VITE_CARTO_API_KEY?.trim()
  if (fromVite) return fromVite
  const fromBridge = window.notch?.mapTiles?.cartoApiKey?.trim()
  if (fromBridge) return fromBridge
  return ""
}

export function stravaLeafletInteraction(interactive = false) {
  return {
    scrollWheelZoom: interactive,
    dragging: interactive,
    doubleClickZoom: interactive,
    touchZoom: interactive,
    boxZoom: interactive,
    keyboard: interactive,
    zoomControl: interactive,
  }
}

export function getStravaMapTileLayerProps(apiKeyOverride?: string): StravaMapTileLayerProps {
  const apiKey = (apiKeyOverride ?? cartoApiKey()).trim()
  const url = apiKey
    ? `${CARTO_LIGHT_NOLABELS}?key=${encodeURIComponent(apiKey)}`
    : CARTO_LIGHT_NOLABELS

  return {
    url,
    subdomains: "abcd",
  }
}
