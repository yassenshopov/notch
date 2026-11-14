/**
 * Raspberry Pi 4 Model B — mm layout from the mechanical drawing
 * (process1183/openscad-library, GPL-3.0). PBR maps are procedural.
 */
import * as THREE from "three"
import {
  createBgaMap,
  createBrushedMetalMap,
  createPi4PcbMaps,
  createShieldVentMap,
} from "./pi-hardware-pcb-maps"

const PCB_L = 85
const PCB_W = 56
const PCB_T = 1.5
const CORNER_R = 3
const HOLE_D = 2.75
const HOLE_EDGE = 3.5
const HOLE_SPACING = { x: 58, y: 49 }

const GPIO_DIM = { x: 51, y: 5.1, z: 8.5 }
const GPIO_POS = {
  x: HOLE_EDGE + 29 - GPIO_DIM.x / 2,
  y: PCB_W - HOLE_EDGE - GPIO_DIM.y / 2,
  z: PCB_T,
}

const USD_DIM = { x: 11.5, y: 12, z: 1.5 }
const USD_POS = { x: 1.6, y: 22.15, z: -USD_DIM.z }

const DISPLAY_DIM = { x: 2.5, y: 22, z: 5.5 }
const DISPLAY_POS = {
  x: 4 - DISPLAY_DIM.x / 2,
  y: HOLE_EDGE + 24.5 - DISPLAY_DIM.y / 2,
  z: PCB_T,
}

const PWR_DIM = { x: 9, y: 7.4, z: 3.2 }
const PWR_POS = {
  x: HOLE_EDGE + 7.7 - PWR_DIM.x / 2,
  y: -1.25,
  z: PCB_T,
}

const UHDMI_DIM = { x: 7.1, y: 8.1, z: 3.5 }
const UHDMI_X1 = PWR_POS.x + PWR_DIM.x / 2 + 14.8
const UHDMI_X2 = UHDMI_X1 + 13.5

const CAMERA_DIM = { x: 2.5, y: 22, z: 5.5 }
const CAMERA_POS = {
  x: UHDMI_X2 + UHDMI_DIM.x / 2 + 7 - CAMERA_DIM.x / 2,
  y: 11.5 - CAMERA_DIM.y / 2,
  z: PCB_T,
}

const AUDIO_DIM = { x: 7, y: 14.9, z: 6 }
const AUDIO_POS = {
  x: CAMERA_POS.x + CAMERA_DIM.x / 2 + 7.5 - AUDIO_DIM.x / 2,
  y: -2.5,
  z: PCB_T,
}

const SOC_DIM = { x: 15, y: 15, z: 2.4 }
const SOC_POS = {
  x: HOLE_EDGE + 25.75 - SOC_DIM.x / 2,
  y: 32.5 - SOC_DIM.y / 2,
  z: PCB_T,
}

const POE_DIM = { x: 5, y: 4.8, z: 8.5 }
const POE_POS = {
  x: HOLE_EDGE + HOLE_SPACING.x - POE_DIM.x / 2,
  y: PCB_W - HOLE_EDGE - 6.14 - POE_DIM.y / 2,
  z: PCB_T,
}

const USB_OVERHANG = 3
const USB_DIM = { x: 17.5, y: 14.5, z: 16 }
const ETH_DIM = { x: 21.2, y: 16, z: 13.5 }

const WLAN_DIM = { x: 12, y: 12, z: 1.1 }
const WLAN_POS = {
  x: SOC_POS.x + SOC_DIM.x + 3,
  y: SOC_POS.y + 1,
  z: PCB_T,
}

const PMIC_POS = { x: 16, y: 12, z: PCB_T }
const PMIC_DIM = { x: 4.5, y: 4.5, z: 1.1 }

export type Pi4InteractiveParts = {
  socMat: THREE.MeshStandardMaterial
  ramMat: THREE.MeshStandardMaterial
  sdMat: THREE.MeshStandardMaterial
  activityLedMat: THREE.MeshStandardMaterial
  powerLedMat: THREE.MeshStandardMaterial
  gpioPinMats: THREE.MeshStandardMaterial[]
  socMesh: THREE.Mesh
}

export type Pi4Model = {
  root: THREE.Group
  interactive: Pi4InteractiveParts
  dispose: () => void
}

