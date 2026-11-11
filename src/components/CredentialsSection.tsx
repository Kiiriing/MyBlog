import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../composables/useSmoothScroll'
import { awards, certificates, service } from '../data/profile'
import { site } from '../data/site'
import { useNearViewport } from '../hooks/useNearViewport'
import { useReveal } from '../hooks/useReveal'
import Magnetic from './Magnetic'
import PassageGallery, { type PassageItem } from './PassageGallery'
import '../styles/components/CredentialsSection.css'

/* 荣誉通道：先用 public/art/mywork 里的临时照片，换真图时同名替换即可 */
const passageItems: PassageItem[] = [
  { src: '/art/mywork/honor-1.jpg', alt: '颁奖典礼', title: '国际大学生创新大赛 · 一等奖' },
  { src: '/art/mywork/honor-2.jpg', alt: '奖杯与奖牌', title: '第三届全国技能大赛 · 二等奖' },
  { src: '/art/mywork/honor-3.jpg', alt: '比赛现场', title: '大数据技术服务赛项 · 二等奖' },
  { src: '/art/mywork/honor-4.jpg', alt: '证书细节', title: 'AI 创新编程 · 完赛证书' },
  { src: '/art/mywork/honor-5.jpg', alt: '路演舞台', title: 'ICode 未来编程 · 二等奖' },
  { src: '/art/mywork/honor-6.jpg', alt: '志愿服务', title: '志愿服务 · 20+ hours' }
]

function AwardRow({
  award,
  index
}: {
  award: (typeof awards)[number]
  index: number
}) {
  const ref = useReveal<HTMLLIElement>({ delay: index * 45 })

  return (
    <li ref={ref} className="credentials__award">
      <span className="credentials__award-date mono">{award.date}</span>
      <span className="credentials__award-title">{award.title}</span>
      <span className="credentials__award-level mono">{award.level}</span>
      <span className="credentials__award-mark" aria-hidden="true">
        ✦
      </span>
    </li>
  )
}

function CertificateCard({
  cert,
  index
}: {
  cert: (typeof certificates)[number]
  index: number
}) {
  const ref = useReveal<HTMLLIElement>({ delay: index * 70 })

  return (
    <li ref={ref} className="credentials__cert">
      <span className="credentials__cert-no mono">0{index + 1}</span>
      <span className="credentials__cert-date mono">{cert.date}</span>
      <h3 className="credentials__cert-title">{cert.title}</h3>
      <span className="credentials__cert-issuer mono">{cert.issuer}</span>
      <span className="credentials__cert-mark" aria-hidden="true">
        ✦
      </span>
    </li>
  )
}

