import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32 } from './rng'
import { blocked, player } from './player'

/**
 * Procedural, articulated pedestrians (no external model assets).
 * - Every body part is its own instanced mesh (one draw call per part type for the whole crowd).
 * - Each person has an independent build, outfit, face, hair, accessories, speed, route and behaviour state.
 * - Walk cycle is forward kinematics (hip/knee/shoulder/elbow); stride follows speed so feet do not skate.
 * - Behaviour: walk, look at shops, pause, window-shop (walk to the wall, stop, face the glass), groups of 2–3.
 * - Light crowd steering: avoid each other, lamps/stalls (shared collision data) and the player's camera.
 * - LOD: far people skip fine parts (forearms, hands, eyes, nose, hair2, scarf).
 */

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0)

type PartKey =
  | 'torso' | 'hips' | 'neck' | 'head' | 'hair' | 'hair2' | 'eyes' | 'nose' | 'scarf' | 'skirt' | 'bag'
  | 'thigh' | 'calf' | 'shoe' | 'upper' | 'fore' | 'hand'

interface PartDef {
  key: PartKey
  per: number // instances per person
  geo: THREE.BufferGeometry
  mat: 'cloth' | 'skin' | 'hair' | 'shoe' | 'eye' | 'bag'
}

type State = 'walk' | 'look' | 'toWall' | 'window' | 'idle'

interface Ped {
  male: boolean
  h: number // height (m)
  build: number
  coat: number // 0 long padded, 1 short puffer, 2 trench, 3 hoodie/knit, 4 mid coat
  coatC: THREE.Color
  pantsC: THREE.Color
  skinC: THREE.Color
  hairC: THREE.Color
  shoeC: THREE.Color
  scarfC: THREE.Color | null
  bagType: number // 0 none, 1 crossbody, 2 backpack, 3 shopping bag
  bagC: THREE.Color
  hairStyle: number // 0 short, 1 long, 2 bun, 3 beanie, 4 bob
  skirt: boolean
  // motion
  x: number
  z: number
  yaw: number
  dir: 1 | -1
  lane: number
  speed: number
  vmax: number
  phase: number
  state: State
  timer: number
  head: number // current head yaw offset
  headTarget: number
  wallSide: 1 | -1
  leader: number // index of group leader or -1
  off: [number, number]
  wasFar: boolean
}

const pick = <T,>(r: () => number, a: T[]): T => a[Math.floor(r() * a.length)]
const wrapAngle = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

// coat bottom as height above the ground, in metres at 1.72 m body height
const COAT_BOTTOM = [0.5, 0.84, 0.4, 0.86, 0.66]

const _root = new THREE.Matrix4()
const _j = new THREE.Matrix4()
const _j2 = new THREE.Matrix4()
const _j3 = new THREE.Matrix4()
const _pelvis = new THREE.Matrix4() // dedicated: never reused as a limb scratch matrix
const _spine = new THREE.Matrix4()
const _t = new THREE.Matrix4()
const _r = new THREE.Matrix4()
const _s = new THREE.Matrix4()
const _m = new THREE.Matrix4()
const _e = new THREE.Euler()

/** out = parent * T(x,y,z) * R(rx,ry,rz) */
function joint(out: THREE.Matrix4, parent: THREE.Matrix4, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
  return out.copy(parent).multiply(_t.makeTranslation(x, y, z)).multiply(_r.makeRotationFromEuler(_e.set(rx, ry, rz, 'YXZ')))
}

export const peds: Ped[] = []