function osToThree(x: number, y: number, z: number, w: number, h: number, d: number) {
  const cx = x + w / 2 - PCB_L / 2
  const cy = z + d / 2
  const cz = -(y + h / 2 - PCB_W / 2)
  return new THREE.Vector3(cx, cy, cz)
}

function roundedPcbShape() {
  const w = PCB_L
  const h = PCB_W
  const r = CORNER_R
  const shape = new THREE.Shape()
  shape.moveTo(r, 0)
  shape.lineTo(w - r, 0)
  shape.quadraticCurveTo(w, 0, w, r)
  shape.lineTo(w, h - r)
  shape.quadraticCurveTo(w, h, w - r, h)
  shape.lineTo(r, h)
  shape.quadraticCurveTo(0, h, 0, h - r)
  shape.lineTo(0, r)
  shape.quadraticCurveTo(0, 0, r, 0)
  return shape
}

function addBox(
  parent: THREE.Group,
  pos: { x: number; y: number; z: number },
  dim: { x: number; y: number; z: number },
  mat: THREE.Material,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(dim.x, dim.z, dim.y), mat)
  mesh.position.copy(osToThree(pos.x, pos.y, pos.z, dim.x, dim.y, dim.z))
  parent.add(mesh)
  return mesh
}

function addRaisedCopper(
  parent: THREE.Group,
  pts: [number, number][],
  widthMm: number,
  copperMat: THREE.Material,
) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[i + 1]
    const dx = x1 - x0
    const dy = y1 - y0
    const len = Math.hypot(dx, dy)
    if (len < 0.05) continue
    const seg = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, widthMm), copperMat)
    const mx = (x0 + x1) / 2
    const my = (y0 + y1) / 2
    seg.position.set(mx - PCB_L / 2, PCB_T + 0.025, -(my - PCB_W / 2))
    seg.rotation.y = Math.atan2(-dy, dx)
    parent.add(seg)
  }
}

const SMD_LOCS: { x: number; y: number; w: number; h: number; d: number }[] = []
function seedSmdField() {
  const avoid = (x: number, y: number) => {
    const inSoc = x > SOC_POS.x - 2 && x < SOC_POS.x + SOC_DIM.x + 2 && y > SOC_POS.y - 2 && y < SOC_POS.y + SOC_DIM.y + 4
    const inGpio = y > 46 && x < 60
  return inSoc || inGpio
  }
  let n = 0
  for (let y = 8; y < PCB_W - 6; y += 2.2) {
    for (let x = 8; x < PCB_L - 10; x += 2.4) {
      const t = Math.abs(Math.sin(x * 12.7 + y * 9.13 + n))
      if (t < 0.55 || avoid(x, y)) continue
      const tall = t > 0.92
      SMD_LOCS.push({
        x,
        y,
        w: tall ? 2.4 : 1.2 + t * 1.4,
        h: tall ? 2 : 0.9 + t * 0.5,
        d: tall ? 1.1 : 0.45 + t * 0.35,
      })
      n++
      if (SMD_LOCS.length > 110) return
    }
  }
}
seedSmdField()

