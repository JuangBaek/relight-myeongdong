import { useMemo } from 'react'
import * as THREE from 'three'
import { arch } from './layout'
import { Batch } from './Batch'
import { ceilMat, interiorMat, shelfMat } from './Lights'
import { makeWallTextures } from './textures'
import { mulberry32 } from './rng'

/** Tiles a texture per instance (so a 30 m wall and a 6 m wall both show brick at the same scale). */
function patchTiled(shader: { vertexShader: string }) {
  shader.vertexShader =
    'attribute vec2 uvScale;\n' +
    shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\n  vMapUv = uv * uvScale;\n#endif')
}

// per facade material: [roughness, metalness]
const WALL_PBR: [number, number][] = [
  [0.95, 0.0], // stucco
  [0.9, 0.0], // brick
  [0.35, 0.05], // glazed tile (glossy)
  [0.45, 0.7], // metal panel
  [0.92, 0.0], // concrete
]

/** Overhead cables strung between façades – a small but very typical detail of real shopping streets. */
function Wires() {
  const geo = useMemo(() => {
    const r = mulberry32(5)
    const pts: number[] = []
    for (let k = 0; k < 22; k++) {
      const z = -54 + k * 5 + r() * 2.5
      const y = 7.2 + r() * 3.2
      const sag = 0.25 + r() * 0.4
      for (let w = 0; w < 2; w++) {
        let prev: [number, number, number] | null = null
        for (let i = 0; i <= 14; i++) {
          const t = i / 14
          const p: [number, number, number] = [-3.95 + 7.9 * t, y - sag * 4 * t * (1 - t) - w * 0.06, z + w * 0.12]
          if (prev) pts.push(...prev, ...p)
          prev = p
        }
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#0b0b0d" />
    </lineSegments>
  )
}

export function Architecture() {
  const wallMaps = useMemo(() => makeWallTextures(), [])
  return (
    <>
      {/* upper blocks: five facade materials (stucco, brick, glazed tile, metal panel, concrete) */}
      {arch.wallTex.map((items, i) => (
        <Batch key={i} items={items}>
          <meshStandardMaterial
            map={wallMaps[i]}
            roughness={WALL_PBR[i][0]}
            metalness={WALL_PBR[i][1]}
            onBeforeCompile={patchTiled}
            customProgramCacheKey={() => 'wall-tiled'}
          />
        </Batch>
      ))}
      {/* plain ground-floor mass behind the shop interiors */}
      <Batch items={arch.walls}>
        <meshStandardMaterial roughness={0.9} metalness={0.02} />
      </Batch>
      <Batch items={arch.bands}>
        <meshStandardMaterial roughness={0.7} metalness={0.2} />
      </Batch>
      <Batch items={arch.pilasters}>
        <meshStandardMaterial roughness={0.85} />
      </Batch>
      <Batch items={arch.ledges}>
        <meshStandardMaterial roughness={0.8} />
      </Batch>
      <Batch items={arch.roof}>
        <meshStandardMaterial roughness={0.9} />
      </Batch>
      <Batch items={arch.fins}>
        <meshStandardMaterial roughness={0.6} metalness={0.5} />
      </Batch>

      {/* services: drain pipes and outdoor air-conditioner units */}
      <Batch items={arch.pipes} geo="cyl">
        <meshStandardMaterial roughness={0.6} metalness={0.4} />
      </Batch>
      <Batch items={arch.acBody}>
        <meshStandardMaterial roughness={0.6} metalness={0.3} />
      </Batch>
      <Batch items={arch.acFan} geo="cyl">
        <meshStandardMaterial roughness={0.5} metalness={0.6} />
      </Batch>

      {/* lit shop interiors seen through glazing */}
      <Batch items={arch.interiors}>
        <primitive object={interiorMat} attach="material" />
      </Batch>
      <Batch items={arch.shelves}>
        <primitive object={shelfMat} attach="material" />
      </Batch>
      <Batch items={arch.ceilingLights}>
        <primitive object={ceilMat} attach="material" />
      </Batch>
      <Batch items={arch.glass}>
        <meshPhysicalMaterial color="#9fb4c4" transparent opacity={0.12} roughness={0.05} metalness={0.2} depthWrite={false} />
      </Batch>
      <Batch items={arch.mullions}>
        <meshStandardMaterial roughness={0.4} metalness={0.8} />
      </Batch>

      {/* upper-floor windows */}
      <Batch items={arch.windowsLit}>
        <meshBasicMaterial toneMapped={false} />
      </Batch>
      <Batch items={arch.windowsDark}>
        <meshStandardMaterial roughness={0.15} metalness={0.9} />
      </Batch>
      <Batch items={arch.sills}>
        <meshStandardMaterial roughness={0.8} />
      </Batch>

      <Wires />
    </>
  )
}
