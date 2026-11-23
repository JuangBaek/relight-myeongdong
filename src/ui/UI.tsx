import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { signs } from '../world/layout'
import { E_MAX, progress, runtime } from '../world/Sign'
import { input } from '../world/player'

const IS_TOUCH = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches

/** On-screen joystick + FORWARD hold button for phones/tablets. */
function TouchControls() {
  const base = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const pid = useRef<number | null>(null)
  const [fwd, setFwd] = useState(false)

  const update = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect()
    const R = r.width / 2
    let dx = e.clientX - (r.left + R)
    let dy = e.clientY - (r.top + R)
    const l = Math.hypot(dx, dy)
    if (l > R) {
      dx *= R / l
      dy *= R / l
    }
    setKnob({ x: dx, y: dy })
    input.joy.set(dx / R, -dy / R)
  }
  const end = () => {
    pid.current = null
    setKnob({ x: 0, y: 0 })
    input.joy.set(0, 0)
  }
  const setFwdKey = (on: boolean) => {
    setFwd(on)
    if (on) input.keys.add('KeyW')
    else input.keys.delete('KeyW')
  }

  return (
    <>
      <div
        ref={base}
        className="absolute z-10 left-5 bottom-24 w-[124px] h-[124px] rounded-full border border-white/25 bg-black/35 backdrop-blur-sm"
        onPointerDown={(e) => {
          pid.current = e.pointerId
          e.currentTarget.setPointerCapture(e.pointerId)
          update(e)
        }}
        onPointerMove={(e) => pid.current === e.pointerId && update(e)}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div className="label absolute inset-x-0 top-1 text-center !text-[8px]">MOVE</div>
        <div
          className="absolute w-[52px] h-[52px] rounded-full bg-mint/80 border border-mint"
          style={{ left: 62 - 26 + knob.x, top: 62 - 26 + knob.y }}
        />
      </div>
      <button
        className="absolute z-10 right-5 bottom-24 w-[84px] h-[84px] rounded-full font-mono text-[11px] tracking-widest border"
        style={{
          background: fwd ? '#ADFFB6' : 'rgba(0,0,0,0.45)',
          color: fwd ? '#000' : '#ADFFB6',
          borderColor: '#ADFFB6',
          touchAction: 'none',
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          setFwdKey(true)
        }}
        onPointerUp={() => setFwdKey(false)}
        onPointerCancel={() => setFwdKey(false)}
      >
        ▲<br />
        FORWARD
      </button>
    </>
  )
}

const TYPE_LABEL = {
  VERTICAL: 'PROJECTING · VERTICAL',
  ROUND: 'PROJECTING · ROUND',
  FASCIA: 'FASCIA · HORIZONTAL',
  BANNER: 'LARGE LED BANNER · VERTICAL',
} as const

const STRATEGY = {
  VERTICAL: 'Rotate the projecting sign to lie parallel to the façade, align to the common sign band, mute the LED.',
  ROUND: 'Swing the round sign flat against the wall, reduce diameter, switch to low-glare monochrome.',
  FASCIA: 'Keep on the fascia line; unify band colour, limit lighting to lettering, reduce depth.',
  BANNER: 'Flatten the LED box onto the façade, cap height to the sign band, replace saturated colour with grey.',
} as const

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="py-2 border-t border-white/10">
      <div className="label mb-1">{k}</div>
      <div className="text-[13px] leading-snug text-white">{children}</div>
    </div>
  )
}