export function buildRaspberryPi4Model(): Pi4Model {
  const root = new THREE.Group()
  const maps = createPi4PcbMaps()
  const metalMap = createBrushedMetalMap(2)
  const bgaMap = createBgaMap()
  const ventMap = createShieldVentMap()

  const disposeTextures = () => {
    maps.dispose()
    metalMap.dispose()
    bgaMap.dispose()
    ventMap.dispose()
  }

  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0x0f4d2c,
    metalness: 0.05,
    roughness: 0.9,
  })

  const pcbBody = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedPcbShape(), { depth: PCB_T, bevelEnabled: false }),
    edgeMat,
  )
  pcbBody.rotation.x = -Math.PI / 2
  pcbBody.position.set(-PCB_L / 2, 0, PCB_W / 2)
  root.add(pcbBody)

  const pcbTopMat = new THREE.MeshStandardMaterial({
    map: maps.color,
    bumpMap: maps.height,
    bumpScale: 0.28,
    roughnessMap: maps.roughness,
    metalnessMap: maps.metalness,
    aoMap: maps.ao,
    aoMapIntensity: 0.85,
    metalness: 1,
    roughness: 1,
    envMapIntensity: 0.6,
  })
  const pcbGeo = new THREE.PlaneGeometry(PCB_L, PCB_W)
  pcbGeo.setAttribute("uv2", pcbGeo.attributes.uv)
  const pcbTop = new THREE.Mesh(pcbGeo, pcbTopMat)
  pcbTop.rotation.x = -Math.PI / 2
  pcbTop.position.y = PCB_T + 0.012
  root.add(pcbTop)

  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xc47a2c,
    metalness: 0.92,
    roughness: 0.28,
    envMapIntensity: 1.1,
  })
  const copperRoutes: [number, number][][] = [
    [
      [8, 22],
      [14, 22],
      [22, 28],
      [30, 32],
    ],
    [
      [11, 4],
      [16, 8],
      [22, 14],
      [28, 22],
    ],
    [
      [62, 46],
      [52, 45],
      [42, 42],
      [34, 38],
    ],
    [
      [62, 27],
      [54, 27],
      [46, 30],
    ],
    [
      [62, 9],
      [54, 9],
      [44, 12],
    ],
    [
      [24, 3],
      [28, 10],
      [32, 18],
    ],
    [
      [38, 3],
      [36, 11],
      [34, 19],
    ],
  ]
  for (const route of copperRoutes) addRaisedCopper(root, route, 0.3, copperMat)

  const holeMat = new THREE.MeshStandardMaterial({ color: 0x0b1f14, metalness: 0.15, roughness: 0.95 })
  const holes = [
    [HOLE_EDGE, HOLE_EDGE],
    [HOLE_EDGE, HOLE_EDGE + HOLE_SPACING.y],
    [HOLE_EDGE + HOLE_SPACING.x, HOLE_EDGE + HOLE_SPACING.y],
    [HOLE_EDGE + HOLE_SPACING.x, HOLE_EDGE],
  ] as const
  for (const [hx, hy] of holes) {
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(HOLE_D / 2, HOLE_D / 2, PCB_T + 0.04, 24), holeMat)
    hole.position.set(hx - PCB_L / 2, PCB_T / 2, -(hy - PCB_W / 2))
    root.add(hole)
  }

  const metal = new THREE.MeshStandardMaterial({
    color: 0xb8bcc4,
    metalness: 0.72,
    roughness: 0.32,
    map: metalMap,
  })
  const connector = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.42,
    roughness: 0.48,
  })
  const jack = new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.45, roughness: 0.5 })
  const usbPlastic = new THREE.MeshStandardMaterial({ color: 0x1e40af, metalness: 0.15, roughness: 0.55 })

  const socMat = new THREE.MeshStandardMaterial({
    map: bgaMap,
    color: 0xb8c2d0,
    metalness: 0.78,
    roughness: 0.35,
    emissive: 0x000000,
    emissiveIntensity: 1.1,
  })
  const socMesh = addBox(root, SOC_POS, SOC_DIM, socMat)

  const ramMat = new THREE.MeshStandardMaterial({
    map: bgaMap,
    color: 0x94a3b8,
    metalness: 0.72,
    roughness: 0.38,
    emissive: 0x000000,
    emissiveIntensity: 1,
  })
  addBox(
    root,
    { x: SOC_POS.x, y: SOC_POS.y, z: SOC_POS.z + SOC_DIM.z },
    { x: SOC_DIM.x, y: SOC_DIM.y, z: 0.35 },
    ramMat,
  )

  const sdMat = new THREE.MeshStandardMaterial({
    color: 0x9ca3af,
    metalness: 0.55,
    roughness: 0.42,
    emissive: 0x000000,
    emissiveIntensity: 1,
  })
  addBox(root, USD_POS, USD_DIM, sdMat)

  const pmicMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.55, roughness: 0.42 })
  addBox(root, PMIC_POS, PMIC_DIM, pmicMat)

  const wlanMat = new THREE.MeshStandardMaterial({
    map: ventMap,
    color: 0xcbd5e1,
    metalness: 0.88,
    roughness: 0.34,
  })
  addBox(root, WLAN_POS, WLAN_DIM, wlanMat)

  addBox(root, DISPLAY_POS, DISPLAY_DIM, connector)
  addBox(root, PWR_POS, PWR_DIM, metal)
  addBox(root, CAMERA_POS, CAMERA_DIM, connector)
  addBox(root, AUDIO_POS, AUDIO_DIM, jack)
  addBox(root, POE_POS, POE_DIM, metal)

  for (const ux of [UHDMI_X1, UHDMI_X2]) {
    addBox(root, { x: ux - UHDMI_DIM.x / 2, y: -1.7, z: PCB_T }, UHDMI_DIM, metal)
  }

  for (const uy of [9, 27]) {
    const usb = addBox(
      root,
      { x: PCB_L + USB_OVERHANG - USB_DIM.x, y: uy - USB_DIM.y / 2, z: PCB_T },
      USB_DIM,
      metal,
    )
    addBox(
      root,
      {
        x: PCB_L + USB_OVERHANG - USB_DIM.x + 3,
        y: uy - 3,
        z: PCB_T + 4,
      },
      { x: 8, y: 6, z: 8 },
      usbPlastic,
    )
    void usb
  }

  addBox(
    root,
    { x: PCB_L + USB_OVERHANG - ETH_DIM.x, y: 45.75 - ETH_DIM.y / 2, z: PCB_T },
    ETH_DIM,
    metal,
  )
  addBox(
    root,
    {
      x: PCB_L + USB_OVERHANG - ETH_DIM.x + 2,
      y: 45.75 - 4,
      z: PCB_T + 3,
    },
    { x: 12, y: 8, z: 6 },
    new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.2, roughness: 0.85 }),
  )

  addBox(root, GPIO_POS, GPIO_DIM, metal)

  const gpioPinMats: THREE.MeshStandardMaterial[] = []
  const pitch = 2.54
  const pinsX = GPIO_POS.x + 0.65
  const pinsY = GPIO_POS.y + GPIO_DIM.y / 2
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 20; col++) {
      const pinMat = new THREE.MeshStandardMaterial({
        color: 0xe5e7eb,
        metalness: 0.92,
        roughness: 0.18,
        emissive: 0x000000,
        emissiveIntensity: 0,
      })
      gpioPinMats.push(pinMat)
      const pin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7.2, 0.5), pinMat)
      const px = pinsX + col * pitch
      const py = pinsY - row * pitch
      pin.position.set(px - PCB_L / 2, PCB_T + 3.6, -(py - PCB_W / 2))
      root.add(pin)
    }
  }

  const activityLedMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x15803d,
    emissiveIntensity: 1.6,
    transparent: true,
    opacity: 0.95,
  })
  const powerLedMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0x7f1d1d,
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.95,
  })
  addBox(root, { x: 32, y: 4, z: PCB_T }, { x: 1.2, y: 1.2, z: 0.8 }, activityLedMat)
  addBox(root, { x: 35, y: 4, z: PCB_T }, { x: 1.2, y: 1.2, z: 0.8 }, powerLedMat)

  const smdCeramic = new THREE.MeshStandardMaterial({ color: 0x2d3748, metalness: 0.2, roughness: 0.72 })
  const smdTan = new THREE.MeshStandardMaterial({ color: 0x8b7355, metalness: 0.25, roughness: 0.65 })
  const smdBlack = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.35, roughness: 0.55 })
  for (let i = 0; i < SMD_LOCS.length; i++) {
    const p = SMD_LOCS[i]
    const mat = i % 3 === 0 ? smdCeramic : i % 3 === 1 ? smdTan : smdBlack
    addBox(root, { x: p.x, y: p.y, z: PCB_T }, { x: p.w, y: p.h, z: p.d }, mat)
  }

  // Decoupling cluster near PMIC
  for (const [dx, dy] of [
    [0, 0],
    [2.2, 0.5],
    [-1.8, 1.2],
    [3.5, -1],
    [1, 2.5],
    [4, 1.5],
  ]) {
    addBox(
      root,
      { x: PMIC_POS.x + dx, y: PMIC_POS.y + dy, z: PCB_T },
      { x: 1.6, y: 0.9, z: 0.55 },
      smdTan,
    )
  }

  return {
    root,
    interactive: {
      socMat,
      ramMat,
      sdMat,
      activityLedMat,
      powerLedMat,
      gpioPinMats,
      socMesh,
    },
    dispose: disposeTextures,
  }
}
