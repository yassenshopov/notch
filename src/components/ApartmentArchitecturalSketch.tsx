import {
  APARTMENT_SPACES,
  BALCONY_DOOR_METERS,
  BALCONY_FACADE_WINDOWS,
  footprintBounds,
  WALL_THICKNESS_M,
} from "../lib/apartment-floor-plan"
import {
  BALCONY_DOOR_WIDTH_SU,
  BALCONY_FACADE_WINDOW_PAIR_SU,
  BALCONY_WINDOW_GAP_SU,
  BALCONY_WINDOW_INNER_GAP_SU,
  BALCONY_WINDOW_WEST_MARGIN_SU,
  D_BALCONY_1,
  D_LIVING,
  SU_W,
} from "../lib/apartment-plan-units"
import type { ApartmentPick } from "../lib/apartment-scene"
import { cn } from "../lib/utils"
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"

export type ApartmentPlanHandle = {
  resetView: () => void
}

type Props = {
  pick: ApartmentPick | null
  doorOpen: boolean
  panEnabled: boolean
  onSelect: (pick: ApartmentPick | null) => void
  className?: string
}

const INK = "#000000"
const PAPER = "#ffffff"
const WALL = WALL_THICKNESS_M
const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'

function mm(m: number): string {
  return String(Math.round(m * 1000))
}