function SignPanel() {
  const id = useStore((s) => s.selectedId)
  const hover = useStore((s) => s.hoverId)
  const revert = useStore((s) => s.revertSign)
  const shown = id ?? hover
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 90)
    return () => clearInterval(t)
  }, [])
  const s = signs.find((x) => x.id === shown)
  if (!s) {
    return (
      <div className="glass p-4 w-[270px] hidden sm:block">
        <div className="label mb-2">SELECTED SIGN</div>
        <div className="text-[13px] text-sub leading-relaxed">
          Aim at a sign and click it.
          <br />
          WALK: crosshair + click · EDIT: pointer + click
        </div>
      </div>
    )
  }
  const rt = runtime.get(s.id)!
  const p = progress[s.id].v
  const pct = Math.round(rt.power * 100)
  const before = Math.round((s.e0 / E_MAX) * 100)
  const mount = !s.hinge
    ? p > 0.98
      ? 'ALIGNED · FLUSH ON FAÇADE'
      : 'FLUSH · DEEP LIGHT-BOX'
    : p < 0.02
      ? 'PROJECTING 90° TO WALL'
      : p > 0.98
        ? 'WALL-MOUNTED · PARALLEL'
        : `ROTATING ${Math.round(rt.swing * 90)}° / 90°`
  return (
    <div className="glass p-3 sm:p-4 w-[230px] sm:w-[270px] max-h-[48vh] sm:max-h-none overflow-y-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="label">SELECTED SIGN</div>
        <div className="label" style={{ color: p > 0.98 ? '#ADFFB6' : '#A5A5A5' }}>
          {p > 0.98 ? 'IMPROVED' : p < 0.02 ? 'ORIGINAL' : 'TRANSITION'}
        </div>
      </div>
      <div className="text-[22px] font-semibold tracking-tight mb-1">{s.brand}</div>
      <div className="font-mono text-[11px] text-sub mb-2">{s.id}</div>
      <Row k="SIGN ID">{s.id}</Row>
      <Row k="SIGN TYPE">{TYPE_LABEL[s.type]}</Row>
      <Row k="ORIGINAL CONDITION">
        {s.hinge ? `Projects ${(s.w).toFixed(1)} m from wall` : `Façade-mounted, ${(s.d0 * 100).toFixed(0)} cm light-box`} · saturated {s.colorName.toLowerCase()} LED · {before}% output
      </Row>
      <Row k="IMPROVEMENT STRATEGY">{STRATEGY[s.type]}</Row>
      <Row k="LIGHTING INTENSITY">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-[3px] bg-white/15 relative">
            <div className="absolute left-0 top-0 h-full bg-mint" style={{ width: `${pct}%` }} />
          </div>
          <span className="font-mono text-[11px] w-[74px] text-right">
            {before}% → {pct}%
          </span>
        </div>
      </Row>
      <Row k="SIGNAGE COLOR">
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 border border-white/30" style={{ background: rt.hex }} />
          <span className="font-mono text-[11px]">{rt.hex.toUpperCase()}</span>
          <span className="text-sub text-[11px]">→ {s.variant} + MINT NEON RIM</span>
        </div>
      </Row>
      <Row k="WALL-MOUNTED STATUS">
        <span className="font-mono text-[11px]">{mount}</span>
      </Row>
      {id === s.id && p > 0.5 && (
        <button className="btn w-full mt-2" onClick={() => revert(s.id)}>
          REVERT THIS SIGN
        </button>
      )}
    </div>
  )
}

