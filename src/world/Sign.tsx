import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { signs, type SignData } from './layout'
import { getGlowTexture, makeSignTexture } from './textures'
import { ensureFonts, FONTS } from './fonts'
import { loadBrandLogo } from './brandAssets'
import { targetFor, useStore } from '../store'

/* ------------ shared runtime registries (read by lights, picker and UI) ------------ */
export const progress: Record<string, { v: number }> = Object.fromEntries(signs.map((s) => [s.id, { v: 0 }]))
export const signMeshes = new Map<string, THREE.Mesh>()
export interface Runtime {
  center: THREE.Vector3
  color: THREE.Color
  power: number // 0..1 normalised panel emissive output (shown in UI)
  lightPower: number // 0..1 light actually cast on the street (neon keeps a soft glow)
  swing: number // 0..1 wall-mount progress
  hex: string
}
export const runtime = new Map<string, Runtime>(
  signs.map((s) => [s.id, { center: new THREE.Vector3(), color: new THREE.Color(), power: 1, lightPower: 1, swing: 0, hex: s.panel0 }]),
)
export const E_MAX = 3.0

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const smooth = (x: number) => {
  x = clamp01(x)
  return x * x * (3 - 2 * x)
}

const mint = new THREE.Color('#ADFFB6')
const tmpA = new THREE.Color()
const tmpB = new THREE.Color()
const tmpC = new THREE.Color()
// spill on walls/pavement/lights: one shared pale mint-white so the street doesn't turn green
const neonTone = new THREE.Color('#FFF8EC') // soft white (slightly warm) spill

/** Thin neon-tube frame (single merged mesh) inset from the panel rim. */
function makeFrameGeo(s: SignData) {
  const inset = 0 // tube sits on the rim: half over the white block, half against the dark wall
  const t = 0.04
  if (s.shape === 'disc') return new THREE.TorusGeometry(s.w / 2 - inset, t / 2, 8, 72)
  const hw = s.w / 2 - inset
  const hh = s.h / 2 - inset
  const bar = (w: number, h: number, x: number, y: number) => {
    const g = new THREE.BoxGeometry(w, h, t)
    g.translate(x, y, 0)
    return g
  }
  return mergeGeometries([
    bar(hw * 2 + t, t, 0, hh),
    bar(hw * 2 + t, t, 0, -hh),
    bar(t, hh * 2 + t, -hw, 0),
    bar(t, hh * 2 + t, hw, 0),
  ])!
}

const METALS = ['#1c1c1e', '#3b3d42', '#9aa0a8', '#6b5036', '#b9a98a'] // black, graphite, aluminium, bronze, champagne

/** Metal frame hugging the sign body (unit depth, scaled in Z each frame to the live body thickness). */
function makeMetalGeo(s: SignData) {
  const tt = 0.055
  if (s.shape === 'disc') return new THREE.TorusGeometry(s.w / 2 + tt * 0.35, tt * 0.55, 8, 56)
  const bar = (w: number, h: number, x: number, y: number) => {
    const g = new THREE.BoxGeometry(w, h, 1)
    g.translate(x, y, 0)
    return g
  }
  return mergeGeometries([
    bar(s.w + tt * 2, tt, 0, s.h / 2 + tt / 2),
    bar(s.w + tt * 2, tt, 0, -s.h / 2 - tt / 2),
    bar(tt, s.h, -s.w / 2 - tt / 2, 0),
    bar(tt, s.h, s.w / 2 + tt / 2, 0),
  ])!
}

/** Four fixing bolts at the corners of a wall-mounted face. */
function makeBoltGeo(s: SignData) {
  const ix = Math.max(0.1, s.w / 2 - 0.1)
  const iy = Math.max(0.1, s.h / 2 - 0.1)
  const pts: [number, number][] = s.shape === 'disc' ? [[0, iy * 0.82], [0, -iy * 0.82], [ix * 0.82, 0], [-ix * 0.82, 0]] : [[-ix, iy], [ix, iy], [-ix, -iy], [ix, -iy]]
  return mergeGeometries(
    pts.map(([x, y]) => {
      const g = new THREE.CylinderGeometry(0.022, 0.022, 0.05, 8)
      g.rotateX(Math.PI / 2)
      g.translate(x, y, 0)
      return g
    }),
  )!
}

