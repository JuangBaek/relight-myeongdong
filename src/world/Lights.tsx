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

/** Shared shop-interior materials: brighten as the street is improved so shops feel open for business. */
export const interiorMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, toneMapped: false })
export const shelfMat = new THREE.MeshBasicMaterial({ toneMapped: false })
export const ceilMat = new THREE.MeshBasicMaterial({ toneMapped: false })

/** Global frac of the street that has been improved (0..1), updated every frame. */
export const street = { frac: 0 }

const POOL = 6

export function Lighting() {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const hemi = useRef<THREE.HemisphereLight>(null!)
  const dir = useRef<THREE.DirectionalLight>(null!)
  const bloom = useRef<{ intensity: number } | null>(null)
  const lights = useRef<(THREE.PointLight | null)[]>([])
  const cands = useRef<{ id: string; d: number }[]>(signs.map((s) => ({ id: s.id, d: 0 })))

  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl)
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.1
    scene.background = new THREE.Color('#040509')
    scene.fog = new THREE.FogExp2('#05060a', 0.017)
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

    hemi.current.intensity = 0.4 + 0.5 * f // even, comfortable ambient as the street resolves
    lampGlowMat.opacity = 0.16 + 0.4 * f
    scene.environmentIntensity = 0.1 + 0.12 * f
    dir.current.intensity = 0.12 + 0.2 * f
    interiorMat.color.setScalar(1 + 3.2 * f) // shops light up
    shelfMat.color.setScalar(1 + 1.6 * f)
    ceilMat.color.setScalar(1 + 0.3 * f)
    const fog = scene.fog as THREE.FogExp2 | null
    if (fog && scene.background instanceof THREE.Color) {
      fog.density = THREE.MathUtils.lerp(0.017, 0.013, f)
      fog.color.setRGB(0.02 + 0.005 * f, 0.023 + 0.006 * f, 0.043 + 0.01 * f) // sky stays deep night
      scene.background.copy(fog.color)
    }
    if (bloom.current) bloom.current.intensity = THREE.MathUtils.lerp(1.15, 0.7, f) // less glare, neon keeps a gentle glow

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
      <directionalLight ref={dir} position={[10, 40, 10]} intensity={0.12} color="#c8d4f0" />
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
