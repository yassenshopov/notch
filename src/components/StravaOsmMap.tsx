import { useEffect, useMemo } from "react"
import L from "leaflet"
import { MapContainer, Polyline, TileLayer, useMap } from "react-leaflet"
import type { LatLngExpression } from "leaflet"
import { getStravaMapTileLayerProps } from "../lib/strava-map-tiles"
import { decodePolyline } from "../lib/strava"
import { cn } from "../lib/utils"

type Props = {
  polyline: string | null
  className?: string
  height?: number
}

function FitRouteBounds({ positions }: { positions: LatLngExpression[] }) {
  const map = useMap()

  useEffect(() => {
    if (positions.length < 2) return
    const bounds = L.latLngBounds(positions)
    map.fitBounds(bounds, { padding: [18, 18], maxZoom: 15 })
  }, [map, positions])

  return null
}

export function StravaOsmMap({ polyline, className, height = 168 }: Props) {
  const mapTile = useMemo(() => getStravaMapTileLayerProps(), [])
  const positions = useMemo(() => {
    if (!polyline) return [] as LatLngExpression[]
    return decodePolyline(polyline).map((p) => [p.lat, p.lng] as LatLngExpression)
  }, [polyline])

  const center = positions[0] ?? ([51.5, -0.12] as LatLngExpression)

  if (positions.length < 2) {
    return (
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-xl border border-black/8 bg-black/[0.03] text-[11px] text-black/35 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/35",
          className,
        )}
        style={{ height }}
      >
        No GPS route
      </div>
    )
  }

  return (
    <div
      className={cn(
        "strava-osm-map overflow-hidden rounded-xl border border-black/8 dark:border-white/10",
        className,
      )}
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={13}
        className="size-full"
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url={mapTile.url} subdomains={mapTile.subdomains} />
        <Polyline
          positions={positions}
          pathOptions={{ color: "#fc4c02", weight: 4, opacity: 0.92 }}
        />
        <FitRouteBounds positions={positions} />
      </MapContainer>
    </div>
  )
}
