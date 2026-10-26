const grid = require("../placement-grid.json")

const TOP_SLOTS = Math.max(3, grid.topSlots | 0)
const SIDE_SLOTS = Math.max(2, grid.sideSlots | 0)

function slotCount(edge) {
  if (edge === "top") return TOP_SLOTS
  return SIDE_SLOTS
}

/** Fixed middle slot on the top bar (true display center when positioned). */
function topCenterSlot() {
  return Math.floor((slotCount("top") - 1) / 2)
}

function clampSlot(edge, slot) {
  const max = slotCount(edge) - 1
  const n = typeof slot === "number" ? Math.round(slot) : 0
  return Math.min(max, Math.max(0, n))
}

function fractionForSlot(edge, slot) {
  const max = slotCount(edge) - 1
  if (max <= 0) return 0.5
  return clampSlot(edge, slot) / max
}

function slotForFraction(edge, fraction) {
  const max = slotCount(edge) - 1
  if (max <= 0) return 0
  return clampSlot(edge, Math.round(clamp01(fraction) * max))
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0.5
  return Math.min(1, Math.max(0, value))
}

/** Corner silhouette when hugging a display corner. */
function resolveForm(edge, slot) {
  const s = clampSlot(edge, slot)
  const topMax = slotCount("top") - 1
  if (edge === "top" && s === 0) return "corner-tl"
  if (edge === "top" && s === topMax) return "corner-tr"
  if (edge === "left" && s === 0) return "corner-tl"
  if (edge === "right" && s === 0) return "corner-tr"
  return "pill"
}

function placementWithForm(placement) {
  const edge = placement.edge
  const slot = clampSlot(edge, placement.slot)
  return {
    displayId: placement.displayId ?? null,
    edge,
    slot,
    form: resolveForm(edge, slot),
  }
}

module.exports = {
  TOP_SLOTS,
  SIDE_SLOTS,
  slotCount,
  topCenterSlot,
  clampSlot,
  fractionForSlot,
  slotForFraction,
  resolveForm,
  placementWithForm,
}