export function Pedestrians({ count = 56 }: { count?: number }) {
  const meshes = useRef<Partial<Record<PartKey, THREE.InstancedMesh>>>({})

  const { parts, mats } = useMemo(() => {
    const cyl = (rt: number, rb: number, seg = 10) => new THREE.CylinderGeometry(rt, rb, 1, seg)
    const hairCap = new THREE.SphereGeometry(0.5, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6)
    hairCap.rotateX(-0.38) // rim higher at the forehead, lower at the nape
    const skirtGeo = new THREE.CylinderGeometry(0.42, 0.62, 1, 16, 1, true)
    // torso/coat: lathe profile (hem flare -> waist -> chest -> rounded shoulders -> neck) so shoulders slope into the neck
    const profile = [
      [0.56, -0.5], [0.54, -0.35], [0.47, -0.05], [0.45, 0.15], [0.47, 0.3], [0.44, 0.4], [0.33, 0.47], [0.17, 0.5], [0, 0.5],
    ].map(([r, y]) => new THREE.Vector2(r, y))
    const torsoGeo = new THREE.LatheGeometry(profile, 22)
    const defs: PartDef[] = [
      { key: 'torso', per: 1, geo: torsoGeo, mat: 'cloth' },
      { key: 'hips', per: 1, geo: new THREE.BoxGeometry(1, 1, 1), mat: 'cloth' },
      { key: 'neck', per: 1, geo: cyl(0.5, 0.5, 8), mat: 'skin' },
      { key: 'head', per: 1, geo: new THREE.SphereGeometry(0.5, 16, 12), mat: 'skin' },
      { key: 'hair', per: 1, geo: hairCap, mat: 'hair' },
      { key: 'hair2', per: 1, geo: new THREE.SphereGeometry(0.5, 10, 8), mat: 'hair' },
      { key: 'eyes', per: 2, geo: new THREE.SphereGeometry(0.5, 8, 6), mat: 'eye' },
      { key: 'nose', per: 1, geo: new THREE.SphereGeometry(0.5, 8, 6), mat: 'skin' },
      { key: 'scarf', per: 1, geo: new THREE.TorusGeometry(0.5, 0.2, 8, 16), mat: 'cloth' },
      { key: 'skirt', per: 1, geo: skirtGeo, mat: 'cloth' },
      { key: 'bag', per: 1, geo: new THREE.BoxGeometry(1, 1, 1), mat: 'bag' },
      { key: 'thigh', per: 2, geo: cyl(0.5, 0.42), mat: 'cloth' },
      { key: 'calf', per: 2, geo: cyl(0.42, 0.32), mat: 'cloth' },
      { key: 'shoe', per: 2, geo: new THREE.BoxGeometry(1, 1, 1), mat: 'shoe' },
      { key: 'upper', per: 2, geo: cyl(0.5, 0.45), mat: 'cloth' },
      { key: 'fore', per: 2, geo: cyl(0.45, 0.38), mat: 'cloth' },
      { key: 'hand', per: 2, geo: new THREE.SphereGeometry(0.5, 8, 6), mat: 'skin' },
    ]
    const mats = {
      cloth: new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, side: THREE.DoubleSide }),
      skin: new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0 }),
      hair: new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.05, side: THREE.DoubleSide }),
      shoe: new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.05 }),
      eye: new THREE.MeshBasicMaterial({ color: '#0d0d0f' }),
      bag: new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.05 }),
    }
    return { parts: defs, mats }
  }, [])

  // ---- spawn crowd (deterministic)
  useMemo(() => {
    peds.length = 0
    const r = mulberry32(777)
    const COATS = ['#1c1c20', '#2e2f36', '#3a3f4a', '#4a3f3a', '#6b5a4a', '#8a2f2f', '#d9a441', '#e8e3d8', '#5a5a5a', '#2f4a3a', '#7b3f6b', '#b8b2a6', '#20304a', '#c26a5a', '#a89f91']
    const PANTS = ['#1a1a1e', '#2b3a55', '#3b4f73', '#4a4a4a', '#6b6256', '#222222', '#8a7a62']
    const SKIN = ['#f0cdb0', '#e8bf9f', '#d9a98a', '#c89572', '#efc9a8', '#b98466']
    const HAIR = ['#111111', '#1a1410', '#2a1d15', '#3b281c', '#5a3a22', '#8a6a42', '#c9b79a']
    const SHOES = ['#f2f2f2', '#222222', '#6b4a32', '#d8d2c4', '#1f2a44']
    const BAGS = ['#222222', '#8a2f2f', '#e8e3d8', '#2f4a3a', '#d9a441', '#20304a', '#f2f2f2']
    for (let i = 0; i < count; i++) {
      const male = r() > 0.48
      const h = male ? 1.67 + r() * 0.19 : 1.53 + r() * 0.18
      const coat = Math.floor(r() * 5)
      const dir: 1 | -1 = r() > 0.5 ? 1 : -1
      const hairStyle = male ? (r() > 0.88 ? 3 : 0) : pick(r, [1, 1, 2, 4, 3])
      let x = (r() - 0.5) * 5
      const z = -52 + r() * 94
      for (let k = 0; k < 6 && blocked(x, z); k++) x = (r() - 0.5) * 4
      peds.push({
        male,
        h,
        build: (male ? 1.06 : 0.92) * (0.93 + r() * 0.16),
        coat,
        coatC: new THREE.Color(pick(r, COATS)),
        pantsC: new THREE.Color(pick(r, PANTS)),
        skinC: new THREE.Color(pick(r, SKIN)),
        hairC: new THREE.Color(pick(r, HAIR)),
        shoeC: new THREE.Color(pick(r, SHOES)),
        scarfC: r() > 0.6 ? new THREE.Color(pick(r, COATS)) : null,
        bagType: r() > 0.38 ? pick(r, [1, 1, 2, 3, 3]) : 0,
        bagC: new THREE.Color(pick(r, BAGS)),
        hairStyle,
        skirt: !male && r() > 0.65,
        x,
        z,
        yaw: dir > 0 ? 0 : Math.PI,
        dir,
        lane: x,
        speed: 0,
        vmax: 0.85 + r() * 0.75,
        phase: r() * 6.28,
        state: 'walk',
        timer: 2 + r() * 10,
        head: 0,
        headTarget: 0,
        wallSide: r() > 0.5 ? 1 : -1,
        leader: -1,
        off: [0, 0],
        wasFar: false,
      })
      if (peds[i].hairStyle === 3) peds[i].hairC = new THREE.Color(pick(r, COATS)) // beanie colour
    }
    // groups: 7 pairs + 3 triples walk together
    let g = 0
    const sizes = [2, 2, 2, 2, 2, 2, 2, 3, 3, 3]
    for (const sz of sizes) {
      const lead = g
      for (let k = 1; k < sz; k++) {
        const f = peds[g + k]
        f.leader = lead
        f.dir = peds[lead].dir
        f.yaw = peds[lead].yaw
        f.vmax = peds[lead].vmax
        f.off = sz === 2 ? [0.62, 0.22] : [k === 1 ? -0.62 : 0.62, k === 1 ? 0.22 : 0.45]
        f.x = peds[lead].x + f.off[0]
        f.z = peds[lead].z - f.dir * f.off[1]
        f.lane = f.x
      }
      g += sz
    }
    if (typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__peds = peds
  }, [count])

  // ---- static per-instance colours
  useLayoutEffect(() => {
    const M = meshes.current
    const set = (key: PartKey, idx: number, c: THREE.Color) => M[key]?.setColorAt(idx, c)
    peds.forEach((p, i) => {
      set('torso', i, p.coatC)
      set('hips', i, p.skirt ? new THREE.Color('#111') : p.pantsC)
      set('neck', i, p.skinC)
      set('head', i, p.skinC)
      set('hair', i, p.hairC)
      set('hair2', i, p.hairC)
      set('nose', i, p.skinC.clone().multiplyScalar(0.92))
      set('scarf', i, p.scarfC ?? p.coatC)
      set('skirt', i, p.coatC.clone().multiplyScalar(0.85))
      set('bag', i, p.bagC)
      for (let s = 0; s < 2; s++) {
        set('thigh', i * 2 + s, p.skirt ? new THREE.Color('#141416') : p.pantsC)
        set('calf', i * 2 + s, p.skirt ? new THREE.Color('#141416') : p.pantsC)
        set('shoe', i * 2 + s, p.shoeC)
        set('upper', i * 2 + s, p.coatC)
        set('fore', i * 2 + s, p.coatC)
        set('hand', i * 2 + s, p.skinC)
      }
    })
    Object.values(M).forEach((m) => {
      if (m?.instanceColor) m.instanceColor.needsUpdate = true
    })
    if (typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__pedMeshes = M
  }, [parts])

  // ---- simulation + pose
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const M = meshes.current
    const cam = player.pos
    const n = peds.length

    for (let i = 0; i < n; i++) {
      const p = peds[i]
      const lead = p.leader >= 0 ? peds[p.leader] : null

      /* ---------- behaviour ---------- */
      let desired = p.vmax
      let hx = 0
      let hz: number = p.dir
      let faceYaw: number | null = null

      if (!lead) {
        p.timer -= dt
        if (p.state === 'walk') {
          if (p.timer <= 0) {
            const q = Math.random()
            if (q < 0.22) {
              p.state = 'look'
              p.timer = 1.4 + Math.random() * 2
              p.headTarget = (Math.random() > 0.5 ? 1 : -1) * (0.7 + Math.random() * 0.5)
            } else if (q < 0.48) {
              const side: 1 | -1 = Math.random() > 0.5 ? 1 : -1
              if (!blocked(side * 3.05, p.z + p.dir * 2)) {
                p.wallSide = side
                p.state = 'toWall'
                p.timer = 8
              } else p.timer = 3
            } else if (q < 0.6) {
              p.state = 'idle'
              p.timer = 2 + Math.random() * 3
            } else p.timer = 5 + Math.random() * 12
          }
        } else if (p.state === 'look') {
          desired = p.vmax * 0.75
          if (p.timer <= 0) {
            p.state = 'walk'
            p.headTarget = 0
            p.timer = 5 + Math.random() * 12
          }
        } else if (p.state === 'toWall') {
          desired = p.vmax * 0.6
          hx = (p.wallSide * 3.05 - p.x) * 1.6
          if (Math.abs(p.x - p.wallSide * 3.05) < 0.14 || p.timer <= 0) {
            p.state = 'window'
            p.timer = 3 + Math.random() * 7
          }
        } else if (p.state === 'window') {
          desired = 0
          faceYaw = p.wallSide * (Math.PI / 2)
          p.headTarget = Math.sin(performance.now() / 1400 + i) * 0.5
          if (p.timer <= 0) {
            p.state = 'walk'
            p.headTarget = 0
            p.timer = 6 + Math.random() * 10
            p.lane = THREE.MathUtils.clamp(p.x - p.wallSide * 1.2, -2.7, 2.7)
          }
        } else if (p.state === 'idle') {
          desired = 0
          p.headTarget = Math.sin(performance.now() / 1100 + i * 2) * 0.8
          if (p.timer <= 0) {
            p.state = 'walk'
            p.headTarget = 0
            p.timer = 5 + Math.random() * 12
          }
        }
        if (p.state === 'walk' || p.state === 'look') hx += (p.lane - p.x) * 0.8
      } else {
        // follower: keep formation next to the group leader
        p.state = lead.state === 'window' || lead.state === 'toWall' ? lead.state : lead.state === 'idle' ? 'idle' : 'walk'
        let tx: number
        let tz: number
        if (lead.state === 'window') {
          tx = lead.x
          tz = lead.z + (p.off[0] > 0 ? 0.75 : -0.75)
          faceYaw = lead.wallSide * (Math.PI / 2)
        } else {
          tx = lead.x + p.off[0]
          tz = lead.z - lead.dir * p.off[1]
        }
        p.dir = lead.dir
        const dx = tx - p.x
        const dz = tz - p.z
        const d = Math.hypot(dx, dz)
        hx = d > 0.001 ? dx / d : 0
        hz = d > 0.001 ? dz / d : 0
        desired = d < 0.06 ? 0 : Math.min(lead.vmax * 1.35, d * 2.4 + lead.speed * 0.9)
        p.headTarget = lead.headTarget * 0.7
        if (d < 0.2 && desired < 0.1 && faceYaw === null) faceYaw = lead.yaw
      }

      /* ---------- steering: avoid people, camera ---------- */
      let ax = 0
      for (let j = 0; j < n; j++) {
        if (j === i) continue
        const q = peds[j]
        if (lead && (p.leader === j || q.leader === p.leader)) continue
        if (!lead && q.leader === i) continue
        const rx = q.x - p.x
        const rz = q.z - p.z
        const d2 = rx * rx + rz * rz
        if (d2 > 1.9) continue
        const d = Math.sqrt(d2) + 1e-4
        const ahead = (rx * hx + rz * hz) / d
        if (ahead > 0.1 || d < 0.7) {
          const cross = hx * rz - hz * rx
          ax += (cross > 0 ? -1 : 1) * ((1.38 - d) / 1.38) * 1.6
        }
        if (d < 0.55) {
          p.x -= (rx / d) * (0.55 - d) * dt * 3
          p.z -= (rz / d) * (0.55 - d) * dt * 3
        }
      }
      const cdx = p.x - cam.x
      const cdz = p.z - cam.z
      const cd = Math.hypot(cdx, cdz)
      if (cd < 1.15) {
        p.x += (cdx / (cd + 1e-4)) * (1.15 - cd) * dt * 4
        p.z += (cdz / (cd + 1e-4)) * (1.15 - cd) * dt * 4
        if (cd < 0.75) desired = Math.min(desired, 0.2)
      }
      hx += ax
      const hl = Math.hypot(hx, hz) || 1
      hx /= hl
      hz /= hl

      /* ---------- integrate ---------- */
      p.speed += (desired - p.speed) * Math.min(1, dt * 3)
      const targetYaw = faceYaw !== null && p.speed < 0.15 ? faceYaw : p.speed > 0.08 ? Math.atan2(hx, hz) : p.yaw
      p.yaw += wrapAngle(targetYaw - p.yaw) * Math.min(1, dt * (p.speed > 0.4 ? 4 : 3))
      const vx = Math.sin(p.yaw) * p.speed
      const vz = Math.cos(p.yaw) * p.speed
      const nx = p.x + vx * dt
      const nz = p.z + vz * dt
      if (!blocked(nx, p.z)) p.x = nx
      else p.lane = THREE.MathUtils.clamp(p.lane + (p.x > 0 ? -0.6 : 0.6), -2.7, 2.7)
      if (!blocked(p.x, nz)) p.z = nz
      else p.lane = THREE.MathUtils.clamp(p.lane + (p.x > 0 ? -0.9 : 0.9), -2.7, 2.7)
      if (p.dir > 0 && p.z > 54 && !lead) p.z = -54
      if (p.dir < 0 && p.z < -54 && !lead) p.z = 54
      if (lead) {
        if (p.z > 56 || p.z < -56) {
          p.z = lead.z - lead.dir * p.off[1]
          p.x = lead.x + p.off[0]
        }
      }
      p.head += (p.headTarget - p.head) * Math.min(1, dt * 4)
      // stride follows ground speed (≈ one gait cycle per 1.55 m) so feet don't skate
      p.phase += p.speed * dt * (4.05 / (p.h / 1.72))

      /* ---------- pose ---------- */
      const dx = p.x - cam.x
      const dz = p.z - cam.z
      const far = dx * dx + dz * dz > 38 * 38
      pose(p, i, M, far)
    }
    Object.values(M).forEach((m) => {
      if (m) m.instanceMatrix.needsUpdate = true
    })
  })

  return (
    <>
      {parts.map((pt) => (
        <instancedMesh
          key={pt.key}
          ref={(m) => {
            if (m) meshes.current[pt.key] = m
          }}
          args={[pt.geo, mats[pt.mat], count * pt.per]}
          frustumCulled={false}
        />
      ))}
    </>
  )
}

