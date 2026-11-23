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
