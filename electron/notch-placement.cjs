const { screen } = require("electron")
const settingsStore = require("./settings-store.cjs")
const grid = require("./notch-placement-grid.cjs")
const windowMotion = require("./notch-window-motion.cjs")
const collapsedSize = require("./notch-collapsed-size.cjs")

/** Horizontal room for concave ears beyond the pill (top edge / side shells) */
const EAR_PAD = 36

const EDGES = new Set(["top", "left", "right"])

const DEFAULT_PLACEMENT = {
  displayId: null,
  edge: "top",
  slot: grid.topCenterSlot(),
}

/**
 * @type {{
 *   edge: string
 *   axisOffset: number
 *   width: number
 *   height: number
 *   contentW: number
 *   contentH: number
 *   slot: number
 *   displayId: number | null
 *   lastKey: string
 * } | null}
 */
let dragState = null

function clamp(min, value, max) {
  return Math.min(max, Math.max(min, value))
}

function normalizeEdge(edge) {
  if (edge === "bottom") return "top"
  return EDGES.has(edge) ? edge : DEFAULT_PLACEMENT.edge
}

function normalizePlacement(raw) {
  const edge = normalizeEdge(raw?.edge)
  let slot = raw?.slot
  if (typeof slot !== "number" && typeof raw?.offset === "number") {
    slot = grid.slotForFraction(edge, raw.offset)
  }
  const placement = grid.placementWithForm({
    displayId: typeof raw?.displayId === "number" ? raw.displayId : null,
    edge,
    slot: grid.clampSlot(edge, typeof slot === "number" ? slot : DEFAULT_PLACEMENT.slot),
  })
  return placement
}

function readPlacement() {
  return normalizePlacement(settingsStore.readSettings()?.placement)
}

function writePlacement(placement) {
  const next = normalizePlacement(placement)
  settingsStore.writeSettings({ placement: next })
  return next
}

function resolveDisplay(placement, point) {
  const displays = screen.getAllDisplays()
  if (placement.displayId != null) {
    const found = displays.find((d) => d.id === placement.displayId)
    if (found) return found
  }
  if (point) return screen.getDisplayNearestPoint(point)
  return screen.getPrimaryDisplay()
}

function displayContainingX(screenX, screenY) {
  const displays = screen.getAllDisplays()
  for (const d of displays) {
    const db = d.bounds
    if (screenX >= db.x && screenX < db.x + db.width) return d
  }
  return screen.getDisplayNearestPoint({ x: screenX, y: screenY })
}

function displayContainingY(screenX, screenY) {
  const displays = screen.getAllDisplays()
  for (const d of displays) {
    const db = d.bounds
    if (screenY >= db.y && screenY < db.y + db.height) return d
  }
  return screen.getDisplayNearestPoint({ x: screenX, y: screenY })
}

function earPadsForPlacement(edge, form) {
  if (edge === "top") {
    if (form === "corner-tl" || form === "corner-tr") {
      return { start: EAR_PAD, end: EAR_PAD }
    }
    return { start: EAR_PAD, end: EAR_PAD }
  }
  if (edge === "left") {
    if (form === "corner-tl") return { start: 0, end: EAR_PAD }
    return { start: EAR_PAD, end: EAR_PAD }
  }
  if (edge === "right") {
    if (form === "corner-tr") return { start: 0, end: EAR_PAD }
    return { start: EAR_PAD, end: EAR_PAD }
  }
  return { start: EAR_PAD, end: EAR_PAD }
}

function shellSize(contentW, contentH, edge, form) {
  const sized = collapsedSize.collapsedContentDimensions(
    form,
    Math.max(40, Number(contentW) || 152),
    Math.max(24, Number(contentH) || 34),
  )
  const w = sized.width
  const h = sized.height
  const pads = earPadsForPlacement(edge, form)
  if (edge === "left" || edge === "right") {
    return { width: h + 16, height: w + pads.start + pads.end }
  }
  return { width: w + pads.start + pads.end, height: h + 16 }
}