export default function CredentialsSection() {
  const section = useRef<HTMLElement>(null)
  const glow = useRef<HTMLDivElement>(null)

  const headReveal = useReveal<HTMLElement>()
  const titleReveal = useReveal<HTMLHeadingElement>()
  const ledeReveal = useReveal<HTMLParagraphElement>({ delay: 70 })
  const awardsReveal = useReveal<HTMLDivElement>()
  const sideReveal = useReveal<HTMLDivElement>({ delay: 80 })
  /* 照片隧道在第六屏：接近视口时才初始化 WebGL，返回首页时不和首屏抢主线程 */
  const [passageHost, passageNear] = useNearViewport<HTMLDivElement>('600px')

  useEffect(() => {
    const host = section.current
    if (!host || !glow.current) return
    if (prefersReducedMotion()) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const xTo = gsap.quickTo(glow.current, 'x', { duration: 1.1, ease: 'power3.out' })
    const yTo = gsap.quickTo(glow.current, 'y', { duration: 1.1, ease: 'power3.out' })

    const onMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect()
      xTo((event.clientX - rect.left - rect.width / 2) * 0.34)
      yTo((event.clientY - rect.top - rect.height / 2) * 0.34)
    }

    host.addEventListener('pointermove', onMove)
    return () => {
      host.removeEventListener('pointermove', onMove)
      gsap.killTweensOf(glow.current)
    }
  }, [])

  return (
    <section
      id="credentials"
      ref={section}
      className="credentials"
      data-section="06"
      data-label="Credentials"
    >
      <div ref={glow} className="credentials__glow" aria-hidden="true" />
      <span className="credentials__ghost" aria-hidden="true">
        HONORS
      </span>

      <div className="shell credentials__inner">
        <header ref={headReveal} className="credentials__head">
          <span className="eyebrow">06 / Credentials · 荣誉</span>
          <div className="credentials__head-meta mono">
            <span>2024 — 2026</span>
            <span>
              {awards.length} awards · {certificates.length} certificates
            </span>
          </div>
        </header>

        <div className="credentials__intro">
          <h2 ref={titleReveal} className="credentials__title">
            <span>Proof of</span>
            <em>the work.</em>
          </h2>

          <div ref={ledeReveal} className="credentials__lede">
            <p>
              八项竞赛与荣誉，四张技能证书，以及超过 20 小时的志愿服务。
              它们不是装饰，而是每一次把想法做成可运行东西的证据。
            </p>
            <div className="credentials__lede-meta mono">
              <span>Competitions / certificates</span>
              <span>Beijing, CN</span>
            </div>
          </div>
        </div>

        <div className="credentials__body">
          <div ref={awardsReveal} className="credentials__awards">
            <div className="credentials__col-head mono">
              <span>Awards &amp; honours</span>
              <span>{String(awards.length).padStart(2, '0')}</span>
            </div>

            <ul className="credentials__award-list">
              {awards.map((award, index) => (
                <AwardRow key={`${award.date}-${award.title}`} award={award} index={index} />
              ))}
            </ul>
          </div>

          <div ref={sideReveal} className="credentials__side">
            <div className="credentials__col-head mono">
              <span>Certificates</span>
              <span>{String(certificates.length).padStart(2, '0')}</span>
            </div>

            <ul className="credentials__cert-list">
              {certificates.map((cert, index) => (
                <CertificateCard key={cert.title} cert={cert} index={index} />
              ))}
            </ul>

            <div className="credentials__service">
              <div className="credentials__service-head mono">
                <span>Volunteer / 志愿</span>
                <span>20+ hours</span>
              </div>
              <div className="credentials__service-body">
                <strong>
                  {service.hours}
                  <span>h</span>
                </strong>
                <p>{service.note}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="credentials__foot">
          <p className="mono">
            Copyright certificate · 1+X · CEAC · E-commerce analyst — available on request.
          </p>
          <Magnetic strength={0.26}>
            <a
              href={`mailto:${site.email}?subject=Credentials%20request`}
              className="credentials__mail"
              data-cursor="Write"
            >
              <span>Request credentials</span>
              <span aria-hidden="true">↗</span>
            </a>
          </Magnetic>
        </div>

        <div className="credentials__passage">
          <div className="credentials__passage-head mono">
            <span>Passage · 荣誉通道</span>
            <span>Hold to boost · Click a photo to open</span>
          </div>
          <div ref={passageHost} className="credentials__passage-frame">
            {passageNear ? (
              <PassageGallery
                items={passageItems}
                colors={['#ff5a2f', '#ffd9a8']}
                backgroundColor="#000000"
                lanes={5}
                gap={0.1}
                radius={0.06}
                photoFill={0.45}
                accentFill={0.07}
                lineOpacity={0.16}
                fog={1}
                speed={0.6}
                boost={12}
                blur={1}
                look={1}
                fov={72}
                hover={1}
                seed={0}
                /* 页面滚动交给 Lenis，隧道自动穿行，按住画布可加速 */
                wheel={false}
                ariaLabel="荣誉通道：一条由照片自动穿行的隧道，按住可加速，点击照片放大。"
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
