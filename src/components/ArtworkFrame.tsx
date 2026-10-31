import { useEffect, useRef, type ReactNode } from 'react'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../composables/useSmoothScroll'
import '../styles/components/ArtworkFrame.css'

type Props = {
  src: string
  alt?: string
  ratio?: string
  parallax?: number
  eager?: boolean
  imageClass?: string
  children?: ReactNode
}

export default function ArtworkFrame({
  src,
  alt = '',
  ratio = '4 / 5',
  parallax = 7,
  eager = false,
  imageClass = '',
  children
}: Props) {
  const frame = useRef<HTMLElement>(null)
  const image = useRef<HTMLImageElement>(null)
  const tween = useRef<any>(null)

  useEffect(() => {
    if (prefersReducedMotion() || !image.current || !frame.current) return

    tween.current = gsap.fromTo(
      image.current,
      { yPercent: -parallax },
      {
        yPercent: parallax,
        ease: 'none',
        scrollTrigger: {
          trigger: frame.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      }
    )

    return () => {
      tween.current?.scrollTrigger?.kill()
      tween.current?.kill()
    }
  }, [parallax])

  return (
    <figure ref={frame} className="artwork" style={{ aspectRatio: ratio }}>
      <div className="artwork__media">
        <img
          ref={image}
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable="false"
          className={imageClass}
        />
      </div>
      <div className="artwork__toast" aria-hidden="true" />
      {children}
    </figure>
  )
}
