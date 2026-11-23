import { arch } from './layout'
import { Batch } from './Batch'

export function Architecture() {
  return (
    <>
      {/* masonry / stucco upper blocks */}
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

      {/* lit shop interiors seen through glazing */}
      <Batch items={arch.interiors}>
        <meshBasicMaterial side={1} toneMapped={false} />
      </Batch>
      <Batch items={arch.shelves}>
        <meshBasicMaterial toneMapped={false} />
      </Batch>
      <Batch items={arch.ceilingLights}>
        <meshBasicMaterial toneMapped={false} />
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
    </>
  )
}
