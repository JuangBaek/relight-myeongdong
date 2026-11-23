import { useLayoutEffect, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import type { Inst } from './layout'

type GeoKind = 'box' | 'cyl' | 'sphere' | 'plane'

/** One draw call for many static boxes/cylinders (geometry reuse + instancing). */
export function Batch({ items, geo = 'box', children }: { items: Inst[]; geo?: GeoKind; children: ReactNode }) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new THREE.Object3D()
    const col = new THREE.Color()
    let hasColor = false
    items.forEach((it, i) => {
      o.position.set(...it.p)
      o.rotation.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0)
      o.scale.set(...it.s)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      if (it.c !== undefined) {
        hasColor = true
        if (Array.isArray(it.c)) col.setRGB(it.c[0], it.c[1], it.c[2], THREE.LinearSRGBColorSpace)
        else col.set(it.c)
        m.setColorAt(i, col)
      }
    })
    m.instanceMatrix.needsUpdate = true
    if (hasColor && m.instanceColor) m.instanceColor.needsUpdate = true
  }, [items])
  if (!items.length) return null
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} frustumCulled={false}>
      {geo === 'box' && <boxGeometry args={[1, 1, 1]} />}
      {geo === 'cyl' && <cylinderGeometry args={[0.5, 0.5, 1, 12]} />}
      {geo === 'sphere' && <sphereGeometry args={[0.5, 10, 8]} />}
      {geo === 'plane' && <planeGeometry args={[1, 1]} />}
      {children}
    </instancedMesh>
  )
}
