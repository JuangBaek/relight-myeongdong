import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Batch } from './Batch'
import { HALF_LEN, lamps, stalls, type Inst } from './layout'
import { makeGroundTexture } from './textures'
import { mulberry32 } from './rng'
import { lampGlowMat } from './Lights'

export function Ground() {
  const tex = useMemo(() => {
    const t = makeGroundTexture()
    t.repeat.set(16, 66)
    return t
  }, [])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[32, HALF_LEN * 2 + 20]} />
      <meshStandardMaterial map={tex} roughness={0.42} metalness={0.15} />
    </mesh>
  )
}

/** Cross-street end walls so the street reads as enclosed at both ends. */
export function EndCaps() {
  const items: Inst[] = [
    { p: [0, 12, -HALF_LEN - 4], s: [40, 24, 8], c: '#4b4e55' },
    { p: [0, 12, HALF_LEN + 4], s: [40, 24, 8], c: '#4b4e55' },
  ]
  return (
    <Batch items={items}>
      <meshStandardMaterial roughness={0.9} />
    </Batch>
  )
}

export function Lamps() {
  const poles: Inst[] = []
  const heads: Inst[] = []
  const decals: Inst[] = []
  lamps.forEach((l) => {
    poles.push({ p: [l.x, 2.3, l.z], s: [0.1, 4.6, 0.1], c: '#222' })
    heads.push({ p: [l.x - l.side * 0.28, 4.62, l.z], s: [0.55, 0.12, 0.22], c: [3.2, 2.5, 1.5] })
    decals.push({ p: [l.x - l.side * 0.6, 0.06, l.z], s: [9, 9, 1], rx: -Math.PI / 2 })
  })
  return (
    <>
      <Batch items={poles}>
        <meshStandardMaterial roughness={0.5} metalness={0.7} />
      </Batch>
      <Batch items={heads}>
        <meshBasicMaterial toneMapped={false} />
      </Batch>
      {/* warm pavement pools from the lamps — brighten as the street is improved (see Lights) */}
      <Batch items={decals} geo="plane">
        <primitive object={lampGlowMat} attach="material" />
      </Batch>
    </>
  )
}

export function Stalls() {
  const counters: Inst[] = []
  const canopies: Inst[] = []
  const legs: Inst[] = []
  const bulbs: Inst[] = []
  const goods: Inst[] = []
  stalls.forEach((s, i) => {
    const { x, z, side } = s
    counters.push({ p: [x, 0.5, z], s: [1.1, 1.0, 1.9], c: s.color })
    goods.push({ p: [x, 1.08, z], s: [0.8, 0.16, 1.5], c: [1.6, 1.0, 0.45] })
    const cc = ['#c4413a', '#2f5d8a', '#e8e3d8', '#3f7d58'][i % 4]
    canopies.push({ p: [x, 2.3, z], s: [1.5, 0.07, 2.3], rz: side * 0.12, c: cc })
    ;[-1, 1].forEach((a) => {
      ;[-1, 1].forEach((b) => legs.push({ p: [x + a * 0.65, 1.15, z + b * 1.05], s: [0.05, 2.3, 0.05], c: '#555' }))
    })
    for (let k = 0; k < 5; k++) bulbs.push({ p: [x - side * 0.62, 2.18, z - 0.9 + k * 0.45], s: [0.12, 0.12, 0.12], c: [3, 2.2, 1.2] })
  })
  return (
    <>
      <Batch items={counters}>
        <meshStandardMaterial roughness={0.7} />
      </Batch>
      <Batch items={goods}>
        <meshBasicMaterial toneMapped={false} />
      </Batch>
      <Batch items={canopies}>
        <meshStandardMaterial roughness={0.9} side={2} />
      </Batch>
      <Batch items={legs}>
        <meshStandardMaterial roughness={0.5} metalness={0.7} />
      </Batch>
      <Batch items={bulbs} geo="sphere">
        <meshBasicMaterial toneMapped={false} />
      </Batch>
    </>
  )
}

/** Instanced pedestrians strolling along the street (purely visual). */
export function Pedestrians({ count = 46 }: { count?: number }) {
  const body = useRef<THREE.InstancedMesh>(null!)
  const head = useRef<THREE.InstancedMesh>(null!)
  const data = useMemo(() => {
    const r = mulberry32(2024)
    const coats = ['#1c1c20', '#2e2f36', '#4a3f3a', '#8a2f2f', '#d9a441', '#3a4a5f', '#e8e3d8', '#5a5a5a', '#7b3f6b']
    return Array.from({ length: count }, (_, i) => ({
      x: (r() - 0.5) * 5,
      z: -54 + r() * 96, // keep the entrance (z≈50) clear at start
      speed: (r() > 0.5 ? 1 : -1) * (0.7 + r() * 0.8),
      phase: r() * 10,
      h: 1.55 + r() * 0.3,
      color: new THREE.Color(coats[i % coats.length]),
    }))
  }, [count])
  const o = useMemo(() => new THREE.Object3D(), [])
  useEffect(() => {
    data.forEach((d, i) => body.current.setColorAt(i, d.color))
    body.current.instanceColor!.needsUpdate = true
  }, [data])
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    data.forEach((d, i) => {
      d.z += d.speed * Math.min(dt, 0.05)
      if (d.z > 42) d.z = -56
      if (d.z < -56) d.z = 42
      const bob = Math.abs(Math.sin(t * 4 + d.phase)) * 0.04
      o.position.set(d.x + Math.sin(t * 0.5 + d.phase) * 0.15, d.h * 0.36 + bob, d.z)
      o.rotation.set(0, d.speed > 0 ? Math.PI : 0, 0)
      o.scale.set(0.5, d.h * 0.72, 0.3)
      o.updateMatrix()
      body.current.setMatrixAt(i, o.matrix)
      o.position.y = d.h * 0.86 + bob
      o.scale.setScalar(0.24)
      o.updateMatrix()
      head.current.setMatrixAt(i, o.matrix)
    })
    body.current.instanceMatrix.needsUpdate = true
    head.current.instanceMatrix.needsUpdate = true
  })
  return (
    <>
      <instancedMesh ref={body} args={[undefined, undefined, count]} frustumCulled={false}>
        <capsuleGeometry args={[0.5, 0.6, 4, 8]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={head} args={[undefined, undefined, count]} frustumCulled={false}>
        <sphereGeometry args={[0.5, 10, 8]} />
        <meshStandardMaterial color="#d9b8a0" roughness={0.8} />
      </instancedMesh>
    </>
  )
}
