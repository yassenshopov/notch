import { useEffect, useMemo } from "react"
import L from "leaflet"
import { MapContainer, Polyline, TileLayer, useMap } from "react-leaflet"
import type { LatLngExpression } from "leaflet"
import { useStravaMapTiles } from "../hooks/useStravaMapTiles"
import type { StravaHeatmap, StravaHeatmapBounds, StravaHeatmapRoute } from "../lib/strava"
import { activityRouteColor, decodePolyline, normalizeStravaHeatmap } from "../lib/strava"
import { stravaLeafletInteraction } from "../lib/strava-map-tiles"
import { cn } from "../lib/utils"
import { StravaLeafletResize } from "./StravaLeafletResize"

type Props = {
  heatmap: StravaHeatmap | null
  className?: string
  height?: number
  interactive?: boolean
}

const LEGEND_ITEMS = [
  { label: "Run", kind: "run" as const },
  { label: "Ride", kind: "ride" as const },
  { label: "Swim", kind: "swim" as const },
  { label: "Other", kind: "other" as const },
]

function FitHeatBounds({ bounds }: { bounds: StravaHeatmapBounds }) {
  const map = useMap()

  useEffect(() => {
    const box = L.latLngBounds([bounds.minLat, bounds.minLng], [bounds.maxLat, bounds.maxLng])
    map.fitBounds(box, { padding: [16, 16], maxZoom: 15 })
  }, [map, bounds])

  return null
}

function RouteDensityLayer({ routes }: { routes: StravaHeatmapRoute[] }) {
  const decoded = useMemo(
    () =>
      routes
        .map((route) => ({
          id: route.id,
          type: route.type,
          positions: decodePolyline(route.polyline).map(
            (p) => [p.lat, p.lng] as LatLngExpression,
          ),
        }))
        .filter((route) => route.positions.length >= 2),
    [routes],
  )

  return (
    <>
      {decoded.map((route, index) => (
        <Polyline
          key={route.id ?? index}
          positions={route.positions}
          pathOptions={{
            color: activityRouteColor(route.type || "Run"),
            weight: 3,
            opacity: 0.32,
            lineCap: "round",
            lineJoin: "round",
          }}
        />
      ))}
    </>
  )
}

export function StravaRouteHeatmap({
  heatmap,
  className,
  height = 200,
  interactive = false,
}: Props) {
  const mapTile = useStravaMapTiles()
  const interaction = stravaLeafletInteraction(interactive)
  const normalized = normalizeStravaHeatmap(heatmap)
  const routes = normalized?.routes ?? []
  const bounds = normalized?.bounds

  const center = useMemo(() => {
    if (bounds) {
      return [(bounds.minLat + bounds.maxLat) / 2, (bounds.minLng + bounds.maxLng) / 2] as [
        number,
        number,
      ]
    }
    return [51.5, -0.12] as [number, number]
  }, [bounds])

  if (routes.length === 0 || !bounds) {
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
    <div className={cn(interactive && "space-y-2")}>
      <div
        className={cn(
          "strava-osm-map overflow-hidden rounded-xl border border-black/8 dark:border-white/10",
          interactive && "strava-osm-map--interactive",
          className,
        )}
        style={{ height }}
      >
        <MapContainer
          center={center}
          zoom={12}
          className="size-full"
          style={{ height: "100%", width: "100%" }}
          attributionControl={false}
          {...interaction}
        >
          <TileLayer key={mapTile.url} url={mapTile.url} subdomains={mapTile.subdomains} />
          <StravaLeafletResize />
          <RouteDensityLayer routes={routes} />
          <FitHeatBounds bounds={bounds} />
        </MapContainer>
      </div>
      {interactive ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-black/45 dark:text-white/45">
          {LEGEND_ITEMS.map((item) => (
            <li key={item.kind} className="flex items-center gap-1.5">
              <span
                className="h-0.5 w-4 rounded-full"
                style={{ backgroundColor: activityRouteColor(item.kind) }}
                aria-hidden
              />
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