function WallMass({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  if (w < 0.001 || h < 0.001) return null
  return <rect x={x} y={y} width={w} height={h} fill={INK} stroke="none" />
}

function DimH({
  x1,
  x2,
  y,
  attachY,
  label,
}: {
  x1: number
  x2: number
  y: number
  attachY: number
  label: string
}) {
  const tick = 0.08
  const sw = 0.022
  const cx = (x1 + x2) / 2
  return (
    <g stroke={INK} strokeWidth={sw} fill={INK}>
      <line x1={x1} y1={attachY} x2={x1} y2={y} />
      <line x1={x2} y1={attachY} x2={x2} y2={y} />
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <line x1={x1 - tick / 2} y1={y} x2={x1 + tick / 2} y2={y} />
      <line x1={x2 - tick / 2} y1={y} x2={x2 + tick / 2} y2={y} />
      <text
        x={cx}
        y={y - 0.1}
        textAnchor="middle"
        fontSize={0.21}
        fontFamily={FONT}
        stroke="none"
      >
        {label}
      </text>
    </g>
  )
}

function DimV({
  y1,
  y2,
  x,
  attachX,
  label,
}: {
  y1: number
  y2: number
  x: number
  attachX: number
  label: string
}) {
  const tick = 0.08
  const sw = 0.022
  const cy = (y1 + y2) / 2
  return (
    <g stroke={INK} strokeWidth={sw} fill={INK}>
      <line x1={attachX} y1={y1} x2={x} y2={y1} />
      <line x1={attachX} y1={y2} x2={x} y2={y2} />
      <line x1={x} y1={y1} x2={x} y2={y2} />
      <line x1={x} y1={y1} x2={x} y2={y1 + tick} />
      <line x1={x} y1={y2 - tick} x2={x} y2={y2} />
      <text
        x={x - 0.1}
        y={cy}
        textAnchor="middle"
        fontSize={0.21}
        fontFamily={FONT}
        stroke="none"
        transform={`rotate(-90 ${x - 0.1} ${cy})`}
      >
        {label}
      </text>
    </g>
  )
}

export const ApartmentArchitecturalSketch = forwardRef<ApartmentPlanHandle, Props>(
  function ApartmentArchitecturalSketch(
    { pick, doorOpen, panEnabled, onSelect, className },
    ref,
  ) {
  const b = footprintBounds()
  const dimPad = 1.15
  const pad = dimPad + 0.35
  const vbW = b.maxX + pad * 2
  const vbH = b.maxZ + pad * 2
  const ox = pad
  const oy = pad

  const initialCam = useMemo(
    () => ({ x: -pad, y: -pad, w: vbW, h: vbH }),
    [pad, vbW, vbH],
  )
  const [cam, setCam] = useState(initialCam)
  const dragRef = useRef<{ px: number; py: number; x: number; y: number } | null>(null)

  const resetView = useCallback(() => setCam(initialCam), [initialCam])
  useImperativeHandle(ref, () => ({ resetView }), [resetView])

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = (e.clientX - rect.left) / rect.width
    const my = (e.clientY - rect.top) / rect.height
    const factor = e.deltaY > 0 ? 1.1 : 1 / 1.1
    const minW = initialCam.w * 0.18
    const maxW = initialCam.w * 2.4
    setCam((c) => {
      let nw = Math.min(maxW, Math.max(minW, c.w * factor))
      const nh = (nw / c.w) * c.h
      return {
        x: c.x + mx * (c.w - nw),
        y: c.y + my * (c.h - nh),
        w: nw,
        h: nh,
      }
    })
  }

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!panEnabled || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { px: e.clientX, py: e.clientY, x: cam.x, y: cam.y }
  }

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const d = dragRef.current
    if (!d || !panEnabled) return
    const rect = e.currentTarget.getBoundingClientRect()
    const dx = ((e.clientX - d.px) / rect.width) * cam.w
    const dy = ((e.clientY - d.py) / rect.height) * cam.h
    setCam((c) => ({ ...c, x: d.x - dx, y: d.y - dy }))
  }

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    dragRef.current = null
  }

  const living = APARTMENT_SPACES.find((s) => s.id === "living")!
  const balcony = APARTMENT_SPACES.find((s) => s.id === "balcony-1")!
  const lr = living.rect
  const br = balcony.rect

  const door = BALCONY_DOOR_METERS
  const [winA, winB] = BALCONY_FACADE_WINDOWS
  const joint = lr.z
  const wx0 = lr.x + winA.offset
  const wx1 = wx0 + winA.width
  const wx2 = lr.x + winB.offset
  const wx3 = wx2 + winB.width
  const dx0 = lr.x + door.offset
  const dx1 = dx0 + door.width
  const ix0 = lr.x
  const ix1 = lr.x + lr.w
  const izBalcony0 = br.z
  const izBalcony1 = joint
  const izLiving0 = joint
  const izLiving1 = lr.z + lr.d

  const selBalcony = pick?.kind === "room" && pick.roomId === "balcony-1"
  const selLiving = pick?.kind === "room" && pick.roomId === "living"

  const dimTop = oy - dimPad
  const dimLeft = ox - dimPad
  const dimRight = ox + b.maxX + dimPad * 0.55
  const attachNorth = oy + izBalcony0
  const attachWest = ox + ix0

  const roomPickable = false

  return (
    <svg
      viewBox={`${cam.x} ${cam.y} ${cam.w} ${cam.h}`}
      className={cn(
        "h-full w-full bg-white select-none",
        panEnabled && "cursor-grab active:cursor-grabbing",
        className,
      )}
      style={{ touchAction: panEnabled ? "none" : undefined }}
      role="img"
      aria-label="Architectural floor plan"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <rect x={-pad} y={-pad} width={vbW} height={vbH} fill={PAPER} />

      <g transform={`translate(${ox} ${oy})`}>
        {/* Room fills */}
        <g
          className={cn(roomPickable && "cursor-pointer")}
          onClick={roomPickable ? () => onSelect({ kind: "room", roomId: "living" }) : undefined}
        >
          <rect x={ix0} y={izLiving0} width={lr.w} height={lr.d} fill={PAPER} />
          {selLiving ? (
            <rect
              x={ix0}
              y={izLiving0}
              width={lr.w}
              height={lr.d}
              fill="none"
              stroke={INK}
              strokeWidth={0.03}
            />
          ) : null}
        </g>
        <g
          className={cn(roomPickable && "cursor-pointer")}
          onClick={roomPickable ? () => onSelect({ kind: "room", roomId: "balcony-1" }) : undefined}
        >
          <rect x={ix0} y={izBalcony0} width={br.w} height={br.d} fill={PAPER} />
          {selBalcony ? (
            <rect
              x={ix0}
              y={izBalcony0}
              width={br.w}
              height={br.d}
              fill="none"
              stroke={INK}
              strokeWidth={0.03}
            />
          ) : null}
        </g>

        {/* Perimeter walls (outer face line) */}
        <WallMass x={ix0 - WALL} y={izBalcony0 - WALL} w={lr.w + WALL * 2} h={WALL} />
        <WallMass x={ix0 - WALL} y={izLiving1} w={lr.w + WALL * 2} h={WALL} />
        <WallMass x={ix0 - WALL} y={izBalcony0} w={WALL} h={izLiving1 - izBalcony0} />
        <WallMass x={ix1} y={izBalcony0} w={WALL} h={izLiving1 - izBalcony0} />

        {/* Shared partition — solid runs + openings */}
        <WallMass x={ix0} y={joint - WALL / 2} w={wx0 - ix0} h={WALL} />
        <WallMass x={wx1} y={joint - WALL / 2} w={Math.max(0, wx2 - wx1)} h={WALL} />
        <WallMass x={wx3} y={joint - WALL / 2} w={Math.max(0, dx0 - wx3)} h={WALL} />
        <WallMass x={dx1} y={joint - WALL / 2} w={ix1 - dx1} h={WALL} />

        {/* Windows (plan): sill lines */}
        {([{ a: wx0, b: wx1, w: winA.width }, { a: wx2, b: wx3, w: winB.width }] as const).map(
          ({ a, b, w }) => (
            <g key={`${a}-${b}`}>
              <line x1={a + 0.06} y1={joint} x2={b - 0.06} y2={joint} stroke={INK} strokeWidth={0.028} />
              <line
                x1={a + w * 0.22}
                y1={joint - WALL * 0.22}
                x2={b - w * 0.22}
                y2={joint - WALL * 0.22}
                stroke={INK}
                strokeWidth={0.018}
              />
              <line
                x1={a + w * 0.22}
                y1={joint + WALL * 0.22}
                x2={b - w * 0.22}
                y2={joint + WALL * 0.22}
                stroke={INK}
                strokeWidth={0.018}
              />
            </g>
          ),
        )}

        {/* Door (plan): hinge at east jamb, leaf along opening when closed, 90° into living (+z) */}
        {(() => {
          const hingeX = dx1
          const hingeY = joint
          const leaf = door.width
          const closedX = dx0
          const openX = hingeX
          const openY = hingeY + leaf
          const leafX = doorOpen ? openX : closedX
          const leafY = doorOpen ? openY : hingeY
          return (
            <g stroke={INK} fill="none">
              <line x1={hingeX} y1={hingeY} x2={leafX} y2={leafY} strokeWidth={0.035} />
              <path
                d={`M ${closedX} ${hingeY} A ${leaf} ${leaf} 0 0 1 ${openX} ${openY}`}
                strokeWidth={0.022}
                strokeDasharray={doorOpen ? "0.14 0.1" : "0.14 0.1"}
                opacity={doorOpen ? 0.45 : 1}
              />
              <circle cx={hingeX} cy={hingeY} r={0.045} fill={INK} stroke="none" />
            </g>
          )
        })()}

        {/* Room tags */}
        <text
          x={ix0 + br.w / 2}
          y={izBalcony0 + br.d / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={0.32}
          fontFamily={FONT}
          fill={INK}
          style={{ pointerEvents: "none" }}
        >
          BALCONY
        </text>
        <text
          x={ix0 + lr.w / 2}
          y={izLiving0 + lr.d / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={0.32}
          fontFamily={FONT}
          fill={INK}
          style={{ pointerEvents: "none" }}
        >
          LIVING + KITCHEN
        </text>
      </g>

      {/* Dimensions — millimeters, outside footprint */}
      <DimH
        x1={ox + ix0}
        x2={ox + ix1}
        y={dimTop}
        attachY={attachNorth}
        label={mm(lr.w)}
      />
      <DimH
        x1={ox + ix0}
        x2={ox + wx0}
        y={oy + joint - WALL / 2 - 0.35}
        attachY={oy + joint - WALL / 2}
        label={`${mm(wx0 - ix0)} (${BALCONY_WINDOW_WEST_MARGIN_SU}u)`}
      />
      <DimH
        x1={ox + wx0}
        x2={ox + wx3}
        y={oy + joint - WALL / 2 - 0.45}
        attachY={oy + joint - WALL / 2}
        label={`${mm(wx3 - wx0)} (${BALCONY_FACADE_WINDOW_PAIR_SU}u)`}
      />
      <DimH
        x1={ox + wx1}
        x2={ox + wx2}
        y={oy + joint - WALL / 2 - 0.55}
        attachY={oy + joint - WALL / 2}
        label={`${mm(wx2 - wx1)} (${BALCONY_WINDOW_INNER_GAP_SU}u)`}
      />
      <DimH
        x1={ox + wx3}
        x2={ox + dx0}
        y={oy + joint - WALL / 2 - 0.65}
        attachY={oy + joint - WALL / 2}
        label={`${mm(dx0 - wx3)} (${BALCONY_WINDOW_GAP_SU}u)`}
      />
      <DimH
        x1={ox + dx0}
        x2={ox + dx1}
        y={oy + joint - WALL / 2 - 0.85}
        attachY={oy + joint - WALL / 2}
        label={`${mm(door.width)} (${BALCONY_DOOR_WIDTH_SU}u)`}
      />

      <DimV
        y1={oy + izBalcony0}
        y2={oy + izBalcony1}
        x={dimRight}
        attachX={ox + ix1 + WALL}
        label={`${mm(br.d)} (${D_BALCONY_1}u)`}
      />
      <DimV
        y1={oy + izLiving0}
        y2={oy + izLiving1}
        x={dimRight + 0.55}
        attachX={ox + ix1 + WALL}
        label={`${mm(lr.d)} (${D_LIVING}u)`}
      />
      <DimV
        y1={oy + izBalcony0}
        y2={oy + izLiving1}
        x={dimLeft}
        attachX={attachWest - WALL}
        label={`${mm(izLiving1 - izBalcony0)} (${D_BALCONY_1 + D_LIVING}u)`}
      />

      <text
        x={ox + ix1 - 0.15}
        y={oy - pad + 0.35}
        fontSize={0.26}
        fontFamily={FONT}
        fill={INK}
        textAnchor="end"
      >
        N
      </text>
      <polygon
        points={`${ox + ix1},${oy - pad + 0.42} ${ox + ix1 - 0.08},${oy - pad + 0.62} ${ox + ix1 + 0.08},${oy - pad + 0.62}`}
        fill={INK}
      />

      <text
        x={ox + ix0}
        y={oy + izLiving1 + dimPad * 0.85}
        fontSize={0.2}
        fontFamily={FONT}
        fill={INK}
        opacity={0.75}
      >
        Units: mm · plan width {SU_W}u ({mm(lr.w)} mm) · living depth {D_LIVING}u · 1u = 84.5 mm
      </text>
    </svg>
  )
  },
)