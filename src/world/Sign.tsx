import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { signs, type SignData } from './layout'
import { getGlowTexture, makeSignTexture } from './textures'
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

const metal = new THREE.MeshStandardMaterial({ color: '#1b1b1d', metalness: 0.8, roughness: 0.45 })
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
  const mats = useMemo(
    () => ({
      panel: new THREE.MeshStandardMaterial({ color: s.panel0, emissive: s.panel0, emissiveIntensity: s.e0, roughness: 0.55, metalness: 0.1 }),
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

    // bracket arm for projecting signs
    if (s.hinge) {
      arm.current.visible = true
      arm.current.position.set(offX, s.shape === 'disc' ? 0 : s.h / 2 - 0.12, 0)
      arm.current.scale.set(s.w, 0.05, 0.05)
    } else arm.current.visible = false

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
    mats.frame.color.copy(mint).multiplyScalar(2.8 * (0.45 + 0.55 * pc))
    const showFrame = pc > 0.02
    frameF.current.visible = showFrame
    if (s.hinge) frameB.current.visible = showFrame
    haloF.current.visible = false
    haloB.current.visible = false
    shadowF.current.visible = false

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
        <mesh ref={arm} material={metal} raycast={() => null}>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
      </group>
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
