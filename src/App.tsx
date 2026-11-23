import { Canvas } from '@react-three/fiber'
import { Architecture } from './world/Architecture'
import { Controls } from './world/Controls'
import { Lighting } from './world/Lights'
import { SignLayer } from './world/Sign'
import { EndCaps, Ground, Lamps, Stalls } from './world/StreetProps'
import { Pedestrians } from './world/Pedestrians'
import { UI } from './ui/UI'

export default function App() {
  return (
    <div className="relative w-full h-full bg-black">
      <Canvas
        camera={{ fov: 68, near: 0.1, far: 220, position: [0, 1.62, 50] }}
        dpr={matchMedia('(pointer: coarse)').matches ? [1, 1.5] : [1, 1.75]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <Lighting />
        <Ground />
        <Architecture />
        <EndCaps />
        <Lamps />
        <Stalls />
        <Pedestrians />
        <SignLayer />
        <Controls />
      </Canvas>
      <UI />
    </div>
  )
}
