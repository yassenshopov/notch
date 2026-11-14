/**
 * Procedural Mazda 6 GH sport wagon (~2009) — illustrative studio mesh inspired by eculink truck geometry.
 */

import * as THREE from "three"
import type { CarViewerPalette } from "./car-3d-studio"
import { parseCarBodyPaintHex } from "./car-3d-studio"

type ShapePoint =
  | [number, number]
  | [number, number, number, number]
  | ["arc", number, number, number, number, number, boolean]

type PaintKey = "bodyPaint" | "bodyDark" | "chrome"

type MatCtx = {
  palette: CarViewerPalette
  bodyMats: THREE.Material[]
  paintMats: THREE.MeshPhysicalMaterial[]
}

import type { CarModelHandle } from "./car-model-handle"

function tagPaint(m: THREE.Material, key: PaintKey) {
  m.userData.carPaintKey = key
}

function mat(
  kind: "paint" | "paintDark" | "plastic" | "chrome" | "glass" | "tire" | "alu" | "lamp",
  ctx: MatCtx,
): THREE.Material {
  const P = THREE.MeshPhysicalMaterial
  switch (kind) {
    case "paint": {
      const m = new P({
        color: ctx.palette.bodyPaint,
        metalness: 0.42,
        roughness: 0.22,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        envMapIntensity: 1.1,
      })
      tagPaint(m, "bodyPaint")
      ctx.bodyMats.push(m)
      ctx.paintMats.push(m)
      return m
    }
    case "paintDark": {
      const m = new P({
        color: ctx.palette.bodyDark,
        metalness: 0.35,
        roughness: 0.5,
        clearcoat: 0.35,
      })
      tagPaint(m, "bodyDark")
      ctx.bodyMats.push(m)
      return m
    }
    case "plastic": {
      const m = new THREE.MeshStandardMaterial({ color: 0x14181c, metalness: 0.05, roughness: 0.82 })
      ctx.bodyMats.push(m)
      return m
    }
    case "chrome": {
      const m = new THREE.MeshStandardMaterial({
        color: ctx.palette.chrome,
        metalness: 1,
        roughness: 0.1,
        envMapIntensity: 1.2,
      })
      tagPaint(m, "chrome")
      ctx.bodyMats.push(m)
      return m
    }
    case "glass": {
      const m = new P({
        color: 0x0a1018,
        metalness: 0.15,
        roughness: 0.03,
        clearcoat: 1,
        transparent: true,
        opacity: 0.52,
        side: THREE.DoubleSide,
        envMapIntensity: 1.4,
      })
      ctx.bodyMats.push(m)
      return m
    }
    case "tire":
      return new THREE.MeshStandardMaterial({ color: 0x121316, metalness: 0, roughness: 0.9 })
    case "alu": {
      const m = new THREE.MeshStandardMaterial({
        color: 0xb8bdc4,
        metalness: 0.92,
        roughness: 0.26,
        envMapIntensity: 1.1,
      })
      ctx.bodyMats.push(m)
      return m
    }
    case "lamp": {
      const m = new THREE.MeshStandardMaterial({
        color: 0xffe8d8,
        emissive: 0xffaa77,
        emissiveIntensity: themeEmissive(),
        metalness: 0.1,
        roughness: 0.35,
      })
      ctx.bodyMats.push(m)
      return m
    }
  }
}

function themeEmissive() {
  return 0.75
}

function shape(pts: ShapePoint[]): THREE.Shape {
  const sh = new THREE.Shape()
  pts.forEach((p, i) => {
    if (i === 0 && p.length === 2) sh.moveTo(p[0], p[1])
    else if (p[0] === "arc") sh.absarc(p[1], p[2], p[3], p[4], p[5], p[6])
    else if (p.length === 4) sh.quadraticCurveTo(p[2], p[3], p[0], p[1])
    else if (p.length === 2) sh.lineTo(p[0], p[1])
  })
  return sh
}