function positionOnDisplay(display, placement, shellW, shellH) {
  const db = display.bounds
  const fraction = grid.fractionForSlot(placement.edge, placement.slot)
  const topMax = grid.slotCount("top") - 1
  const topSlot = grid.clampSlot("top", placement.slot)
  switch (placement.edge) {
    case "top": {
      const travel = Math.max(0, db.width - shellW)
      const centerSlot = grid.topCenterSlot()
      if (topSlot === 0) {
        return { x: db.x, y: db.y }
      }
      if (topSlot === topMax) {
        return { x: db.x + db.width - shellW, y: db.y }
      }
      if (topSlot === centerSlot) {
        return { x: db.x + Math.round((db.width - shellW) / 2), y: db.y }
      }
      return {
        x: db.x + Math.round(fraction * travel),
        y: db.y,
      }
    }
    case "left":
      return {
        x: db.x,
        y: db.y + Math.round(fraction * Math.max(0, db.height - shellH)),
      }
    case "right":
      return {
        x: db.x + db.width - shellW,
        y: db.y + Math.round(fraction * Math.max(0, db.height - shellH)),
      }
    default:
      return { x: db.x, y: db.y }
  }
}

function boundsForPlacement(placement, contentW, contentH) {
  const p = normalizePlacement(placement)
  const { width: shellW, height: shellH } = shellSize(contentW, contentH, p.edge, p.form)
  const display = resolveDisplay(p, null)
  let { x, y } = positionOnDisplay(display, p, shellW, shellH)

  const center = { x: x + shellW / 2, y: y + shellH / 2 }
  const nearest = screen.getDisplayNearestPoint(center)
  if (nearest.id !== display.id) {
    const next = { ...p, displayId: nearest.id }
    const pos = positionOnDisplay(nearest, next, shellW, shellH)
    x = pos.x
    y = pos.y
  }

  const resolved = grid.placementWithForm({
    ...p,
    displayId: nearest?.id ?? display.id,
  })

  return {
    x,
    y,
    width: shellW,
    height: shellH,
    placement: resolved,
  }
}

function slotFromPointer(edge, display, shellW, shellH, screenX, screenY, axisOffset) {
  const db = display.bounds
  const count = grid.slotCount(edge)
  const max = count - 1

  if (edge === "top") {
    const travel = Math.max(0, db.width - shellW)
    const x = clamp(db.x, screenX - axisOffset, db.x + travel)
    const frac = travel > 0 ? (x - db.x) / travel : 0.5
    return grid.clampSlot(edge, Math.round(frac * max))
  }

  const travel = Math.max(0, db.height - shellH)
  const y = clamp(db.y, screenY - axisOffset, db.y + travel)
  const frac = travel > 0 ? (y - db.y) / travel : 0.5
  return grid.clampSlot(edge, Math.round(frac * max))
}

function edgeFromPointer(screenX, screenY, currentEdge) {
  const display = screen.getDisplayNearestPoint({ x: screenX, y: screenY })
  const db = display.bounds
  const center = { x: screenX, y: screenY }

  const distTop = center.y - db.y
  const distLeft = center.x - db.x
  const distRight = db.x + db.width - center.x

  let edge = "top"
  let best = distTop
  if (distLeft < best) {
    best = distLeft
    edge = "left"
  }
  if (distRight < best) {
    edge = "right"
  }

  // Hysteresis: stay on current edge unless another edge is clearly closer.
  if (currentEdge && currentEdge === edge) return edge
  const margin = 48
  if (currentEdge === "top" && distTop < margin + 80) return "top"
  if (currentEdge === "left" && distLeft < margin + 80) return "left"
  if (currentEdge === "right" && distRight < margin + 80) return "right"

  return edge
}

function shellForDrag(state, edge, slot) {
  const form = grid.resolveForm(edge, slot ?? state.slot)
  return shellSize(state.contentW, state.contentH, edge, form)
}

function boundsAlongPointer(edge, screenX, screenY, state) {
  const { width: shellW, height: shellH } = shellForDrag(state, edge, state.slot)
  const normalizedEdge = normalizeEdge(edge)

  if (normalizedEdge === "top") {
    const display = displayContainingX(screenX, screenY)
    const db = display.bounds
    const x = clamp(
      db.x,
      screenX - state.axisOffset,
      db.x + Math.max(0, db.width - shellW),
    )
    return {
      x: Math.round(x),
      y: db.y,
      width: shellW,
      height: shellH,
      display,
    }
  }

  const display = displayContainingY(screenX, screenY)
  const db = display.bounds
  const y = clamp(
    db.y,
    screenY - state.axisOffset,
    db.y + Math.max(0, db.height - shellH),
  )
  const x = normalizedEdge === "left" ? db.x : db.x + db.width - shellW
  return {
    x,
    y: Math.round(y),
    width: shellW,
    height: shellH,
    display,
  }
}

