import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ScrollTrigger } from '../lib/gsap'
import { scrollToSection } from '../composables/useSmoothScroll'
import { useUi } from '../store/ui'
import HeroSection from '../components/HeroSection'
import MarqueeBand from '../components/MarqueeBand'
import ManifestoSection from '../components/ManifestoSection'
import AboutSection from '../components/AboutSection'
import WorksSection from '../components/WorksSection'
import ExperienceSection from '../components/ExperienceSection'
import CredentialsSection from '../components/CredentialsSection'
import JournalSection from '../components/JournalSection'
import SiteFooter from '../components/SiteFooter'
import '../styles/components/HomeView.css'

export default function HomeView() {
  const location = useLocation()
  const ui = useUi()

  useEffect(() => {
    document.title = '陆屿 LU YU — Full-stack Web Developer'
  }, [])

  useEffect(() => {
    if (!location.hash || ui.booting) return
    const id = location.hash.replace(/^#/, '')
    if (!id) return

    const timer = window.setTimeout(() => {
      ScrollTrigger.refresh()
      scrollToSection(id)
    }, 620)

    return () => window.clearTimeout(timer)
  }, [location.hash, ui.booting])

  return (
    <div className="home">
      <HeroSection />
      <MarqueeBand />
      <ManifestoSection />
      <AboutSection />
      <WorksSection />
      <ExperienceSection />
      <CredentialsSection />
      <JournalSection />
      <SiteFooter />
    </div>
  )
}