function sideExtrude(pts: ShapePoint[], width: number, material: THREE.Material, bevel = 0.06): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(shape(pts), {
    depth: width - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 5,
    steps: 1,
    curveSegments: 32,
  })
  geo.translate(0, 0, -(width - bevel * 2) / 2)
  const mesh = new THREE.Mesh(geo, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function box(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  material: THREE.Material,
  shadows = true,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  m.position.set(x, y, z)
  m.castShadow = shadows
  m.receiveShadow = shadows
  return m
}

function addEdges(mesh: THREE.Mesh, parent: THREE.Group, edgeMat: THREE.LineBasicMaterial, threshold = 28) {
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, threshold), edgeMat)
  edges.position.copy(mesh.position)
  edges.rotation.copy(mesh.rotation)
  edges.scale.copy(mesh.scale)
  parent.add(edges)
}

function addWheel(x: number, z: number, parent: THREE.Group, ctx: MatCtx, wheelGroups: THREE.Group[]) {
  const grp = new THREE.Group()
  grp.position.set(x, 0.34, z)
  parent.add(grp)
  wheelGroups.push(grp)

  const V = (a: number, b: number) => new THREE.Vector2(a, b)
  const tireGeo = new THREE.LatheGeometry(
    [
      V(0.26, -0.11),
      V(0.41, -0.115),
      V(0.46, -0.1),
      V(0.472, -0.07),
      V(0.478, 0),
      V(0.472, 0.07),
      V(0.46, 0.1),
      V(0.41, 0.115),
      V(0.26, 0.11),
    ],
    48,
  )
  tireGeo.rotateX(Math.PI / 2)

  const rimGeo = new THREE.LatheGeometry(
    [
      V(0.0, 0.08),
      V(0.06, 0.08),
      V(0.1, 0.065),
      V(0.2, 0.052),
      V(0.25, 0.078),
      V(0.28, 0.11),
      V(0.28, -0.11),
      V(0.24, -0.11),
    ],
    40,
  )
  rimGeo.rotateX(Math.PI / 2)

  const tire = new THREE.Mesh(tireGeo, mat("tire", ctx))
  tire.castShadow = true
  grp.add(tire)

  const rim = new THREE.Mesh(rimGeo, mat("alu", ctx))
  grp.add(rim)

  const spokeGeo = new THREE.BoxGeometry(0.045, 0.16, 0.03)
  const spokeMat = mat("alu", ctx)
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    const spoke = new THREE.Mesh(spokeGeo, spokeMat)
    spoke.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, z > 0 ? 0.09 : -0.09)
    spoke.rotation.z = a
    grp.add(spoke)
  }

  if (z < 0) grp.rotation.y = Math.PI
}

