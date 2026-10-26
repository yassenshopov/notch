/** Smooth OS-window moves (placement snap / drag between grid slots). */
const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5)

let anim = null

function cancelWindowAnimation() {
  if (anim?.timer) clearTimeout(anim.timer)
  anim = null
}

function animateBounds(from, to, setBounds, opts = {}) {
  cancelWindowAnimation()
  const durationMs = opts.durationMs ?? 480
  const start = performance.now()

  const tick = () => {
    const elapsed = performance.now() - start
    const p = Math.min(1, elapsed / durationMs)
    const e = easeOutQuint(p)
    setBounds({
      x: Math.round(from.x + (to.x - from.x) * e),
      y: Math.round(from.y + (to.y - from.y) * e),
      width: to.width,
      height: to.height,
    })
    if (p < 1) {
      anim = { timer: setTimeout(tick, 1000 / 120) }
    } else {
      anim = null
      opts.onComplete?.()
    }
  }

  tick()
}

/**
 * Decelerate along one axis (px), then call onSettle(finalAxis).
 * @param {(axis: number) => void} setAxis
 */
function animateAxisInertia(startAxis, velocityPxPerSec, minAxis, maxAxis, setAxis, onSettle) {
  cancelWindowAnimation()
  let axis = startAxis
  let velocity = velocityPxPerSec
  const friction = 0.9
  const minSpeed = 35

  const tick = () => {
    velocity *= friction
    axis += velocity / 60
    axis = Math.min(maxAxis, Math.max(minAxis, axis))
    setAxis(axis)
    if (Math.abs(velocity) > minSpeed) {
      anim = { timer: setTimeout(tick, 1000 / 60) }
    } else {
      anim = null
      onSettle(axis)
    }
  }

  tick()
}

module.exports = {
  animateBounds,
  animateAxisInertia,
  cancelWindowAnimation,
}