/** Forward-kinematics pose of one person into the instanced part meshes. */
function pose(p: Ped, i: number, M: Partial<Record<PartKey, THREE.InstancedMesh>>, far: boolean) {
  const s = p.h / 1.72
  const b = p.build
  const amp = Math.min(1.7, p.speed / 1.25)
  const moving = amp > 0.05
  const ph = p.phase
  const sw = Math.sin(ph)
  const bob = moving ? Math.abs(Math.cos(ph)) * 0.018 * amp * s : 0
  const sway = moving ? 0 : Math.sin(performance.now() / 1700 + i) * 0.012
  const twist = Math.sin(ph) * 0.1 * amp

  // root: body orientation. forward = +Z in local space, yaw rotates about Y
  _root.makeRotationY(p.yaw)
  _root.setPosition(p.x, 0, p.z)
  const root = _root // root stays untouched; _j/_j2/_j3 are scratch joints

  const set = (k: PartKey, idx: number, m: THREE.Matrix4) => M[k]?.setMatrixAt(idx, m)
  const hide = (k: PartKey, idx: number) => M[k]?.setMatrixAt(idx, ZERO)
  const place = (k: PartKey, idx: number, jm: THREE.Matrix4, ox: number, oy: number, oz: number, sx: number, sy: number, sz: number) => {
    set(k, idx, _m.copy(jm).multiply(_t.makeTranslation(ox, oy, oz)).multiply(_s.makeScale(sx, sy, sz)))
  }

  const hipY = 0.92 * s
  const topY = 1.4 * s
  const bottomY = Math.min(COAT_BOTTOM[p.coat] * s, topY - 0.2)
  const torsoH = topY - bottomY

  // pelvis + torso (slight counter-rotation for natural gait)
  const pelvis = joint(_pelvis, root, 0, hipY + bob, 0, 0, -twist * 0.6, sway)
  place('hips', i, pelvis, 0, 0.02 * s, 0, 0.3 * b * s, 0.2 * s, 0.2 * s)
  const spine = joint(_spine, root, 0, hipY + bob, 0, 0.02, twist, -sway)
  // torso is placed in spine space: its centre sits between bottomY and topY
  place('torso', i, spine, 0, (bottomY + topY) / 2 - hipY, 0, 0.4 * b * s * (p.coat === 1 ? 1.12 : 1), torsoH, 0.26 * b * s * (p.coat === 1 ? 1.2 : 1))
  if (p.skirt) place('skirt', i, pelvis, 0, -0.17 * s, 0, 0.36 * b * s, 0.36 * s, 0.34 * b * s)
  else hide('skirt', i)

  // legs
  const legSwing = 0.55 * amp
  for (let side = 0; side < 2; side++) {
    const sgn = side === 0 ? 1 : -1
    const th = -Math.sin(ph + (side ? Math.PI : 0)) * legSwing
    const kneeFlex = moving ? Math.max(0, Math.cos(ph + (side ? Math.PI : 0))) * 1.1 * amp * 0.7 + 0.04 : 0.02
    const hip = joint(_j, pelvis, sgn * 0.085 * b * s, -0.02 * s, 0, th)
    place('thigh', i * 2 + side, hip, 0, -0.23 * s, 0, 0.16 * b * s, 0.46 * s, 0.16 * b * s)
    const knee = joint(_j2, hip, 0, -0.46 * s, 0, kneeFlex)
    place('calf', i * 2 + side, knee, 0, -0.225 * s, 0, 0.13 * b * s, 0.45 * s, 0.13 * b * s)
    const ankle = joint(_j3, knee, 0, -0.45 * s, 0, (th + kneeFlex) * -0.45)
    place('shoe', i * 2 + side, ankle, 0, -0.035 * s, 0.05 * s, 0.1 * b * s, 0.075 * s, 0.27 * s)
  }

  // arms
  const armSwing = 0.5 * amp
  for (let side = 0; side < 2; side++) {
    const sgn = side === 0 ? 1 : -1
    const carrying = p.bagType === 3 && side === 0
    const a = carrying ? 0.12 + 0.05 * sw : Math.sin(ph + (side ? 0 : Math.PI)) * armSwing
    const shoulder = joint(_j, spine, sgn * 0.215 * b * s, topY - hipY - 0.03 * s, 0, a, 0, sgn * (0.06 + (p.coat === 1 ? 0.05 : 0)))
    const upperLen = 0.3 * s
    place('upper', i * 2 + side, shoulder, 0, -upperLen / 2, 0, 0.1 * b * s * (p.coat === 1 || p.coat === 0 ? 1.2 : 1), upperLen, 0.1 * b * s * (p.coat === 1 || p.coat === 0 ? 1.2 : 1))
    const elbowBend = carrying ? -0.75 : -(0.22 + 0.2 * amp * (side === 0 ? Math.max(0, Math.sin(ph + Math.PI)) : Math.max(0, sw)))
    const elbow = joint(_j2, shoulder, 0, -upperLen, 0, elbowBend)
    if (far) {
      hide('fore', i * 2 + side)
      hide('hand', i * 2 + side)
    } else {
      place('fore', i * 2 + side, elbow, 0, -0.135 * s, 0, 0.085 * b * s, 0.27 * s, 0.085 * b * s)
      place('hand', i * 2 + side, elbow, 0, -0.29 * s, 0.005 * s, 0.075 * s, 0.085 * s, 0.075 * s)
    }
    if (carrying) {
      // shopping bag hangs from the hand
      if (p.bagType === 3) {
        const hand = _j3.copy(elbow).multiply(_t.makeTranslation(0, -0.3 * s, 0.01 * s))
        place('bag', i, hand, 0, -0.17 * s, 0, 0.13 * s, 0.3 * s, 0.22 * s)
      }
    }
  }
  if (p.bagType === 1) place('bag', i, spine, 0.2 * b * s, 0.04 * s, 0.0, 0.07 * s, 0.21 * s, 0.27 * s)
  else if (p.bagType === 2) place('bag', i, spine, 0, topY - hipY - 0.2 * s, -0.17 * s, 0.3 * b * s, 0.4 * s, 0.14 * s)
  else if (p.bagType === 0) hide('bag', i)

  // neck + head (with look-around yaw)
  const neck = joint(_j, spine, 0, topY - hipY, 0, 0, p.head * 0.3)
  place('neck', i, neck, 0, 0.035 * s, 0, 0.09 * s, 0.1 * s, 0.09 * s)
  const head = joint(_j2, spine, 0, topY - hipY + 0.14 * s, 0, 0.02 + (p.state === 'window' ? 0.04 : 0), p.head)
  place('head', i, head, 0, 0, 0, 0.155 * s, 0.205 * s, 0.185 * s)
  const hs = p.hairStyle
  // hair cap: beanie sits lower and bigger
  const capScale = hs === 3 ? 1.12 : 1.04
  place('hair', i, head, 0, (hs === 3 ? 0.012 : 0.02) * s, -0.006 * s, 0.17 * capScale * s, 0.21 * capScale * s, 0.2 * capScale * s)
  if (hs === 1) place('hair2', i, head, 0, -0.1 * s, -0.075 * s, 0.17 * s, 0.3 * s, 0.075 * s)
  else if (hs === 2) place('hair2', i, head, 0, 0.1 * s, -0.085 * s, 0.085 * s, 0.085 * s, 0.085 * s)
  else if (hs === 3) place('hair2', i, head, 0, 0.115 * s, 0, 0.06 * s, 0.06 * s, 0.06 * s)
  else if (hs === 4) place('hair2', i, head, 0, -0.045 * s, -0.07 * s, 0.185 * s, 0.14 * s, 0.085 * s)
  else hide('hair2', i)
  if (far) {
    hide('eyes', i * 2)
    hide('eyes', i * 2 + 1)
    hide('nose', i)
    hide('scarf', i)
  } else {
    place('eyes', i * 2, head, 0.036 * s, 0.014 * s, 0.083 * s, 0.026 * s, 0.026 * s, 0.02 * s)
    place('eyes', i * 2 + 1, head, -0.036 * s, 0.014 * s, 0.083 * s, 0.026 * s, 0.026 * s, 0.02 * s)
    place('nose', i, head, 0, -0.02 * s, 0.092 * s, 0.026 * s, 0.034 * s, 0.034 * s)
    if (p.scarfC) {
      const sc = joint(_j, spine, 0, topY - hipY + 0.005 * s, 0, Math.PI / 2)
      place('scarf', i, sc, 0, -0.01 * s, 0, 0.125 * s, 0.125 * s, 0.1 * s)
    } else hide('scarf', i)
  }
}
