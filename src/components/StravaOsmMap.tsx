import { useEffect, useMemo, useRef } from "react"
import { Pause, Play, RotateCcw } from "lucide-react"
import L from "leaflet"
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from "react-leaflet"
import type { LatLngExpression } from "leaflet"
import { useStravaRoutePlayback, type StravaRoutePlaybackController } from "../hooks/useStravaRoutePlayback"
import { useStravaMapTiles } from "../hooks/useStravaMapTiles"
import { activityRouteColor, buildStravaRoutePath } from "../lib/strava"
import { stravaLeafletInteraction } from "../lib/strava-map-tiles"
import { cn } from "../lib/utils"
import { StravaLeafletResize } from "./StravaLeafletResize"

type Props = {
  polyline: string | null
  activityType?: string | null
  className?: string
  height?: number
  /** Stretch to parent height (e.g. matched column beside playback panel) */
  fillHeight?: boolean
  /** Pan/zoom — enabled on full desktop Strava page */
  interactive?: boolean
  /** Animate a marker along the route with play/scrub controls */
  playback?: boolean
  /** Share playback state with a parent (e.g. live stats beside the map) */
  playbackController?: StravaRoutePlaybackController
}

function FitRouteBounds({ positions }: { positions: LatLngExpression[] }) {
  const map = useMap()
  const fittedFor = useRef<string | null>(null)

  useEffect(() => {
    if (positions.length < 2) return
    const first = positions[0]
    const last = positions[positions.length - 1]
    const key = `${String(first)}|${positions.length}|${String(last)}`
    if (fittedFor.current === key) return
    fittedFor.current = key
    const bounds = L.latLngBounds(positions)
    map.fitBounds(bounds, { padding: [18, 18], maxZoom: 15 })
  }, [map, positions])

  return null
}

function toLatLng(points: { lat: number; lng: number }[]): LatLngExpression[] {
  return points.map((p) => [p.lat, p.lng] as LatLngExpression)
}

function formatPlaybackClock(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, "0")}`
}

export function StravaOsmMap({
  polyline,
  activityType,
  className,
  height = 168,
  fillHeight = false,
  interactive = false,
  playback = false,
  playbackController,
}: Props) {
  const mapTile = useStravaMapTiles()
  const interaction = stravaLeafletInteraction(interactive)
  const routePoints = useMemo(() => {
    if (!polyline) return []
    return buildStravaRoutePath(polyline)
  }, [polyline])

  const positions = useMemo(() => toLatLng(routePoints), [routePoints])

  const internalPlayback = useStravaRoutePlayback(routePoints)
  const playbackState = playbackController ?? internalPlayback
  const showPlayback = playback && positions.length >= 2

  const routeColor = activityRouteColor(activityType ?? "run")
  const center = positions[0] ?? ([51.5, -0.12] as LatLngExpression)

  const traveledLatLng = useMemo(
    () => toLatLng(playbackState.traveledPositions),
    [playbackState.traveledPositions],
  )

  const markerLatLng = playbackState.markerPosition
    ? ([playbackState.markerPosition.lat, playbackState.markerPosition.lng] as LatLngExpression)
    : null

  const shellStyle = fillHeight ? undefined : { height }

  if (positions.length < 2) {
    return (
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-xl border border-black/8 bg-black/[0.03] text-[11px] text-black/35 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/35",
          fillHeight && "h-full min-h-[168px]",
          className,
        )}
        style={shellStyle}
      >
        No GPS route
      </div>
    )
  }

  return (
    <div
      className={cn(
        "strava-osm-map relative overflow-hidden rounded-xl border border-black/8 dark:border-white/10",
        fillHeight && "h-full min-h-[168px]",
        interactive && "strava-osm-map--interactive",
        showPlayback && "strava-osm-map--playback",
        className,
      )}
      style={shellStyle}
    >
      <MapContainer
        center={center}
        zoom={13}
        className="size-full"
        style={{ height: "100%", width: "100%" }}
        attributionControl={false}
        {...interaction}
      >
        <TileLayer key={mapTile.url} url={mapTile.url} subdomains={mapTile.subdomains} />
        <StravaLeafletResize />
        {showPlayback ? (
          <>
            <Polyline
              positions={positions}
              pathOptions={{ color: routeColor, weight: 4, opacity: 0.22 }}
            />
            {traveledLatLng.length >= 2 ? (
              <Polyline
                positions={traveledLatLng}
                pathOptions={{ color: routeColor, weight: 4, opacity: 0.95 }}
              />
            ) : null}
            {markerLatLng ? (
              <CircleMarker
                center={markerLatLng}
                radius={7}
                pathOptions={{
                  color: "#fff",
                  weight: 2,
                  fillColor: routeColor,
                  fillOpacity: 1,
                }}
              />
            ) : null}
          </>
        ) : (
          <Polyline
            positions={positions}
            pathOptions={{ color: routeColor, weight: 4, opacity: 0.92 }}
          />
        )}
        <FitRouteBounds positions={positions} />
      </MapContainer>

      {showPlayback ? (
        <div
          className="strava-route-playback absolute inset-x-0 bottom-0 z-[500] flex items-center gap-2 border-t border-black/8 bg-gradient-to-t from-black/55 via-black/40 to-transparent px-2.5 pb-2 pt-6 dark:border-white/10"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="strava-route-playback__btn"
            onClick={playbackState.toggle}
            aria-label={playbackState.playing ? "Pause route playback" : "Play route playback"}
          >
            {playbackState.playing ? (
              <Pause className="size-3.5" aria-hidden />
            ) : (
              <Play className="size-3.5" aria-hidden />
            )}
          </button>
          <button
            type="button"
            className="strava-route-playback__btn"
            onClick={playbackState.reset}
            aria-label="Restart route playback"
          >
            <RotateCcw className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            className="strava-route-playback__speed"
            onClick={playbackState.cycleSpeed}
            aria-label={`Playback speed ${playbackState.speed}x, click to change`}
          >
            {playbackState.speed}x
          </button>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(playbackState.progress * 1000)}
            onChange={(e) => playbackState.seek(Number(e.target.value) / 1000)}
            className="strava-route-playback__scrub min-w-0 flex-1"
            aria-label="Route playback progress"
          />
          <span className="shrink-0 text-[10px] font-medium tabular-nums text-white/90">
            {formatPlaybackClock(playbackState.elapsedSeconds)}
            {playbackState.durationMs > 0
              ? ` / ${formatPlaybackClock(playbackState.durationMs / 1000)}`
              : null}
          </span>
        </div>
      ) : null}
    </div>
  )
}
