import { useEffect, useMemo } from "react"
import L from "leaflet"
import { MapContainer, Polyline, TileLayer, useMap } from "react-leaflet"
import type { LatLngExpression } from "leaflet"
import { getStravaMapTileLayerProps } from "../lib/strava-map-tiles"
import type { StravaHeatmap, StravaHeatmapBounds } from "../lib/strava"
import { decodePolyline } from "../lib/strava"
import { cn } from "../lib/utils"

type Props = {
  heatmap: StravaHeatmap | null
  className?: string
  height?: number
}

function FitHeatBounds({ bounds }: { bounds: StravaHeatmapBounds }) {
  const map = useMap()

  useEffect(() => {
    const box = L.latLngBounds([bounds.minLat, bounds.minLng], [bounds.maxLat, bounds.maxLng])
    map.fitBounds(box, { padding: [16, 16], maxZoom: 15 })
  }, [map, bounds])

  return null
}

function RouteDensityLayer({ polylines }: { polylines: string[] }) {
  const routes = useMemo(
    () =>
      polylines
        .map((encoded) =>
          decodePolyline(encoded).map((p) => [p.lat, p.lng] as LatLngExpression),
        )
        .filter((positions) => positions.length >= 2),
    [polylines],
  )

  return (
    <>
      {routes.map((positions, index) => (
        <Polyline
          key={index}
          positions={positions}
          pathOptions={{
            color: "#fc4c02",
            weight: 3,
            opacity: 0.28,
            lineCap: "round",
            lineJoin: "round",
          }}
        />
      ))}
    </>
  )
}

export function StravaRouteHeatmap({ heatmap, className, height = 200 }: Props) {
  const mapTile = useMemo(() => getStravaMapTileLayerProps(), [])
  const polylines = heatmap?.polylines ?? []
  const bounds = heatmap?.bounds

  const center = useMemo(() => {
    if (bounds) {
      return [(bounds.minLat + bounds.maxLat) / 2, (bounds.minLng + bounds.maxLng) / 2] as [
        number,
        number,
      ]
    }
    return [51.5, -0.12] as [number, number]
  }, [bounds])

  if (polylines.length === 0 || !bounds) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl border border-black/8 bg-black/[0.03] text-[11px] text-black/35 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/35",
          className,
        )}
        style={{ height }}
      >
        Ride or run more to build your heatmap
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
        zoom={12}
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
        <RouteDensityLayer polylines={polylines} />
        <FitHeatBounds bounds={bounds} />
      </MapContainer>
    </div>
  )
}