function axisFromBounds(edge, bounds, display) {
  const db = display.bounds
  if (edge === "top") return bounds.x - db.x
  return bounds.y - db.y
}

function slotFromAxis(edge, axis, display, shellW, shellH) {
  const db = display.bounds
  const max = grid.slotCount(edge) - 1
  if (edge === "top") {
    const travel = Math.max(0, db.width - shellW)
    if (travel > 0) {
      const centerAxis = travel / 2
      const magnet = travel * 0.18
      if (Math.abs(axis - centerAxis) <= magnet) {
        return grid.topCenterSlot()
      }
    }
    const frac = travel > 0 ? axis / travel : 0.5
    return grid.clampSlot(edge, Math.round(frac * max))
  }
  const travel = Math.max(0, db.height - shellH)
  const frac = travel > 0 ? axis / travel : 0.5
  return grid.clampSlot(edge, Math.round(frac * max))
}

function trackDragSample(screenX, screenY) {
  if (!dragState) return
  const now = Date.now()
  if (!dragState.samples) dragState.samples = []
  dragState.samples.push({ x: screenX, y: screenY, t: now })
  while (dragState.samples.length > 7) dragState.samples.shift()
}

function releaseAxisVelocity() {
  if (!dragState?.samples || dragState.samples.length < 2) return 0
  const last = dragState.samples[dragState.samples.length - 1]
  const first = dragState.samples[0]
  const dt = Math.max(10, last.t - first.t)
  const delta =
    dragState.edge === "top" ? last.x - first.x : last.y - first.y
  return (delta / dt) * 1000 * 1.35
}

function travelRange(edge, display, shellW, shellH) {
  const db = display.bounds
  if (edge === "top") return Math.max(0, db.width - shellW)
  return Math.max(0, db.height - shellH)
}

function snapPlacementFromDrag(state, screenX, screenY) {
  const edge = edgeFromPointer(screenX, screenY, state.edge)
  const form = grid.resolveForm(edge, state.slot)
  const { width: shellW, height: shellH } = shellSize(
    state.contentW,
    state.contentH,
    edge,
    form,
  )
  const display =
    edge === "top"
      ? displayContainingX(screenX, screenY)
      : displayContainingY(screenX, screenY)
  const slot = slotFromPointer(edge, display, shellW, shellH, screenX, screenY, state.axisOffset)
  return grid.placementWithForm({
    displayId: display.id,
    edge,
    slot,
  })
}

function displayForPlacement(placement, windowBounds) {
  if (windowBounds) {
    const center = {
      x: windowBounds.x + windowBounds.width / 2,
      y: windowBounds.y + windowBounds.height / 2,
    }
    return resolveDisplay(placement, center)
  }
  return resolveDisplay(placement, null)
}

function beginDrag(screenX, screenY, contentW, contentH, windowBounds) {
  windowMotion.cancelWindowAnimation()
  const placement = readPlacement()
  const edge = placement.edge
  const { width: shellW, height: shellH } = shellSize(
    contentW,
    contentH,
    edge,
    placement.form,
  )
  dragState = {
    edge,
    axisOffset: edge === "top" ? screenX - windowBounds.x : screenY - windowBounds.y,
    width: shellW,
    height: shellH,
    contentW,
    contentH,
    slot: placement.slot,
    displayId: placement.displayId,
    samples: [{ x: screenX, y: screenY, t: Date.now() }],
  }
}

function moveDrag(screenX, screenY, setBounds) {
  if (!dragState) return
  trackDragSample(screenX, screenY)
  const edge = edgeFromPointer(screenX, screenY, dragState.edge)
  dragState.edge = edge
  windowMotion.cancelWindowAnimation()
  const target = boundsAlongPointer(edge, screenX, screenY, dragState)
  dragState.displayId = target.display.id
  setBounds({
    x: target.x,
    y: target.y,
    width: target.width,
    height: target.height,
  })
}