export function UI() {
  const started = useStore((s) => s.started)
  const mode = useStore((s) => s.mode)
  const view = useStore((s) => s.view)
  const busy = useStore((s) => s.busy)
  const locked = useStore((s) => s.locked)
  const improvedMap = useStore((s) => s.improved)
  const hover = useStore((s) => s.hoverId)
  const { start, toggleMode, setView, improveAll, resetAll } = useStore.getState()
  const count = view === 'improved' ? signs.length : view === 'original' ? 0 : Object.values(improvedMap).filter(Boolean).length

  if (!started) {
    return (
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20 p-6">
        <div className="max-w-[560px] w-full">
          <div className="label mb-3" style={{ color: '#ADFFB6' }}>
            INTERACTIVE URBAN NIGHTSCAPE SIMULATION
          </div>
          <h1 className="text-[44px] sm:text-[56px] leading-[1.02] font-semibold tracking-tight m-0">RE:LIGHT<br />MYEONGDONG</h1>
          <p className="text-sub text-[14px] mt-4 leading-relaxed">
            Walk a 3D shopping street at night and click signs one by one. Each sign swings onto the façade, loses its saturated LED glare and
            joins one calm monochrome order — while keeping its own name and logo.
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-6 font-mono text-[11px] text-sub">
            <div>W A S D — move</div>
            <div>Shift — run</div>
            <div>Mouse — look (click to capture)</div>
            <div>ESC — release mouse</div>
            <div>Tab — WALK / EDIT mode</div>
            <div>1 2 3 4 — Orig / Improved / All / Reset</div>
            <div>← → ↑ ↓ or Q E — turn</div>
            <div>Phone: MOVE stick + FORWARD, drag to look, tap a sign</div>
          </div>
          <button
            className="btn mt-8 !px-8 !py-3 active"
            onClick={() => {
              start()
              document.querySelector('canvas')?.requestPointerLock?.()
            }}
          >
            ENTER THE STREET
          </button>
          <p className="text-[11px] text-sub/80 mt-6 leading-relaxed max-w-[520px]">
            A design-alternative visualization tool. The street is an approximate, stylised model inspired by Myeongdong's commercial streets — not a
            digital twin. Shop names are fictional. Lighting is shown for visual comparison only and does not represent measured luminance (cd/m²) or
            illuminance (lx) under any regulation.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* title */}
      <div className="absolute top-[58px] sm:top-4 left-4 sm:left-5 z-10 pointer-events-none">
        <div className="text-[13px] sm:text-[15px] font-semibold tracking-[0.12em]">RE:LIGHT MYEONGDONG</div>
        <div className="label mt-1 hidden sm:block">Interactive Urban Nightscape Simulation</div>
      </div>

      {/* mode + progress */}
      <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 sm:gap-3 whitespace-nowrap">
        <button className="btn" onClick={toggleMode} title="Tab">
          <span style={{ color: mode === 'WALK' ? '#ADFFB6' : '#fff' }}>WALK MODE</span>
          <span className="mx-2 text-white/30">/</span>
          <span style={{ color: mode === 'EDIT' ? '#ADFFB6' : '#fff' }}>EDIT MODE</span>
        </button>
        <div className="glass px-3 py-[9px] font-mono text-[11px] tracking-widest">
          <span className="text-mint">{count}</span> / {signs.length} IMPROVED
        </div>
      </div>

      {/* crosshair */}
      {mode === 'WALK' && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
          <div className="w-[6px] h-[6px] rounded-full" style={{ background: hover ? '#ADFFB6' : 'rgba(255,255,255,0.7)', boxShadow: hover ? '0 0 10px #ADFFB6' : 'none' }} />
        </div>
      )}

      {/* hint */}
      <div className="absolute bottom-[78px] left-5 z-10 pointer-events-none font-mono text-[10px] tracking-widest text-sub max-w-[300px] leading-relaxed" hidden={IS_TOUCH}>
        {mode === 'WALK'
          ? locked
            ? 'WALK · aim with crosshair, click a sign · ESC to release'
            : 'WALK · click the view to capture mouse · drag to look'
          : 'EDIT · hover a sign and click · mouse look is off · arrows/Q E turn'}
      </div>

      {IS_TOUCH && (
        <>
          <TouchControls />
          <div className="absolute bottom-[212px] left-5 z-10 pointer-events-none font-mono text-[10px] tracking-widest text-sub leading-relaxed">
            DRAG SCREEN: LOOK · TAP SIGN: IMPROVE
          </div>
        </>
      )}

      {/* right info panel */}
      <div className="absolute top-14 sm:top-16 right-2 sm:right-4 z-10 max-h-[calc(100%-150px)] overflow-hidden">
        <SignPanel />
      </div>

      {/* bottom controls */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex gap-2 flex-wrap justify-center px-3">
        <button className={`btn ${view === 'original' ? 'active' : ''}`} onClick={() => setView('original')}>
          ORIGINAL
        </button>
        <button className={`btn ${view === 'improved' ? 'active' : ''}`} onClick={() => setView('improved')}>
          IMPROVED
        </button>
        <button className={`btn ${busy ? 'active' : ''}`} onClick={improveAll}>
          IMPROVE ALL
        </button>
        <button className="btn" onClick={resetAll}>
          RESET ALL
        </button>
      </div>

      <div className="absolute bottom-2 right-4 z-10 pointer-events-none font-mono text-[9px] tracking-wider text-sub/60 text-right">
        Design visualization only · not a digital twin · fictional shops · not a luminance/illuminance measurement
      </div>
    </>
  )
}
