import { useEffect, useMemo, useRef } from "react"
import L from "leaflet"
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from "react-leaflet"
import type { LatLngExpression } from "leaflet"
import type { CarTrip } from "../lib/car-mock"
import {
  CAR_SOFIA_HOME,
  CAR_SOFIA_MAP_CENTER,
  routesForTrips,
} from "../lib/car-sofia-routes"
import { stravaLeafletInteraction } from "../lib/strava-map-tiles"
import { useStravaMapTiles } from "../hooks/useStravaMapTiles"
import { cn } from "../lib/utils"
import { StravaLeafletResize } from "./StravaLeafletResize"

type Props = {
  trips: CarTrip[]
  activeTripId?: string | null
  className?: string
  height?: number
}

function FitSofiaBounds({ positions }: { positions: LatLngExpression[] }) {
  const map = useMap()
  const fittedFor = useRef<string | null>(null)

  useEffect(() => {
    if (positions.length < 2) return
    const key = `${positions.length}|${String(positions[0])}|${String(positions[positions.length - 1])}`
    if (fittedFor.current === key) return
    fittedFor.current = key
    const bounds = L.latLngBounds(positions)
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 13 })
  }, [map, positions])

  return null
}

export function CarTripsMap({ trips, activeTripId, className, height = 280 }: Props) {
  const mapTile = useStravaMapTiles()
  const interaction = stravaLeafletInteraction(false)
  const routes = useMemo(() => routesForTrips(trips), [trips])

  const allPositions = useMemo(() => {
    const pts: LatLngExpression[] = [CAR_SOFIA_HOME]
    for (const r of routes) {
      for (const p of r.path) pts.push(p)
    }
    return pts
  }, [routes])

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-black/[0.06] bg-black/[0.03] dark:border-white/8 dark:bg-white/[0.04]",
        "[&_.leaflet-container]:saturate-0 [&_.leaflet-container]:contrast-[1.05]",
        className,
      )}
      style={{ height }}
    >
      <MapContainer
        center={CAR_SOFIA_MAP_CENTER}
        zoom={11}
        className="size-full"
        style={{ height, width: "100%", background: "transparent" }}
        attributionControl={false}
        {...interaction}
      >
        <TileLayer url={mapTile.url} subdomains={mapTile.subdomains} />
        <StravaLeafletResize />
        <FitSofiaBounds positions={allPositions} />
        {routes.map((route) => {
          const active = route.tripId === activeTripId
          return (
            <Polyline
              key={route.tripId}
              positions={route.path}
              pathOptions={{
                color: active ? "#0a0a0a" : "#737373",
                weight: active ? 4 : 2.5,
                opacity: active ? 0.9 : 0.55,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          )
        })}
        <CircleMarker
          center={CAR_SOFIA_HOME}
          radius={7}
          pathOptions={{
            color: "#0a0a0a",
            fillColor: "#0a0a0a",
            fillOpacity: 1,
            weight: 2,
          }}
        />
        {routes.map((route) => (
          <CircleMarker
            key={`${route.tripId}-dest`}
            center={route.to}
            radius={5}
            pathOptions={{
              color: route.tripId === activeTripId ? "#0a0a0a" : "#a3a3a3",
              fillColor: route.tripId === activeTripId ? "#262626" : "#d4d4d4",
              fillOpacity: 1,
              weight: 2,
            }}
          />
        ))}
      </MapContainer>
    </div>
  )
}