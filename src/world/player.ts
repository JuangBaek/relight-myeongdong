import * as THREE from 'three'
import gsap from 'gsap'
import { boxes, circles, WALK_X, WALK_Z } from './layout'

export const EYE = 1.62
export const player = {
  pos: new THREE.Vector3(0, EYE, 50),
  yaw: 0,
  pitch: 0,
  vel: new THREE.Vector2(),
  bob: 0,
  auto: false,
}

export const input = {
  keys: new Set<string>(),
  joy: new THREE.Vector2(), // touch joystick (x: strafe, y: forward)
  run: false,
}

const R = 0.32
export function blocked(x: number, z: number) {
  if (Math.abs(x) > WALK_X || Math.abs(z) > WALK_Z) return true
  for (const c of circles) {
    const dx = x - c.x
    const dz = z - c.z
    if (dx * dx + dz * dz < (c.r + R) * (c.r + R)) return true
  }
  for (const b of boxes) {
    if (x > b.x0 - R && x < b.x1 + R && z > b.z0 - R && z < b.z1 + R) return true
  }
  return false
}

export function flyTo(x: number, z: number, yaw: number, pitch = 0, dur = 1.2) {
  player.auto = true
  // shortest yaw path
  let dy = (yaw - player.yaw) % (Math.PI * 2)
  if (dy > Math.PI) dy -= Math.PI * 2
  if (dy < -Math.PI) dy += Math.PI * 2
  gsap.to(player.pos, { x, z, duration: dur, ease: 'power2.inOut' })
  gsap.to(player, {
    yaw: player.yaw + dy,
    pitch,
    duration: dur,
    ease: 'power2.inOut',
    onComplete: () => {
      player.auto = false
    },
  })
}