function boundsGlidingOnAxis(edge, axis, state, display) {
  const shellW = state.width
  const shellH = state.height
  const db = display.bounds
  const travel =
    edge === "top"
      ? Math.max(0, db.width - shellW)
      : Math.max(0, db.height - shellH)
  const clamped = clamp(0, axis, travel)
  if (edge === "top") {
    return {
      x: db.x + Math.round(clamped),
      y: db.y,
      width: shellW,
      height: shellH,
    }
  }
  const y = db.y + Math.round(clamped)
  const x = edge === "left" ? db.x : db.x + db.width - shellW
  return { x, y, width: shellW, height: shellH }
}

function endDrag(windowBounds, setBounds, notify) {
  if (!dragState) return readPlacement()
  windowMotion.cancelWindowAnimation()

  const edge = dragState.edge
  const display = screen.getDisplayNearestPoint({
    x: windowBounds.x + windowBounds.width / 2,
    y: windowBounds.y + windowBounds.height / 2,
  })
  const startAxis = axisFromBounds(edge, windowBounds, display)
  const travel = travelRange(edge, display, windowBounds.width, windowBounds.height)
  const velocity = releaseAxisVelocity()
  const state = dragState
  dragState = null
  let latest = getBoundsSnapshot(windowBounds)

  const settle = (axis) => {
    const glide = boundsGlidingOnAxis(edge, axis, state, display)
    const placement = grid.placementWithForm({
      displayId: display.id,
      edge,
      slot: slotFromAxis(edge, axis, display, glide.width, glide.height),
    })
    const saved = writePlacement(placement)
    const snapped = boundsForPlacement(saved, state.contentW, state.contentH)
    windowMotion.animateBounds(latest, snapped, setBounds, {
      durationMs: 480,
      onComplete: () => notify(saved),
    })
    return saved
  }

  if (Math.abs(velocity) < 80 || travel <= 0) {
    return settle(startAxis)
  }

  return new Promise((resolve) => {
    windowMotion.animateAxisInertia(
      startAxis,
      velocity,
      0,
      travel,
      (axis) => {
        latest = boundsGlidingOnAxis(edge, axis, state, display)
        setBounds(latest)
      },
      (finalAxis) => {
        resolve(settle(finalAxis))
      },
    )
  })
}

/** Match src/lib/notch-expanded-chrome.ts */
const EXPANDED_RAIL_GUTTER = 56
const EXPANDED_SIDE_INSET = EAR_PAD
const EXPANDED_BOTTOM_BLEED = 12

function expandedWindowBounds(placement, contentW, contentH, expandedW, expandedH) {
  const p = normalizePlacement(placement)
  const collapsed = boundsForPlacement(p, contentW, contentH)
  const ew = Math.max(200, Number(expandedW) || 380)
  const eh = Math.max(200, Number(expandedH) || 580)

  let width
  let height
  if (p.edge === "left" || p.edge === "right") {
    width = eh + 16 + EXPANDED_RAIL_GUTTER * 2
    height = ew + EXPANDED_SIDE_INSET * 2 + EXPANDED_BOTTOM_BLEED
  } else {
    width = ew + EXPANDED_SIDE_INSET * 2 + EXPANDED_RAIL_GUTTER * 2
    height = eh + EXPANDED_BOTTOM_BLEED
  }

  const centerX = collapsed.x + collapsed.width / 2
  let x = Math.round(centerX - width / 2)
  let y = collapsed.y

  const display = resolveDisplay(p, { x: centerX, y: collapsed.y })
  const db = display.bounds
  const wa = display.workArea
  x = clamp(wa.x, x, wa.x + Math.max(0, wa.width - width))
  if (p.edge === "top") {
    // Stay glued to the physical top edge (not workArea — that adds a taskbar gap)
    y = db.y
    if (y + height > db.y + db.height) {
      y = Math.max(db.y, db.y + db.height - height)
    }
  } else {
    y = clamp(wa.y, y, wa.y + Math.max(0, wa.height - height))
  }

  return { x, y, width, height }
}

function getBoundsSnapshot(bounds) {
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  }
}

function cancelDrag() {
  windowMotion.cancelWindowAnimation()
  dragState = null
}

module.exports = {
  EAR_PAD,
  readPlacement,
  writePlacement,
  boundsForPlacement,
  expandedWindowBounds,
  displayForPlacement,
  shellSize,
  beginDrag,
  moveDrag,
  endDrag,
  cancelDrag,
}