function SignView({ s }: { s: SignData }) {
  const prog = progress[s.id]
  const rt = runtime.get(s.id)!
  const group = useRef<THREE.Group>(null!)
  const panel = useRef<THREE.Mesh>(null!)
  const shell = useRef<THREE.Mesh>(null!)
  const front = useRef<THREE.Mesh>(null!)
  const back = useRef<THREE.Mesh>(null!)
  const arm = useRef<THREE.Mesh>(null!)
  const wallGlow = useRef<THREE.Mesh>(null!)
  const groundGlow = useRef<THREE.Mesh>(null!)

  const texs = useMemo(() => makeSignTexture(s), [s])
  const tex = texs.text
  const glowTex = useMemo(() => getGlowTexture(), [])
  const frameGeo = useMemo(() => makeFrameGeo(s), [s])
  const haloF = useRef<THREE.Mesh>(null!)
  const haloB = useRef<THREE.Mesh>(null!)
  const shadowF = useRef<THREE.Mesh>(null!)
  const frameF = useRef<THREE.Mesh>(null!)
  const frameB = useRef<THREE.Mesh>(null!)
  const metalF = useRef<THREE.Mesh>(null!)
  const bolts = useRef<THREE.Mesh>(null!)
  const arm2 = useRef<THREE.Mesh>(null!)
  const plate = useRef<THREE.Mesh>(null!)
  const lift = useRef<THREE.Mesh>(null!)
  const wallShadow = useRef<THREE.Mesh>(null!)
  const metalGeo = useMemo(() => makeMetalGeo(s), [s])
  const boltGeo = useMemo(() => makeBoltGeo(s), [s])
  const mats = useMemo(
    () => ({
      // light-diffusing acrylic face: glossy clear-coat reflects the street while the body glows from within
      panel: new THREE.MeshPhysicalMaterial({ color: s.panel0, emissive: s.panel0, emissiveIntensity: s.e0, roughness: 0.5, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.22 }),
      // metal frame / brackets / bolts: finish and roughness differ per sign
      metal: new THREE.MeshStandardMaterial({ color: METALS[s.metal % METALS.length], metalness: 0.85, roughness: 0.28 + (s.metal % 3) * 0.1 }),
      // soft contact shadow the sign casts on the wall behind it
      wallShadow: new THREE.MeshBasicMaterial({ map: glowTex, color: '#000', transparent: true, depthWrite: false, opacity: 0.3, toneMapped: false }),
      text: new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }),
      // mint neon glow behind the lettering (additive) – only exists once improved
      halo: new THREE.MeshBasicMaterial({ map: texs.halo, transparent: true, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 }),
      // soft relief shadow so the lettering stands off the panel instead of reading as a flat print
      shadow: new THREE.MeshBasicMaterial({ map: texs.halo, color: '#000', transparent: true, toneMapped: false, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -1 }),
      frame: new THREE.MeshBasicMaterial({ color: mint, toneMapped: false }),
      shell: new THREE.MeshBasicMaterial({ color: mint, side: THREE.BackSide, toneMapped: false }),
      wall: new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      ground: new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    }),
    [s, tex, texs, glowTex],
  )
  // draw the artwork with the shop's own typeface once it has loaded (first paint uses system fallback)
  useEffect(() => {
    let alive = true
    Promise.all([ensureFonts(FONTS[s.fontId], s.brand, s.sub ?? ''), loadBrandLogo(s.logoUrl)]).then(([, img]) => {
      if (!alive) return
      const t = makeSignTexture(s, img)
      const old = mats.text.map
      mats.text.map = t.text
      mats.halo.map = t.halo
      mats.shadow.map = t.halo
      mats.text.needsUpdate = true
      old?.dispose()
    })
    return () => {
      alive = false
    }
  }, [s, mats])

  const c0 = useMemo(() => new THREE.Color(s.panel0), [s])
  const c1 = useMemo(() => new THREE.Color(s.panel1), [s])
  const t0 = useMemo(() => new THREE.Color(s.text0), [s])
  const t1 = useMemo(() => new THREE.Color(s.text1), [s])
  const geo = useMemo(() => {
    if (s.shape === 'disc') {
      const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 40)
      g.rotateX(Math.PI / 2)
      return g
    }
    return new THREE.BoxGeometry(1, 1, 1)
  }, [s])
  const textGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), [])

  // drive the per-sign progress toward its target; the animation is a 1–1.5 s tween on real transforms
  const target = useStore((st) => targetFor(st, s.id))
  useEffect(() => {
    const tw = gsap.to(prog, { v: target, duration: target ? 1.3 : 0.95, ease: 'power1.inOut', overwrite: true })
    return () => {
      tw.kill()
    }
  }, [target, prog])

  useEffect(() => {
    signMeshes.set(s.id, panel.current)
    panel.current.userData.signId = s.id
    return () => {
      signMeshes.delete(s.id)
    }
  }, [s.id])

  const dirYaw = s.dir * (Math.PI / 2)
  const offX = s.hinge ? (s.dir * s.w) / 2 : 0

  useFrame(() => {
    const p = prog.v
    const pc = smooth(p / 0.62) // colour + glare phase (first)
    const pm = smooth((p - 0.2) / 0.8) // geometric phase (swing / reposition)
    const sc = THREE.MathUtils.lerp(1, s.s1, pm)
    const d = THREE.MathUtils.lerp(s.d0, s.d1, pm)
    const y = THREE.MathUtils.lerp(s.y0, s.y1, pm)

    const g = group.current
    let yaw: number
    if (s.hinge) {
      yaw = dirYaw * pm
      g.position.set(
        s.wallX + s.dir * THREE.MathUtils.lerp(0.14, (s.d1 * s.s1) / 2 + 0.03, pm),
        y,
        THREE.MathUtils.lerp(s.zc, s.zc + (s.w * s.s1) / 2, pm),
      )
    } else {
      yaw = dirYaw
      g.position.set(s.wallX + s.dir * s.bandX, y, s.zc)
    }
    g.rotation.y = yaw
    g.scale.setScalar(sc)

    // panel mesh (local)
    const pz = s.hinge ? 0 : d / 2
    panel.current.position.set(offX, 0, pz)
    panel.current.scale.set(s.w, s.h, d)
    shell.current.position.copy(panel.current.position)
    shell.current.scale.set(s.w + 0.1 / sc, s.h + 0.1 / sc, d + 0.1 / sc)
    const st = useStore.getState()
    shell.current.visible = st.selectedId === s.id || st.hoverId === s.id
    ;(shell.current.material as THREE.MeshBasicMaterial).opacity = 1
    mats.shell.color.copy(mint).multiplyScalar(st.selectedId === s.id ? 1.6 : 0.8)

    // text planes sit just in front of / behind the panel faces
    front.current.position.set(offX, 0, pz + d / 2 + 0.004)
    front.current.scale.set(s.w * 0.97, s.h * 0.97, 1)
    if (s.hinge) {
      back.current.visible = true
      back.current.position.set(offX, 0, pz - d / 2 - 0.004)
      back.current.scale.set(s.w * 0.97, s.h * 0.97, 1)
    } else back.current.visible = false

    // layered lettering: shadow (relief) < halo (mint glow) < text core, plus a neon rim tube
    const fz = pz + d / 2
    shadowF.current.position.set(offX + 0.012, -0.016, fz + 0.0025)
    shadowF.current.scale.set(s.w * 0.97, s.h * 0.97, 1)
    haloF.current.position.set(offX, 0, fz + 0.0055)
    haloF.current.scale.set(s.w * 0.97, s.h * 0.97, 1)
    frameF.current.position.set(offX, 0, fz + 0.016)
    if (s.hinge) frameB.current.position.set(offX, 0, pz - d / 2 - 0.016)
    else frameB.current.visible = false

    // metal frame follows the live body thickness
    metalF.current.position.set(offX, 0, pz)
    metalF.current.scale.set(1, 1, d + 0.035)

    // raised channel-letter relief: a second copy of the lettering lifted off the face (parallax shows thickness)
    lift.current.visible = s.chan
    if (s.chan) {
      lift.current.position.set(offX, 0, fz + 0.016)
      lift.current.scale.set(s.w * 0.97, s.h * 0.97, 1)
    }
    mats.shadow.opacity = s.chan ? 0.5 : 0.3
    shadowF.current.visible = true

    // wall-mount hardware: bolts on flush faces, standoff brackets + wall plate on projecting signs
    bolts.current.visible = !s.hinge || pm > 0.85
    bolts.current.position.set(offX, 0, fz + 0.022)
    if (s.hinge) {
      const tall = s.shape === 'box' && s.h > 1.3
      arm.current.visible = true
      arm.current.position.set(offX, s.shape === 'disc' ? 0 : s.h / 2 - 0.14, 0)
      arm.current.scale.set(s.w, 0.05, 0.05)
      arm2.current.visible = tall
      arm2.current.position.set(offX, -s.h / 2 + 0.14, 0)
      arm2.current.scale.set(s.w, 0.05, 0.05)
      plate.current.visible = true
      plate.current.scale.set(0.045, s.shape === 'disc' ? 0.3 : Math.max(0.3, s.h - 0.15), 0.13)
    } else {
      arm.current.visible = false
      arm2.current.visible = false
      plate.current.visible = false
    }

    // materials: saturation + LED output fall, text stays legible
    tmpA.lerpColors(c0, c1, pc)
    mats.panel.color.copy(tmpA)
    mats.panel.emissive.copy(tmpA)
    const e = THREE.MathUtils.lerp(s.e0, s.e1, pc)
    mats.panel.emissiveIntensity = e
    tmpB.lerpColors(t0, t1, pc).multiplyScalar(THREE.MathUtils.lerp(1.5, 1.7, pc))
    mats.text.color.copy(tmpB)

    // neon layers fade in with the improvement (colour phase)
    // black lettering on a white light block needs no halo/shadow; the mint neon rim stays
    mats.frame.color.copy(mint).multiplyScalar(1.75 * (0.45 + 0.55 * pc)) // softer neon rim
    const showFrame = pc > 0.02
    frameF.current.visible = showFrame
    if (s.hinge) frameB.current.visible = showFrame
    haloF.current.visible = false
    haloB.current.visible = false

    // runtime for lights / UI
    const power = e / E_MAX
    rt.power = power
    rt.lightPower = THREE.MathUtils.lerp(power, 0.5, pc) // white light blocks still light the street
    rt.swing = pm
    rt.color.lerpColors(tmpA, neonTone, pc)
    rt.hex = '#' + tmpA.getHexString()
    // world-space panel centre (pushed slightly toward the street)
    const cx = g.position.x + Math.cos(yaw) * offX * sc
    const cz = g.position.z - Math.sin(yaw) * offX * sc
    rt.center.set(cx + s.dir * 1.9, y - 0.4, cz) // lamp stands off the wall so it lights the street, not its own panel

    // spill light on façade + pavement (follows emission)
    const spill = THREE.MathUtils.lerp(1, 0.75, pc)
    // contact shadow on the wall (below/behind the sign); shrinks to the sign's width while it is still projecting
    const ws = wallShadow.current
    const shW = (s.hinge ? THREE.MathUtils.lerp(0.55, s.w * sc, pm) : s.w * sc) + 0.5
    const shH = s.h * sc + 0.5
    ws.position.set(s.wallX + s.dir * (s.bandX + 0.014), y - 0.16 * sc, cz)
    ws.scale.set(shW, shH, 1)
    mats.wallShadow.opacity = s.hinge && pm < 0.1 ? 0.3 : 0.34
    const wg = wallGlow.current
    wg.position.set(s.wallX + s.dir * 0.3, y, cz)
    const wsize = Math.max(s.w, s.h) * sc * 1.5 + 2.2
    wg.scale.set(wsize * (s.type === 'FASCIA' ? 1.5 : 1), wsize, 1)
    // wall/pavement spill shifts from the sign's old saturated colour to one shared mint-white tone
    tmpC.lerpColors(tmpA, neonTone, pc)
    mats.wall.color.copy(tmpC).multiplyScalar(0.9)
    mats.wall.opacity = 0.5 * spill
    const gg = groundGlow.current
    gg.position.set(s.wallX + s.dir * 1.7, 0.05, cz)
    gg.scale.set(6.5, 6.5, 1)
    mats.ground.color.copy(tmpC).multiplyScalar(0.8)
    mats.ground.opacity = 0.28 * spill
  })

  return (
    <>
      <group ref={group}>
        <mesh ref={panel} geometry={geo} material={mats.panel} />
        <mesh ref={shell} geometry={geo} material={mats.shell} visible={false} raycast={() => null} />
        <mesh ref={front} geometry={textGeo} material={mats.text} raycast={() => null} />
        <mesh ref={back} geometry={textGeo} material={mats.text} rotation={[0, Math.PI, 0]} raycast={() => null} />
        <mesh ref={shadowF} geometry={textGeo} material={mats.shadow} raycast={() => null} />
        <mesh ref={haloF} geometry={textGeo} material={mats.halo} raycast={() => null} />
        <mesh ref={haloB} geometry={textGeo} material={mats.halo} rotation={[0, Math.PI, 0]} raycast={() => null} />
        <mesh ref={frameF} geometry={frameGeo} material={mats.frame} raycast={() => null} />
        <mesh ref={frameB} geometry={frameGeo} material={mats.frame} rotation={[0, Math.PI, 0]} raycast={() => null} />
        <mesh ref={lift} geometry={textGeo} material={mats.text} raycast={() => null} />
        <mesh ref={metalF} geometry={metalGeo} material={mats.metal} raycast={() => null} />
        <mesh ref={bolts} geometry={boltGeo} material={mats.metal} raycast={() => null} />
        <mesh ref={plate} material={mats.metal} raycast={() => null}>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
        <mesh ref={arm} material={mats.metal} raycast={() => null}>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
        <mesh ref={arm2} material={mats.metal} raycast={() => null}>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
      </group>
      <mesh ref={wallShadow} rotation={[0, dirYaw, 0]} material={mats.wallShadow} raycast={() => null} renderOrder={2}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh ref={wallGlow} rotation={[0, dirYaw, 0]} material={mats.wall} raycast={() => null} renderOrder={5}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh ref={groundGlow} rotation={[-Math.PI / 2, 0, 0]} material={mats.ground} raycast={() => null} renderOrder={5}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </>
  )
}

export function SignLayer() {
  return (
    <>
      {signs.map((s) => (
        <SignView key={s.id} s={s} />
      ))}
    </>
  )
}
