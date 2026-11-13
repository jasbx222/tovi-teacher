import { useEffect, useRef, useState, type ReactNode } from "react"

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

/** Counts a real number up from zero when it first appears; text values pass through untouched. */
export function CountUp({ value, duration = 900 }: { value: string | number; duration?: number }) {
  const target = typeof value === "number" ? value : Number.NaN
  const [shown, setShown] = useState(() => (Number.isFinite(target) && !reduced() ? 0 : target))
  useEffect(() => {
    if (!Number.isFinite(target) || reduced()) { setShown(target); return }
    let frame = 0
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(target * eased)
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])
  if (!Number.isFinite(target)) return <>{value}</>
  const decimals = Number.isInteger(target) ? 0 : 2
  return <span className="tv-count">{shown.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>
}

/**
 * Pointer tilt for any element with the `tilt` class, delegated from the document so pages need no wiring.
 * Disabled for touch and for people who ask for reduced motion.
 */
export function TiltLayer() {
  useEffect(() => {
    if (reduced() || !window.matchMedia("(hover: hover)").matches) return
    let current: HTMLElement | null = null
    const reset = (el: HTMLElement | null) => { if (el) { el.style.removeProperty("--rx"); el.style.removeProperty("--ry"); el.style.removeProperty("--gx"); el.style.removeProperty("--gy") } }
    const move = (event: PointerEvent) => {
      const el = (event.target as HTMLElement | null)?.closest?.(".tilt") as HTMLElement | null
      if (el !== current) { reset(current); current = el }
      if (!el) return
      const box = el.getBoundingClientRect()
      const x = (event.clientX - box.left) / box.width
      const y = (event.clientY - box.top) / box.height
      el.style.setProperty("--ry", `${(x - 0.5) * 10}deg`)
      el.style.setProperty("--rx", `${(0.5 - y) * 8}deg`)
      el.style.setProperty("--gx", `${x * 100}%`)
      el.style.setProperty("--gy", `${y * 100}%`)
    }
    const leave = () => { reset(current); current = null }
    document.addEventListener("pointermove", move, { passive: true })
    document.addEventListener("pointerleave", leave)
    return () => { document.removeEventListener("pointermove", move); document.removeEventListener("pointerleave", leave) }
  }, [])
  return null
}

/** The Tovi planet: a shaded CSS 3D sphere with a tilted ring and an orbiting sun. No WebGL needed. */
export function Planet({ size = 180 }: { size?: number }) {
  return (
    <div className="tv-planet" style={{ ["--size" as string]: `${size}px` }} aria-hidden="true">
      <div className="tv-planet-glow" />
      <div className="tv-planet-ring back" />
      <div className="tv-planet-body"><span className="band a" /><span className="band b" /></div>
      <div className="tv-planet-ring front" />
      <div className="tv-planet-orbit"><span className="tv-planet-sun" /></div>
      <span className="tv-planet-star s1" /><span className="tv-planet-star s2" /><span className="tv-planet-star s3" />
    </div>
  )
}

/** Overview hero with the planet. Children are real figures or actions supplied by the page. */
export function PlanetHero({ kicker, title, lede, children }: { kicker?: string; title: string; lede?: string; children?: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  return (
    <section ref={ref} className="tv-vhero">
      <div className="tv-vhero-copy">
        {kicker ? <p className="tv-vhero-kicker">{kicker}</p> : null}
        <h2>{title}</h2>
        {lede ? <p className="tv-vhero-lede">{lede}</p> : null}
        {children ? <div className="tv-vhero-extra">{children}</div> : null}
      </div>
      <Planet />
    </section>
  )
}