function buildBody(parent: THREE.Group, edges: THREE.Group, ctx: MatCtx, edgeMat: THREE.LineBasicMaterial) {
  const paint = mat("paint", ctx)
  const dark = mat("paintDark", ctx)
  const plastic = mat("plastic", ctx)
  const chrome = mat("chrome", ctx)
  const glass = mat("glass", ctx)
  const lamp = mat("lamp", ctx)

  const lower = sideExtrude(
    [
      [2.42, 0.32],
      [2.38, 0.38],
      [2.28, 0.42],
      [1.95, 0.52],
      [0.75, 0.62],
      [-0.55, 0.6],
      [-1.95, 0.58],
      [-2.35, 0.54],
      [-2.48, 0.48],
      [-2.52, 0.38],
      [-2.52, 0.32],
      [2.42, 0.32],
    ],
    1.76,
    paint,
    0.08,
  )
  parent.add(lower)

  const belt = sideExtrude(
    [
      [2.15, 0.62],
      [2.05, 0.78],
      [1.15, 0.92],
      [0.4, 1.02],
      [0.05, 1.38],
      [-0.35, 1.45],
      [-1.35, 1.47],
      [-2.05, 1.46],
      [-2.38, 1.38],
      [-2.48, 1.12],
      [-2.45, 0.68],
      [-2.38, 0.62],
      [2.15, 0.62],
    ],
    1.74,
    paint,
    0.1,
  )
  parent.add(belt)

  const roof = sideExtrude(
    [
      [0.15, 1.45],
      [-0.35, 1.49],
      [-1.65, 1.48],
      [-2.35, 1.46],
      [-2.45, 1.38],
      [-2.42, 1.28],
      [-1.7, 1.32],
      [-0.35, 1.32],
      [0.15, 1.45],
    ],
    1.68,
    paint,
    0.06,
  )
  parent.add(roof)

  const wagonGlass = sideExtrude(
    [
      [-0.25, 1.12],
      [-0.55, 1.46],
      [-2.2, 1.46],
      [-2.38, 1.05],
      [-2.15, 0.95],
      [-0.75, 1.02],
      [-0.25, 1.12],
    ],
    1.62,
    glass,
    0.03,
  )
  parent.add(wagonGlass)

  const hoodCrease = sideExtrude(
    [
      [2.35, 0.58],
      [2.05, 0.72],
      [1.55, 0.78],
      [1.55, 0.82],
      [2.05, 0.76],
      [2.35, 0.62],
    ],
    1.7,
    paint,
    0.02,
  )
  parent.add(hoodCrease)

  const windshield = box(1.25, 0.06, 1.62, 0.52, 1.24, 0, glass, false)
  windshield.rotation.z = -0.38
  parent.add(windshield)

  const tailgate = box(0.06, 1.05, 1.56, -2.38, 1.08, 0, glass, false)
  parent.add(tailgate)

  ;[1, -1].forEach((side) => {
    const doorGlass = new THREE.Mesh(
      new THREE.ShapeGeometry(
        shape([
          [0.05, 1.02],
          [1.05, 1.02],
          [0.55, 1.38],
          [-0.35, 1.42],
          [-1.35, 1.44],
          [-1.55, 1.15],
          [-1.45, 1.02],
          [-0.45, 1.02],
        ]),
      ),
      glass,
    )
    doorGlass.position.set(0.28, 0, side * 0.862)
    if (side < 0) doorGlass.scale.z = -1
    parent.add(doorGlass)

    parent.add(box(0.14, 0.04, 0.18, 0.55, 0.78, side * 0.885, chrome, false))
    parent.add(box(0.12, 0.03, 0.05, 0.35, 0.55, side * 0.892, chrome, false))

    const mirror = box(0.18, 0.11, 0.14, 0.72, 1.02, side * 0.92, paint)
    mirror.rotation.y = side * 0.15
    parent.add(mirror)
    parent.add(box(0.14, 0.08, 0.02, 0.72, 1.02, side * 0.98, chrome, false))
  })

  const bumperF = box(1.82, 0.22, 0.42, 2.38, 0.36, 0, plastic)
  parent.add(bumperF)
  const bumperR = box(1.82, 0.2, 0.38, -2.48, 0.34, 0, plastic)
  parent.add(bumperR)
  parent.add(box(1.72, 0.04, 0.05, -0.65, 1.52, 0.9, chrome, false))
  parent.add(box(1.72, 0.04, 0.05, -0.65, 1.52, -0.9, chrome, false))
  parent.add(box(2.2, 0.035, 0.04, -1.35, 1.52, 0, chrome, false))

  for (let i = 0; i < 5; i++) {
    parent.add(box(1.12, 0.025, 0.04, 2.22, 0.52 + i * 0.07, 0, chrome, false))
  }

  parent.add(
    box(0.5, 0.16, 0.14, 2.15, 0.58, 0.58, lamp, false),
    box(0.5, 0.16, 0.14, 2.15, 0.58, -0.58, lamp, false),
  )

  const grille = box(1.05, 0.38, 0.06, 2.24, 0.52, 0, dark, false)
  parent.add(grille)

  parent.add(
    box(0.42, 0.14, 0.05, -2.45, 0.72, 0.55, new THREE.MeshStandardMaterial({
      color: 0x660f0f,
      emissive: 0x990000,
      emissiveIntensity: 1.1,
      metalness: 0.1,
      roughness: 0.4,
    })),
    box(0.42, 0.14, 0.05, -2.45, 0.72, -0.55, new THREE.MeshStandardMaterial({
      color: 0x660f0f,
      emissive: 0x990000,
      emissiveIntensity: 1.1,
      metalness: 0.1,
      roughness: 0.4,
    })),
  )

  parent.add(box(0.08, 0.05, 0.2, -2.42, 1.02, 0, paint))
  parent.add(box(0.35, 0.14, 0.12, -2.42, 0.46, 0.52, chrome, false))
  parent.add(box(0.35, 0.14, 0.12, -2.42, 0.46, -0.52, chrome, false))

  parent.add(
    box(0.18, 0.05, 0.05, 1.1, 0.48, 0.78, plastic),
    box(0.18, 0.05, 0.05, 1.1, 0.48, -0.78, plastic),
    box(0.18, 0.05, 0.05, -1.05, 0.46, 0.78, plastic),
    box(0.18, 0.05, 0.05, -1.05, 0.46, -0.78, plastic),
  )

  parent.add(cylAccent(2.18, 0.32, 0.22, 0.04, plastic))
  parent.add(cylAccent(-2.48, 0.3, 0.2, 0.04, plastic))

  ;[1.28, -1.28].forEach((wx) => {
    ;[0.88, -0.88].forEach((wz) => {
      const arch = box(0.48, 0.24, 0.05, wx, 0.5, wz, dark)
      parent.add(arch)
    })
  })

  addEdges(lower, edges, edgeMat, 32)
  addEdges(belt, edges, edgeMat, 32)
  addEdges(roof, edges, edgeMat, 40)
}

