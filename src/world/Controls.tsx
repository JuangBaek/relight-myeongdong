import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { signMeshes } from './Sign'
import { blocked, EYE, input, player } from './player'

const SENS = 0.0022
const MAX_PITCH = 1.25
const PICK_RANGE = 28

/** First-person walking, collision, look controls and sign picking. */
export function Controls() {
  const { camera, gl } = useThree()
  const ray = useRef(new THREE.Raycaster())
  const ndc = useRef(new THREE.Vector2(0, 0))
  const mouseIn = useRef(false)
  const frame = useRef(0)

  useEffect(() => {
    camera.rotation.order = 'YXZ'
    const el = gl.domElement
    const st = () => useStore.getState()

    const pickAt = (x: number, y: number): string | null => {
      ray.current.setFromCamera(new THREE.Vector2(x, y), camera)
      ray.current.far = PICK_RANGE
      const hits = ray.current.intersectObjects([...signMeshes.values()], false)
      return hits.length ? (hits[0].object.userData.signId as string) : null
    }
    ;(el as unknown as { __pick: typeof pickAt }).__pick = pickAt

    const look = (dx: number, dy: number) => {
      if (player.auto) return
      player.yaw -= dx * SENS
      player.pitch = THREE.MathUtils.clamp(player.pitch - dy * SENS, -MAX_PITCH, MAX_PITCH)
    }

    const down = (e: KeyboardEvent) => {
      if (!st().started) return
      const k = e.code
      if (k === 'Tab') {
        e.preventDefault()
        st().toggleMode()
        return
      }
      if (k === 'Digit1') st().setView('original')
      else if (k === 'Digit2') st().setView('improved')
      else if (k === 'Digit3') st().improveAll()
      else if (k === 'Digit4') st().resetAll()
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(k)) e.preventDefault()
      input.keys.add(k)
    }
    const up = (e: KeyboardEvent) => input.keys.delete(e.code)
    const blur = () => input.keys.clear()

    const lockChange = () => {
      const locked = document.pointerLockElement === el
      st().setLocked(locked)
    }

    // ---- mouse
    let downPos: [number, number] | null = null
    let dragged = 0
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      ndc.current.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      mouseIn.current = true
      if (document.pointerLockElement === el) {
        look(e.movementX, e.movementY)
        return
      }
      const mode = st().mode
      if (downPos && ((mode === 'WALK' && e.buttons & 1) || (mode === 'EDIT' && e.buttons & 2))) {
        dragged += Math.abs(e.movementX) + Math.abs(e.movementY)
        look(e.movementX, e.movementY)
      }
    }
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      downPos = [e.clientX, e.clientY]
      dragged = 0
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.button !== 0) return
      const s = st()
      if (!s.started) return
      const locked = document.pointerLockElement === el
      if (s.mode === 'EDIT') {
        if (dragged > 6) return
        const id = pickAt(ndc.current.x, ndc.current.y)
        if (id) s.clickSign(id)
      } else if (locked) {
        const id = pickAt(0, 0)
        if (id) s.clickSign(id)
      } else if (dragged < 6) {
        el.requestPointerLock?.()
      }
      downPos = null
    }
    const onLeave = () => (mouseIn.current = false)

    // ---- touch: left half = joystick, right half = look, short tap = pick
    const touches = new Map<number, { x0: number; y0: number; x: number; y: number; t0: number; side: 'L' | 'R'; moved: number }>()
    const tStart = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        touches.set(t.identifier, { x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY, t0: performance.now(), side: 'R', moved: 0 })
      }
    }
    const tMove = (e: TouchEvent) => {
      e.preventDefault()
      for (const t of Array.from(e.changedTouches)) {
        const o = touches.get(t.identifier)
        if (!o) continue
        const dx = t.clientX - o.x
        const dy = t.clientY - o.y
        o.x = t.clientX
        o.y = t.clientY
        o.moved += Math.abs(dx) + Math.abs(dy)
        if (o.side === 'L') {
          input.joy.set(THREE.MathUtils.clamp((o.x - o.x0) / 60, -1, 1), THREE.MathUtils.clamp(-(o.y - o.y0) / 60, -1, 1))
        } else if (st().mode === 'WALK') look(dx * 1.3, dy * 1.3)
      }
    }
    const tEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        const o = touches.get(t.identifier)
        if (!o) continue
        touches.delete(t.identifier)
        if (o.side === 'L') input.joy.set(0, 0)
        if (o.moved < 10 && performance.now() - o.t0 < 350 && st().started) {
          const rect = el.getBoundingClientRect()
          const id = pickAt(((t.clientX - rect.left) / rect.width) * 2 - 1, -((t.clientY - rect.top) / rect.height) * 2 + 1)
          if (id) st().clickSign(id)
        }
      }
    }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    document.addEventListener('pointerlockchange', lockChange)
    window.addEventListener('mousemove', onMove)
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('mouseleave', onLeave)
    el.addEventListener('contextmenu', (e) => e.preventDefault())
    el.addEventListener('touchstart', tStart, { passive: true })
    el.addEventListener('touchmove', tMove, { passive: false })
    el.addEventListener('touchend', tEnd)
    el.addEventListener('touchcancel', tEnd)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      document.removeEventListener('pointerlockchange', lockChange)
      window.removeEventListener('mousemove', onMove)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('mouseleave', onLeave)
      el.removeEventListener('touchstart', tStart)
      el.removeEventListener('touchmove', tMove)
      el.removeEventListener('touchend', tEnd)
      el.removeEventListener('touchcancel', tEnd)
    }
  }, [camera, gl])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = useStore.getState()
    const k = input.keys

    if (!player.auto && s.started) {
      // arrow keys / Q E turn (also works in EDIT mode where mouse look is disabled)
      const turn = (k.has('ArrowLeft') || k.has('KeyQ') ? 1 : 0) - (k.has('ArrowRight') || k.has('KeyE') ? 1 : 0)
      player.yaw += turn * 1.7 * dt
      const tilt = (k.has('ArrowUp') ? 1 : 0) - (k.has('ArrowDown') ? 1 : 0)
      player.pitch = THREE.MathUtils.clamp(player.pitch + tilt * 1.2 * dt, -MAX_PITCH, MAX_PITCH)

      let f = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0) + input.joy.y
      let r = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0) + input.joy.x
      const len = Math.hypot(f, r)
      if (len > 1) {
        f /= len
        r /= len
      }
      const run = k.has('ShiftLeft') || k.has('ShiftRight') || input.joy.length() > 0.92 // full stick push = run
      const speed = run ? 6.5 : 3.0
      const sin = Math.sin(player.yaw)
      const cos = Math.cos(player.yaw)
      const wx = (-sin * f + cos * r) * speed
      const wz = (-cos * f - sin * r) * speed
      player.vel.x += (wx - player.vel.x) * Math.min(1, dt * 10)
      player.vel.y += (wz - player.vel.y) * Math.min(1, dt * 10)
      // axis-separated movement => sliding along walls / props
      const nx = player.pos.x + player.vel.x * dt
      if (!blocked(nx, player.pos.z)) player.pos.x = nx
      const nz = player.pos.z + player.vel.y * dt
      if (!blocked(player.pos.x, nz)) player.pos.z = nz
      const sp = Math.hypot(player.vel.x, player.vel.y)
      player.bob += sp * dt * 2.1
    }

    const bobY = Math.sin(player.bob * 2) * 0.028 * Math.min(1, Math.hypot(player.vel.x, player.vel.y) / 3)
    camera.position.set(player.pos.x, EYE + bobY, player.pos.z)
    camera.rotation.set(player.pitch, player.yaw, Math.sin(player.bob) * 0.0025, 'YXZ')

    // hover (throttled): crosshair when pointer-locked, cursor in EDIT mode
    if (++frame.current % 3 === 0 && s.started) {
      const pick = (gl.domElement as unknown as { __pick?: (x: number, y: number) => string | null }).__pick
      let id: string | null = null
      if (pick) {
        if (s.locked) id = pick(0, 0)
        else if (s.mode === 'EDIT' && mouseIn.current) id = pick(ndc.current.x, ndc.current.y)
      }
      s.setHover(id)
      gl.domElement.style.cursor = id ? 'pointer' : s.mode === 'EDIT' ? 'crosshair' : s.locked ? 'none' : 'grab'
    }
  })

  return null
}
