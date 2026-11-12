import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ScrollTrigger } from '../lib/gsap'
import { scrollToSection } from '../composables/useSmoothScroll'
import { site } from '../data/site'
import { useUi } from '../store/ui'
import Seo, { SITE_URL } from '../components/Seo'
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

  const personLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.cn,
    alternateName: site.name,
    url: SITE_URL,
    image: `${SITE_URL}/art/avatar-kiiriing.png`,
    email: `mailto:${site.email}`,
    jobTitle: site.role,
    description: '全栈网页开发者，构建从界面、动效到 API 与数据库的完整产品。',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Beijing',
      addressCountry: 'CN'
    },
    sameAs: site.socials.filter((item) => item.href.startsWith('http')).map((item) => item.href),
    knowsAbout: site.stack
  }

  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: `${site.cn} ${site.name}`,
    alternateName: 'LU YU Blog',
    url: SITE_URL,
    inLanguage: 'zh-CN',
    author: { '@type': 'Person', name: site.cn, url: SITE_URL }
  }

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
      <Seo
        title="陆屿 LU YU — Full-stack Web Developer"
        path="/"
        description="陆屿 LU YU — 全栈网页开发者。构建从界面、动效到 API 与数据库的完整产品。"
        image="/art/avatar-kiiriing.png"
        jsonLd={[personLd, websiteLd]}
      />
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