function cylAccent(x: number, y: number, len: number, r: number, material: THREE.Material) {
  const g = new THREE.CylinderGeometry(r, r, len, 16)
  g.rotateZ(Math.PI / 2)
  const m = new THREE.Mesh(g, material)
  m.position.set(x, y, 0)
  return m
}

export function buildMazda6Model(palette: CarViewerPalette, bodyPaintHex: string): CarModelHandle {
  const bodyMats: THREE.Material[] = []
  const paintMats: THREE.MeshPhysicalMaterial[] = []
  const ctx: MatCtx = { palette, bodyMats, paintMats }
  const paintOverride = parseCarBodyPaintHex(bodyPaintHex)
  if (paintOverride != null) {
    ctx.palette = { ...palette, bodyPaint: paintOverride }
  }

  const root = new THREE.Group()
  const body = new THREE.Group()
  const edges = new THREE.Group()
  root.add(body, edges)

  const edgeMat = new THREE.LineBasicMaterial({
    color: palette.edge,
    transparent: true,
    opacity: 0.35,
  })

  buildBody(body, edges, ctx, edgeMat)

  const wheelGroups: THREE.Group[] = []
  const wheelPositions: [number, number][] = [
    [1.36, 0.77],
    [1.36, -0.77],
    [-1.22, 0.77],
    [-1.22, -0.77],
  ]
  wheelPositions.forEach(([x, z]) => addWheel(x, z, root, ctx, wheelGroups))

  root.position.y = 0.02

  const disposables = new Set<THREE.Material | THREE.BufferGeometry>()
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      disposables.add(obj.geometry)
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      mats.forEach((m) => disposables.add(m))
    }
  })
  disposables.add(edgeMat)

  return {
    root,
    wheelGroups,
    setBodyColor(hex: string) {
      const c = parseCarBodyPaintHex(hex)
      if (c == null) return
      paintMats.forEach((m) => m.color.setHex(c))
    },
    dispose() {
      for (const item of disposables) {
        if (item instanceof THREE.BufferGeometry) item.dispose()
        else item.dispose()
      }
    },
  }
}