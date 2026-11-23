import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { signs } from './layout'
import { progress, runtime } from './Sign'
import { getGlowTexture } from './textures'

/** Shared by Lamps(): warm pavement pools that rise as sign spill falls (even walkway light). */
export const lampGlowMat = new THREE.MeshBasicMaterial({
  color: new THREE.Color(1, 0.72, 0.4),
  transparent: true,
  opacity: 0.16,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
  map: getGlowTexture(),
})

/** Global frac of the street that has been improved (0..1), updated every frame. */
export const street = { frac: 0 }

const POOL = 6

export function Lighting() {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const hemi = useRef<THREE.HemisphereLight>(null!)
  const bloom = useRef<{ intensity: number } | null>(null)
  const lights = useRef<(THREE.PointLight | null)[]>([])
  const cands = useRef<{ id: string; d: number }[]>(signs.map((s) => ({ id: s.id, d: 0 })))

  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl)
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.1
    scene.background = new THREE.Color('#05060b')
    scene.fog = new THREE.FogExp2('#07080e', 0.017)
    return () => {
      scene.environment = null
      env.dispose()
      pm.dispose()
    }
  }, [gl, scene])

  useFrame(() => {
    // overall improvement fraction (smoothly follows individual tweens)
    let sum = 0
    for (const s of signs) sum += progress[s.id].v
    const f = sum / signs.length
    street.frac = f

    hemi.current.intensity = 0.4 + 0.55 * f // calmer, more even ambient as the street resolves
    lampGlowMat.opacity = 0.16 + 0.34 * f
    if (bloom.current) bloom.current.intensity = THREE.MathUtils.lerp(1.15, 0.85, f) // less glare, but neon keeps its glow

    // nearest-N signs drive real point lights
    const c = cands.current
    for (const k of c) k.d = runtime.get(k.id)!.center.distanceToSquared(camera.position)
    c.sort((a, b) => a.d - b.d)
    for (let i = 0; i < POOL; i++) {
      const l = lights.current[i]
      if (!l) continue
      const rt = runtime.get(c[i].id)!
      l.position.copy(rt.center)
      l.color.copy(rt.color)
      l.intensity = THREE.MathUtils.lerp(l.intensity, 34 * rt.lightPower * rt.lightPower + 1.2, 0.2)
    }
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={['#6b7aa8', '#1a1713', 0.4]} />
      <directionalLight position={[10, 40, 10]} intensity={0.12} color="#8fa0d0" />
      {Array.from({ length: POOL }, (_, i) => (
        <pointLight key={i} ref={(el) => void (lights.current[i] = el)} distance={16} decay={2} intensity={0} />
      ))}
      <EffectComposer multisampling={0}>
        <Bloom
          ref={bloom as never}
          mipmapBlur
          luminanceThreshold={1}
          luminanceSmoothing={0.2}
          intensity={1.15}
          radius={0.7}
        />
        <Vignette eskil={false} offset={0.25} darkness={0.55} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <SMAA />
      </EffectComposer>
    </>
  )
}
