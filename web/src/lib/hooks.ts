import { useEffect, useRef, useState } from 'react'

export type Theme = 'dark' | 'light'

// Storage can throw when the app is embedded in a sandboxed frame (Streamlit),
// so preference persistence is best-effort and never breaks rendering.
const readStored = (): Theme | null => {
  try {
    const stored = localStorage.getItem('cv-theme')
    return stored === 'dark' || stored === 'light' ? stored : null
  } catch {
    return null
  }
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(
    () => readStored() ?? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'),
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('cv-theme', theme)
    } catch {
      /* embedded without storage access — the toggle still works for the session */
    }
  }, [theme])

  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))]
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Eases a number toward its target so figures land rather than snap. */
export function useCountUp(target: number, duration = 900, enabled = true): number {
  const [value, setValue] = useState(enabled ? 0 : target)
  const frame = useRef(0)

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      setValue(target)
      return
    }
    const from = 0
    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + (target - from) * eased)
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }

    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [target, duration, enabled])

  return value
}

/** Reveals a section the first time it scrolls into view. */
export function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, seen])

  return { ref, seen }
}

/** Tracks which section id is currently the reading position. */
export function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? '')

  useEffect(() => {
    const onScroll = () => {
      const line = window.innerHeight * 0.35
      let current = ids[0] ?? ''
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= line) current = id
      }
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [ids])

  return active
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = () => setMatches(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])

  return matches
}
