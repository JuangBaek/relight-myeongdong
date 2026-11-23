import { create } from 'zustand'
import gsap from 'gsap'
import { signs } from './world/layout'
import { flyTo } from './world/player'

export type Mode = 'WALK' | 'EDIT'
export type View = 'live' | 'original' | 'improved'

interface State {
  started: boolean
  mode: Mode
  view: View
  improved: Record<string, boolean>
  selectedId: string | null
  hoverId: string | null
  locked: boolean
  busy: boolean
  start: () => void
  setMode: (m: Mode) => void
  toggleMode: () => void
  setLocked: (b: boolean) => void
  setHover: (id: string | null) => void
  clickSign: (id: string) => void
  revertSign: (id: string) => void
  setView: (v: View) => void
  improveAll: () => void
  resetAll: () => void
}

let timers: gsap.core.Tween[] = []
const clearTimers = () => {
  timers.forEach((t) => t.kill())
  timers = []
}

export const useStore = create<State>((set, get) => ({
  started: false,
  mode: 'WALK',
  view: 'live',
  improved: {},
  selectedId: null,
  hoverId: null,
  locked: false,
  busy: false,
  start: () => set({ started: true }),
  setMode: (mode) => {
    if (mode === 'EDIT' && document.pointerLockElement) document.exitPointerLock()
    set({ mode })
  },
  toggleMode: () => get().setMode(get().mode === 'WALK' ? 'EDIT' : 'WALK'),
  setLocked: (locked) => set({ locked }),
  setHover: (hoverId) => {
    if (get().hoverId !== hoverId) set({ hoverId })
  },
  clickSign: (id) => {
    clearTimers()
    set((s) => ({
      selectedId: id,
      view: 'live',
      busy: false,
      improved: { ...(s.view === 'improved' ? Object.fromEntries(signs.map((x) => [x.id, true])) : s.view === 'original' ? {} : s.improved), [id]: true },
    }))
  },
  revertSign: (id) => set((s) => ({ view: 'live', improved: { ...s.improved, [id]: false } })),
  setView: (view) => {
    clearTimers()
    set({ view, busy: false })
  },
  improveAll: () => {
    clearTimers()
    set({ view: 'live', busy: true })
    // look down the street from its entrance, then improve near -> far
    const startZ = 52
    flyTo(0, startZ, 0, 0.02, 1.1)
    const order = [...signs].sort((a, b) => Math.abs(a.zc - startZ) - Math.abs(b.zc - startZ))
    order.forEach((s, i) => {
      timers.push(
        gsap.delayedCall(0.9 + i * 0.26, () => set((st) => ({ improved: { ...st.improved, [s.id]: true } }))),
      )
    })
    timers.push(gsap.delayedCall(0.9 + order.length * 0.26 + 1.3, () => set({ busy: false })))
  },
  resetAll: () => {
    clearTimers()
    set({ view: 'live', improved: {}, busy: false, selectedId: null })
  },
}))

/** Target improvement (0|1) for a sign given the global view + per-sign state. */
export const targetFor = (s: State, id: string) =>
  s.view === 'original' ? 0 : s.view === 'improved' ? 1 : s.improved[id] ? 1 : 0

if (typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__relight = { useStore }
