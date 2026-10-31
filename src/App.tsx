import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ScrollTrigger } from './lib/gsap'
import {
  destroySmoothScroll,
  getLenis,
  initSmoothScroll,
  lockScroll
} from './composables/useSmoothScroll'
import { finishBoot, getUi, setMenuOpen, setUi, useUi } from './store/ui'
import { AppRoutes, routeNameFor } from './router'
import Preloader from './components/Preloader'
import CustomCursor from './components/CustomCursor'
import GrainOverlay from './components/GrainOverlay'
import SiteHeader from './components/SiteHeader'
import MenuOverlay from './components/MenuOverlay'
import ScrollProgress from './components/ScrollProgress'
import RouteWipe, { type RouteWipeHandle } from './components/RouteWipe'
import './styles/components/App.css'

const WIPE_NAMES: Record<string, string> = {
  home: 'Index',
  'work-index': 'Work',
  work: 'Case',
  journal: 'Journal',
  post: 'Entry',
  'not-found': '404'
}

export default function App() {
  const ui = useUi()
  const location = useLocation()

  const [showPreloader, setShowPreloader] = useState(true)
  const [rendered, setRendered] = useState(location)
  const [leaving, setLeaving] = useState(false)
  const [pageReady, setPageReady] = useState(true)
  const [scrolled, setScrolled] = useState(false)

  const wipe = useRef<RouteWipeHandle>(null)
  const locationRef = useRef(location)
  const prevPath = useRef(location.pathname)
  const timers = useRef<number[]>([])

  locationRef.current = location
  const isHome = rendered.pathname === '/'

  function later(fn: () => void, delay: number) {
    const id = window.setTimeout(fn, delay)
    timers.current.push(id)
    return id
  }

  function scheduleRefresh(delay = 420) {
    later(() => ScrollTrigger.refresh(), delay)
  }

  function resetScroll() {
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
    else window.scrollTo(0, 0)
    scheduleRefresh(520)
  }

  function onIntro() {
    setUi({ introDone: true })
  }

  function onPreloaderDone() {
    finishBoot()
    setShowPreloader(false)

    // Always open on the hero. Browsers otherwise restore the previous scroll
    // position on reload, which looked like the site "jumping" to About.
    if (!location.hash) {
      const lenis = getLenis()
      if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
      else window.scrollTo(0, 0)
    }

    scheduleRefresh(240)
  }

  /* Route changes --------------------------------------------------------- */

  useEffect(() => {
    if (prevPath.current === location.pathname) return
    prevPath.current = location.pathname

    setPageReady(false)
    if (getUi().menuOpen) setMenuOpen(false)

    if (getUi().introDone) {
      wipe.current?.play(WIPE_NAMES[routeNameFor(location.pathname)] || 'Index', location.pathname)
    }

    setLeaving(true)
    later(() => {
      setRendered(locationRef.current)
      setLeaving(false)
      resetScroll()
      later(() => setPageReady(true), 90)
    }, 320)
  }, [location.pathname])

  /* Lifecycle ------------------------------------------------------------- */

  useEffect(() => {
    // Take over scroll restoration so a reload always starts at the top.
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'

    initSmoothScroll()
    lockScroll()

    function onKeydown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || !getUi().menuOpen) return
      setMenuOpen(false)
    }

    function onScroll() {
      setScrolled(window.scrollY > 28)
    }

    onScroll()
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      timers.current.forEach((id) => window.clearTimeout(id))
      window.removeEventListener('keydown', onKeydown)
      window.removeEventListener('scroll', onScroll)
      destroySmoothScroll()
    }
  }, [])

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        跳至主要内容
      </a>

      {showPreloader ? <Preloader onIntro={onIntro} onDone={onPreloaderDone} /> : null}

      <CustomCursor />
      <GrainOverlay />
      <RouteWipe ref={wipe} />
      <div className={`top-shade${scrolled ? ' is-on' : ''}`} aria-hidden="true" />
      <SiteHeader />
      <MenuOverlay />

      {isHome && ui.introDone && pageReady ? <ScrollProgress /> : null}

      <main
        id="main"
        className="site-main"
        inert={ui.menuOpen || undefined}
        aria-hidden={ui.menuOpen || undefined}
      >
        <div key={rendered.pathname} className={`page-wrap${leaving ? ' is-leaving' : ''}`}>
          <AppRoutes location={rendered} />
        </div>
      </main>
    </div>
  )
}
