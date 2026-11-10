import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { CSSProperties, ReactNode, Ref } from 'react'
import { Camera, Geometry, Mesh, Program, Renderer, Texture } from 'ogl'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../composables/useSmoothScroll'
import '../styles/components/PassageGallery.css'

/* 通道画廊（Passage Gallery 的等价实现）。
   一条由照片砌成的方形隧道：相机停在原地，整条隧道朝镜头流过来，
   四面墙上按格子铺照片与渐变强调块，远处按距离融进背景色。
   指针可以看、拖动、按住加速；点照片会从墙上飞出来放大。

   内容与官方一致用「格子 + 环」的确定性布局：每个 (ring, slot) 的随机数由 seed 决定，
   所以回到同一圈时照片还在原来的位置，CPU 端做拾取时也能算出同一块砖。 */

const CELL = 1
const TUNNEL_HALF_W_DEFAULT = 2.5
const TUNNEL_HALF_H_DEFAULT = 2
const RINGS = 96

export type PassageItem = { src: string; alt: string; title?: string }

export type PassageGalleryHandle = {
  /** 把已经飞出来的照片放回墙上 */
  close: () => void
  /** 让相机再往前推一段（单位：格） */
  travel: (cells: number) => void
}

type Props = {
  items?: PassageItem[]
  colors?: [string, string]
  backgroundColor?: string
  lanes?: number
  gap?: number
  radius?: number
  photoFill?: number
  accentFill?: number
  lineOpacity?: number
  fog?: number
  speed?: number
  boost?: number
  blur?: number
  look?: number
  fov?: number
  hover?: number
  focusOnClick?: boolean
  captions?: boolean
  wheel?: boolean
  interactive?: boolean
  seed?: number
  paused?: boolean
  dpr?: number
  ariaLabel?: string
  onFocusChange?: (item: PassageItem | null, index: number) => void
  ref?: Ref<PassageGalleryHandle>
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

const FALLBACK_ITEMS: PassageItem[] = [
  { src: '/art/mywork/honor-1.jpg', alt: 'Award ceremony', title: 'Award ceremony' },
  { src: '/art/mywork/honor-2.jpg', alt: 'Trophy and medal', title: 'Trophy and medal' },
  { src: '/art/mywork/honor-3.jpg', alt: 'Hackathon night', title: 'Hackathon night' },
  { src: '/art/mywork/honor-4.jpg', alt: 'Certificate', title: 'Certificate' },
  { src: '/art/mywork/honor-5.jpg', alt: 'On stage', title: 'On stage' },
  { src: '/art/mywork/honor-6.jpg', alt: 'Volunteering', title: 'Volunteering' }
]

/* 与官方一样的确定性随机：同一格永远得到同一个结果 */
function hashRandom(ring: number, slot: number, seed: number) {
  let h = Math.imul(ring | 0, 374761393) ^ Math.imul(slot | 0, 668265263) ^ Math.imul(seed | 0, 1442695041)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '').trim()
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value.padEnd(6, '0').slice(0, 6)
  const n = Number.parseInt(full, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

type Cell = { x: number; y: number; nx: number; ny: number; nz: number }

type Layout = {
  cellsPerRing: number
  lanes: number
  rows: number
  halfW: number
  halfH: number
  cellAt: (slot: number) => Cell
  slotAt: (wall: 'floor' | 'ceiling' | 'left' | 'right', index: number) => number
}

function makeLayout(lanes: number): Layout {
  const laneCount = Math.max(2, Math.round(lanes))
  const wallRows = Math.max(2, Math.round(laneCount * 0.8))
  const halfW = (laneCount * CELL) / 2
  const halfH = (wallRows * CELL) / 2

  const cellAt = (slot: number): Cell => {
    if (slot < laneCount) {
      return { x: -halfW + slot * CELL + CELL / 2, y: -halfH, nx: 0, ny: 1, nz: 0 }
    }
    if (slot < laneCount * 2) {
      const i = slot - laneCount
      return { x: -halfW + i * CELL + CELL / 2, y: halfH, nx: 0, ny: -1, nz: 0 }
    }
    if (slot < laneCount * 2 + wallRows) {
      const j = slot - laneCount * 2
      return { x: -halfW, y: -halfH + j * CELL + CELL / 2, nx: 1, ny: 0, nz: 0 }
    }
    const j = slot - laneCount * 2 - wallRows
    return { x: halfW, y: -halfH + j * CELL + CELL / 2, nx: -1, ny: 0, nz: 0 }
  }

  return {
    cellsPerRing: laneCount * 2 + wallRows * 2,
    lanes: laneCount,
    rows: wallRows,
    halfW,
    halfH,
    cellAt,
    slotAt(wall, index) {
      if (wall === 'floor') return index
      if (wall === 'ceiling') return laneCount + index
      if (wall === 'left') return laneCount * 2 + index
      return laneCount * 2 + wallRows + index
    }
  }
}

const VERTEX = /* glsl */ `
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

attribute vec3 position;
attribute vec2 uv;
attribute vec2 atlas;
attribute vec3 normal;
attribute float kind;
attribute float seed;
attribute float ring;
attribute float id;

uniform float uTravel;
uniform float uRings;
uniform float uHoverId;
uniform float uHoverAmt;
uniform float uHoverPrevId;
uniform float uHoverPrevAmt;
uniform float uHoverLift;

varying vec2 vUv;
varying vec2 vAtlas;
varying float vKind;
varying float vSeed;
varying float vId;
varying float vDepth;

void main() {
  /* 每一环按当前行程绕回来：镜头不动，隧道自己往前走 */
  float zc = -mod(ring - uTravel, uRings) - 0.5;
  vec3 pos = vec3(position.xy, zc + position.z);
  float lift = 0.0;
  if (abs(id - uHoverId) < 0.5) lift += uHoverAmt;
  if (abs(id - uHoverPrevId) < 0.5) lift += uHoverPrevAmt;
  pos += normal * uHoverLift * clamp(lift, 0.0, 1.0);

  vUv = uv;
  vAtlas = atlas;
  vKind = kind;
  vSeed = seed;
  vId = id;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`

const FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec2 vAtlas;
varying float vKind;
varying float vSeed;
varying float vId;
varying float vDepth;

uniform sampler2D uAtlas;
uniform vec2 uAtlasCell;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uBg;
uniform float uGap;
uniform float uRadius;
uniform float uLineOpacity;
uniform float uFog;
uniform float uBlur;
uniform float uSpeed;
uniform float uHover;
uniform float uHoverId;
uniform float uHoverAmt;
uniform float uHoverPrevId;
uniform float uHoverPrevAmt;
uniform vec2 uResolution;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, vec2(0.0))) - r;
}

void main() {
  vec2 p = vUv - 0.5;
  float halfTile = 0.5 - uGap * 0.5;
  float dist = roundedBox(p, vec2(halfTile), uRadius * 0.5);
  /* 不用 fwidth（GLSL 1.0 里要额外扩展）：按深度估一个像素宽度，远处自然变软 */
  float aa = 0.003 + vDepth * 0.0032;
  float tileMask = 1.0 - smoothstep(-aa, aa, dist);

  vec3 col = uBg;

  if (vKind > 1.5) {
    /* 渐变强调块：两块色按随机角度抹开，再叠一点同心起伏，像一块被晕开的颜料 */
    vec2 q = vUv - 0.5;
    float ang = vSeed * 6.2831853;
    vec2 dir = vec2(cos(ang), sin(ang));
    float wave = sin(length(q) * 7.0 - vSeed * 9.0) * 0.12;
    float t = clamp(dot(q, dir) * 1.2 + 0.5 + wave + 0.14 * sin(q.x * 5.0 + vSeed * 11.0), 0.0, 1.0);
    col = mix(uColorA, uColorB, smoothstep(0.0, 1.0, t));
  } else if (vKind > 0.5) {
    vec2 uv = vAtlas + vUv * uAtlasCell;
    float amt = uBlur * clamp(abs(uSpeed), 0.0, 12.0) * 0.0022;
    if (amt > 0.0006) {
      /* 高速时沿镜头放射方向做四次重采样，读起来像运动模糊 */
      vec2 dir = normalize(gl_FragCoord.xy - uResolution * 0.5 + vec2(0.0001));
      vec3 sum = vec3(0.0);
      for (int i = 0; i < 4; i++) {
        float k = (float(i) / 3.0 - 0.5) * amt;
        sum += texture2D(uAtlas, uv + dir * k).rgb;
      }
      col = sum * 0.25;
    } else {
      col = texture2D(uAtlas, uv).rgb;
    }
  }

  col = mix(uBg, col, tileMask);

  /* 选中：新旧两块砖各有一个缓动中的权重，换砖时不会硬切 */
  float hov = 0.0;
  if (abs(vId - uHoverId) < 0.5) hov += uHoverAmt;
  if (abs(vId - uHoverPrevId) < 0.5) hov += uHoverPrevAmt;
  hov = clamp(hov, 0.0, 1.0) * uHover;

  if (hov > 0.001) {
    /* 只描一圈白边：不改照片本身的颜色，也不压暗周围 */
    float border = smoothstep(0.02, 0.0, abs(dist));
    col = mix(col, vec3(1.0), border * 0.92 * hov);
  }

  /* 头发丝一样的网格：宽度随深度收放，远处不会糊成一片 */
  float edge = 0.5 - max(abs(p.x), abs(p.y));
  float w = 0.0026 + vDepth * 0.0016;
  float line = 1.0 - smoothstep(0.0, w, edge);
  col = mix(col, mix(uBg, vec3(1.0), 0.55), line * uLineOpacity);

  /* 越远越黑：尽头直接没入看不见底的黑 */
  float fogF = clamp(exp(-vDepth * 0.19 * uFog), 0.0, 1.0);
  col = mix(vec3(0.0), col, fogF);

  gl_FragColor = vec4(col, 1.0);
}
`

export default function PassageGallery({
  items = FALLBACK_ITEMS,
  colors = ['#5227FF', '#FF9FFC'],
  backgroundColor = '#0a0a0a',
  lanes = 5,
  gap = 0.1,
  radius = 0.06,
  photoFill = 0.3,
  accentFill = 0.06,
  lineOpacity = 0.12,
  fog = 1,
  speed = 0.6,
  boost = 10,
  blur = 1,
  look = 1,
  fov = 72,
  hover = 1,
  focusOnClick = true,
  captions = true,
  wheel = true,
  interactive = true,
  seed = 0,
  paused = false,
  dpr = 2,
  ariaLabel = 'Photo tunnel. Drag or hold to travel, click a photo to open it.',
  onFocusChange,
  ref,
  className = '',
  style,
  children
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const captionRef = useRef<HTMLDivElement>(null)

  const [focused, setFocused] = useState<{ item: PassageItem; index: number; rect: DOMRect } | null>(
    null
  )

  const live = useRef({
    travel: 0,
    boostHeld: false,
    boostAmt: 0,
    pointerX: 0,
    pointerY: 0,
    hoverId: -1,
    hoverTarget: -1,
    hoverPrev: -1,
    hoverAmt: 0,
    hoverPrevAmt: 0,
    open: false,
    meshX: 0,
    meshY: 0
  })

  const close = useCallback(() => {
    const card = cardRef.current
    const host = hostRef.current
    if (!card || !host) {
      setFocused(null)
      return
    }
    gsap.killTweensOf([card, captionRef.current].filter(Boolean) as Element[])
    gsap.to(card, {
      opacity: 0,
      scale: 0.94,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => setFocused(null)
    })
    if (captionRef.current) gsap.to(captionRef.current, { opacity: 0, duration: 0.18 })
  }, [])

  const push = useCallback((cells: number) => {
    live.current.travel += cells
  }, [])

  useImperativeHandle(ref, () => ({ close, travel: push }), [close, push])

  /* 从墙上飞出来：先算出那块砖在屏幕上的位置，再把它拉到画面中央 */
  const openItem = useCallback(
    (item: PassageItem, index: number, rect: DOMRect) => {
      if (!focusOnClick) return
      const host = hostRef.current
      if (!host) return
      const box = host.getBoundingClientRect()
      const start = new DOMRect(
        rect.left - box.left,
        rect.top - box.top,
        rect.width,
        rect.height
      )
      live.current.open = true
      setFocused({ item, index, rect })
      onFocusChange?.(item, index)

      requestAnimationFrame(() => {
        const card = cardRef.current
        if (!card) return
        const size = Math.min(box.width * 0.62, box.height * 0.78, 560)
        const targetX = (box.width - size) / 2
        const targetY = (box.height - size) / 2 - 10
        gsap.killTweensOf(card)
        gsap.fromTo(
          card,
          { x: start.left, y: start.top, width: start.width, height: start.height, opacity: 1 },
          {
            x: targetX,
            y: targetY,
            width: size,
            height: size,
            duration: prefersReducedMotion() ? 0.01 : 0.72,
            ease: 'expo.out'
          }
        )
        if (captionRef.current) {
          gsap.fromTo(
            captionRef.current,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.45, delay: 0.2, ease: 'power2.out' }
          )
        }
      })
    },
    [focusOnClick, onFocusChange]
  )

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return

    const reduced = prefersReducedMotion()
    const layout = makeLayout(lanes)
    const config = {
      photoFill,
      accentFill,
      seed,
      colors,
      backgroundColor,
      gap,
      radius,
      lineOpacity,
      fog,
      blur,
      hover,
      fov,
      look,
      speed,
      boost,
      wheel,
      interactive,
      paused,
      items
    }
    let disposed = false
    let visible = true
    let raf = 0
    let last = performance.now()

    /* 每一格是什么：照片 / 渐变块 / 空的。拾取与建模共用同一个判断 */
    function kindOf(ring: number, slot: number) {
      const r = hashRandom(ring, slot, config.seed)
      if (r < config.photoFill) {
        const pickItem = hashRandom(ring + 7919, slot + 104729, config.seed + 31)
        return { kind: 1, item: Math.min(items.length - 1, Math.floor(pickItem * items.length)) }
      }
      if (r < config.photoFill + config.accentFill) return { kind: 2, item: -1 }
      return { kind: 0, item: -1 }
    }

    const atlasSize = 512
    const cols = Math.max(1, Math.min(3, Math.ceil(Math.sqrt(Math.max(1, items.length)))))
    const rows = Math.max(1, Math.ceil(items.length / cols))
    const atlasCanvas = document.createElement('canvas')
    atlasCanvas.width = cols * atlasSize
    atlasCanvas.height = rows * atlasSize
    const atlasCtx = atlasCanvas.getContext('2d')

    const renderer = new Renderer({ canvas, dpr: Math.min(window.devicePixelRatio || 1, dpr), alpha: false, antialias: true })
    const gl = renderer.gl
    const bg = hexToRgb(backgroundColor)
    gl.clearColor(bg[0], bg[1], bg[2], 1)

    let camera = new Camera(gl, { fov, aspect: 1, near: 0.05, far: 300 })

    const placeholder = document.createElement('canvas')
    placeholder.width = 2
    placeholder.height = 2
    const texture = new Texture(gl, {
      image: placeholder,
      generateMipmaps: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR
    })

    const program = new Program(gl, {
      vertex: VERTEX,
      fragment: FRAGMENT,
      /* 镜头在隧道内部，四面墙都要能被看到，不开背面剔除 */
      cullFace: false,
      uniforms: {
        uTravel: { value: 0 },
        uRings: { value: RINGS },
        uHoverId: { value: -1 },
        uHoverAmt: { value: 0 },
        uHoverPrevId: { value: -1 },
        uHoverPrevAmt: { value: 0 },
        uHoverLift: { value: 0.045 * hover },
        uAtlas: { value: texture },
        uAtlasCell: { value: [1 / cols, 1 / rows] },
        uColorA: { value: hexToRgb(colors[0]) },
        uColorB: { value: hexToRgb(colors[1]) },
        uBg: { value: bg },
        uGap: { value: gap },
        uRadius: { value: radius },
        uLineOpacity: { value: lineOpacity },
        uFog: { value: fog },
        uBlur: { value: blur },
        uSpeed: { value: 0 },
        uHover: { value: hover },
        uResolution: { value: [1, 1] }
      }
    })

    /* 建隧道：每一环 18 块砖，四壁各占一段 */
    const perRing = layout.cellsPerRing
    const total = RINGS * perRing
    const positions = new Float32Array(total * 4 * 3)
    const uvs = new Float32Array(total * 4 * 2)
    const atlases = new Float32Array(total * 4 * 2)
    const normals = new Float32Array(total * 4 * 3)
    const kinds = new Float32Array(total * 4)
    const seeds = new Float32Array(total * 4)
    const rings = new Float32Array(total * 4)
    const ids = new Float32Array(total * 4)
    const indices = new Uint32Array(total * 6)

    let v = 0
    let idx = 0
    for (let ring = 0; ring < RINGS; ring += 1) {
      for (let slot = 0; slot < perRing; slot += 1) {
        const cell = layout.cellAt(slot)
        const info = kindOf(ring, slot)
        const tileSeed = hashRandom(ring + 13, slot + 7, config.seed + 5)
        const id = ring * perRing + slot
        const col = info.kind === 1 && items.length ? info.item % cols : 0
        const row = info.kind === 1 && items.length ? Math.floor(info.item / cols) : 0
        const au = info.kind === 1 ? col / cols : 0
        const av = info.kind === 1 ? 1 - (row + 1) / rows : 0

        const onFloorOrCeiling = slot < layout.lanes * 2
        const corners = onFloorOrCeiling
          ? [
              [cell.x - 0.5, cell.y, 0.5, 0, 0],
              [cell.x + 0.5, cell.y, 0.5, 1, 0],
              [cell.x + 0.5, cell.y, -0.5, 1, 1],
              [cell.x - 0.5, cell.y, -0.5, 0, 1]
            ]
          : [
              [cell.x, cell.y - 0.5, 0.5, 0, 0],
              [cell.x, cell.y - 0.5, -0.5, 1, 0],
              [cell.x, cell.y + 0.5, -0.5, 1, 1],
              [cell.x, cell.y + 0.5, 0.5, 0, 1]
            ]

        const base = v
        for (const corner of corners) {
          positions[v * 3] = corner[0]
          positions[v * 3 + 1] = corner[1]
          positions[v * 3 + 2] = corner[2]
          uvs[v * 2] = corner[3]
          uvs[v * 2 + 1] = corner[4]
          atlases[v * 2] = au
          atlases[v * 2 + 1] = av
          normals[v * 3] = cell.nx
          normals[v * 3 + 1] = cell.ny
          normals[v * 3 + 2] = cell.nz
          kinds[v] = info.kind
          seeds[v] = tileSeed
          rings[v] = ring
          ids[v] = id
          v += 1
        }
        indices[idx] = base
        indices[idx + 1] = base + 1
        indices[idx + 2] = base + 2
        indices[idx + 3] = base
        indices[idx + 4] = base + 2
        indices[idx + 5] = base + 3
        idx += 6
      }
    }

    const geometry = new Geometry(gl, {
      position: { size: 3, data: positions },
      uv: { size: 2, data: uvs },
      atlas: { size: 2, data: atlases },
      normal: { size: 3, data: normals },
      kind: { size: 1, data: kinds },
      seed: { size: 1, data: seeds },
      ring: { size: 1, data: rings },
      id: { size: 1, data: ids },
      index: { data: indices }
    })
    const mesh = new Mesh(gl, { geometry, program })

    /* 图集：把每张照片画进一张贴图，一次 draw call 就能铺满整条隧道 */
    if (atlasCtx) {
      atlasCtx.fillStyle = '#000'
      atlasCtx.fillRect(0, 0, atlasCanvas.width, atlasCanvas.height)
    }
    Promise.all(
      items.map(
        (item, i) =>
          new Promise<void>((resolve) => {
            const img = new Image()
            img.onload = () => {
              if (disposed) return resolve()
              if (atlasCtx) {
                const x = (i % cols) * atlasSize
                const y = Math.floor(i / cols) * atlasSize
                atlasCtx.drawImage(img, x, y, atlasSize, atlasSize)
              }
              resolve()
            }
            img.onerror = () => resolve()
            img.src = item.src
          })
      )
    ).then(() => {
      if (disposed) return
      texture.image = atlasCanvas
      texture.generateMipmaps = true
      texture.minFilter = gl.LINEAR_MIPMAP_LINEAR
      texture.needsUpdate = true
    })

    function resize() {
      const width = Math.max(1, host.clientWidth)
      const height = Math.max(1, host.clientHeight)
      renderer.setSize(width, height)
      camera = new Camera(gl, { fov, aspect: width / height, near: 0.05, far: 300 })
      program.uniforms.uResolution.value = [width * renderer.dpr, height * renderer.dpr]
    }

    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    const visibility = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting)
        last = performance.now()
      },
      { rootMargin: '120px' }
    )
    visibility.observe(host)

    /* 拾取：从镜头拉一条射线，和四面墙求交，得出落在哪一环哪一格 */
    function pick(clientX: number, clientY: number) {
      const box = canvas.getBoundingClientRect()
      const nx = ((clientX - box.left) / box.width) * 2 - 1
      const ny = 1 - ((clientY - box.top) / box.height) * 2
      const tan = Math.tan((fov * Math.PI) / 360)
      const aspect = box.width / box.height
      const dx = nx * aspect * tan
      const dy = ny * tan
      const ox = -live.current.meshX
      const oy = -live.current.meshY

      type Hit = { t: number; x: number; y: number; z: number; wall: 'floor' | 'ceiling' | 'left' | 'right' }
      let hit: Hit | null = null

      const consider = (t: number, wall: Hit['wall']) => {
        if (!(t > 0.4) || !Number.isFinite(t)) return
        const x = ox + dx * t
        const y = oy + dy * t
        const z = -t
        if (Math.abs(x) > layout.halfW + 1e-4 || Math.abs(y) > layout.halfH + 1e-4) return
        if (!hit || t < hit.t) hit = { t, x, y, z, wall }
      }

      if (Math.abs(dx) > 1e-6) {
        consider((layout.halfW - ox) / dx, 'right')
        consider((-layout.halfW - ox) / dx, 'left')
      }
      if (Math.abs(dy) > 1e-6) {
        consider((layout.halfH - oy) / dy, 'ceiling')
        consider((-layout.halfH - oy) / dy, 'floor')
      }
      if (!hit) return null

      const target = hit as Hit
      const ringRaw = Math.round(-target.z - 0.5 + live.current.travel) % RINGS
      const ring = (ringRaw + RINGS) % RINGS

      let index = 0
      if (target.wall === 'floor' || target.wall === 'ceiling') {
        index = Math.min(layout.lanes - 1, Math.max(0, Math.floor((target.x + layout.halfW) / CELL)))
      } else {
        index = Math.min(layout.rows - 1, Math.max(0, Math.floor((target.y + layout.halfH) / CELL)))
      }
      const slot = layout.slotAt(target.wall, index)
      const cell = layout.cellAt(slot)
      const m = (((ring - live.current.travel) % RINGS) + RINGS) % RINGS
      const zc = -(m + 0.5)
      return {
        ring,
        slot,
        cx: cell.x,
        cy: cell.y,
        zc,
        vertical: target.wall === 'left' || target.wall === 'right',
        ...kindOf(ring, slot)
      }
    }

    /* 把隧道坐标投影回屏幕，用来让照片从墙上那一格飞出来 */
    function project(x: number, y: number, z: number) {
      const box = canvas.getBoundingClientRect()
      const cz = Math.max(0.05, -z)
      const tan = Math.tan((fov * Math.PI) / 360)
      const aspect = box.width / box.height
      const cx = x + live.current.meshX
      const cy = y + live.current.meshY
      const ndcX = cx / (aspect * tan * cz)
      const ndcY = cy / (tan * cz)
      return {
        x: box.left + (ndcX * 0.5 + 0.5) * box.width,
        y: box.top + (0.5 - ndcY * 0.5) * box.height
      }
    }

    function tileRect(cx: number, cy: number, zc: number, vertical: boolean) {
      const points: { x: number; y: number }[] = []
      if (vertical) {
        for (const dz of [-0.5, 0.5]) {
          for (const dy of [-0.5, 0.5]) points.push(project(cx, cy + dy, zc + dz))
        }
      } else {
        for (const dz of [-0.5, 0.5]) {
          for (const dx of [-0.5, 0.5]) points.push(project(cx + dx, cy, zc + dz))
        }
      }
      const left = Math.min(...points.map((p) => p.x))
      const right = Math.max(...points.map((p) => p.x))
      const top = Math.min(...points.map((p) => p.y))
      const bottom = Math.max(...points.map((p) => p.y))
      return new DOMRect(left, top, Math.max(1, right - left), Math.max(1, bottom - top))
    }

    /* 指针 ------------------------------------------------------------------ */

    const pointer = { down: false, dragging: false, startX: 0, startY: 0, downAt: 0 }

    function updateLook(clientX: number, clientY: number) {
      const box = canvas.getBoundingClientRect()
      live.current.pointerX = ((clientX - box.left) / box.width) * 2 - 1
      live.current.pointerY = ((clientY - box.top) / box.height) * 2 - 1
    }

    const onPointerMove = (event: PointerEvent) => {
      updateLook(event.clientX, event.clientY)
      if (pointer.down) {
        const dx = event.clientX - pointer.startX
        const dy = event.clientY - pointer.startY
        if (!pointer.dragging && Math.hypot(dx, dy) > 6) pointer.dragging = true
        if (pointer.dragging) {
          const travelDelta = (event.pointerType === 'touch' ? -dx : -dy) * 0.012
          /* 只往前穿行，不做后退 */
          if (travelDelta > 0) live.current.travel += travelDelta
        }
      }
      const found = pick(event.clientX, event.clientY)
      const onPhoto = Boolean(found && found.kind === 1)
      live.current.hoverId = onPhoto && found ? found.ring * perRing + found.slot : -1
      /* 自定义反色圆环只有压在照片上才进入可点状态：把状态挂在画布上，
         由 CustomCursor 读 [data-cursor] 决定是否放大圆环 */
      if (onPhoto !== canvas.hasAttribute('data-cursor')) {
        /* 空值只触发圆环的 active 放大，不出现反色实心圆与文字标签 */
        if (onPhoto) canvas.setAttribute('data-cursor', '')
        else canvas.removeAttribute('data-cursor')
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!interactive) return
      /* 别让拖动变成选中页面文字 */
      event.preventDefault()
      pointer.down = true
      pointer.dragging = false
      pointer.startX = event.clientX
      pointer.startY = event.clientY
      pointer.downAt = performance.now()
      live.current.boostHeld = true
      canvas.setPointerCapture(event.pointerId)
    }

    const onPointerUp = (event: PointerEvent) => {
      if (!pointer.down) return
      const wasDrag = pointer.dragging
      const heldFor = performance.now() - pointer.downAt
      pointer.down = false
      pointer.dragging = false
      live.current.boostHeld = false
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
      /* 拖动过、或按住明显是在加速穿行时，松手只算结束，不打开照片 */
      if (wasDrag || heldFor > 400) return
      const found = pick(event.clientX, event.clientY)
      if (found && found.kind === 1 && found.item >= 0) {
        const rect = tileRect(found.cx, found.cy, found.zc, found.vertical)
        openItem(items[found.item], found.item, rect)
      }
    }

    const onPointerLeave = () => {
      live.current.hoverId = -1
      live.current.pointerX = 0
      live.current.pointerY = 0
      canvas.removeAttribute('data-cursor')
    }

    const onWheel = (event: WheelEvent) => {
      if (!wheel || !interactive) return
      event.preventDefault()
      const delta = event.deltaY * 0.0016
      /* 只往前穿行，不做后退 */
      if (delta > 0) live.current.travel += delta
    }

    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)
    canvas.addEventListener('pointerleave', onPointerLeave)
    if (wheel) canvas.addEventListener('wheel', onWheel, { passive: false })

    /* 渲染循环 -------------------------------------------------------------- */

    const cruise = reduced ? 0 : config.speed

    function render(now: number) {
      raf = requestAnimationFrame(render)
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
      last = now
      if (!visible || document.hidden) return

      const state = live.current

      /* 加速：按住后由慢到快叠上去，松手缓缓落回巡航速度 */
      if (state.boostHeld && !config.paused) {
        state.boostAmt = Math.min(1, state.boostAmt + dt / 1.2)
      } else {
        state.boostAmt = Math.max(0, state.boostAmt - dt / 0.7)
      }
      const boostEase = state.boostAmt * state.boostAmt
      const moving = config.paused ? 0 : cruise * (1 + (config.boost - 1) * boostEase)
      state.travel += moving * dt
      state.travel = ((state.travel % RINGS) + RINGS) % RINGS

      /* 指针看向：整条隧道朝反方向小幅平移，等价于镜头在隧道里挪了一点 */
      const targetX = -state.pointerX * 0.34 * config.look
      const targetY = -state.pointerY * 0.2 * config.look
      state.meshX += (targetX - state.meshX) * Math.min(1, dt * 5)
      state.meshY += (targetY - state.meshY) * Math.min(1, dt * 5)
      mesh.position.x = state.meshX
      mesh.position.y = state.meshY

      /* 选中缓动：当前这块砖渐入，上一块渐出，换砖时不会硬切 */
      if (state.hoverId !== state.hoverTarget) {
        state.hoverPrev = state.hoverTarget
        state.hoverPrevAmt = state.hoverAmt
        state.hoverTarget = state.hoverId
        state.hoverAmt = 0
      }
      const wantHover = state.hoverTarget >= 0 ? 1 : 0
      state.hoverAmt += (wantHover - state.hoverAmt) * (1 - Math.exp(-dt * 7))
      state.hoverPrevAmt *= Math.exp(-dt * 9)
      if (state.hoverPrevAmt < 0.002) {
        state.hoverPrevAmt = 0
        state.hoverPrev = -1
      }

      program.uniforms.uTravel.value = state.travel
      program.uniforms.uHoverId.value = state.hoverTarget
      program.uniforms.uHoverAmt.value = state.hoverAmt
      program.uniforms.uHoverPrevId.value = state.hoverPrev
      program.uniforms.uHoverPrevAmt.value = state.hoverPrevAmt
      program.uniforms.uSpeed.value = moving

      renderer.render({ scene: mesh, camera })
    }
    raf = requestAnimationFrame(render)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      visibility.disconnect()
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('wheel', onWheel)
      geometry.remove()
      program.remove()
      gl.deleteTexture(texture.texture)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lanes,
    items,
    seed,
    photoFill,
    accentFill,
    gap,
    radius,
    lineOpacity,
    fog,
    blur,
    hover,
    fov,
    look,
    speed,
    boost,
    wheel,
    interactive,
    paused,
    dpr,
    colors[0],
    colors[1],
    backgroundColor,
    focusOnClick,
    onFocusChange,
    openItem
  ])

  /* Esc 把照片放回去 */
  useEffect(() => {
    if (!focused) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focused, close])

  const opened = focused
  const total = items.length

  return (
    <div
      ref={hostRef}
      className={`passage-gallery${className ? ` ${className}` : ''}`}
      style={{ backgroundColor, ...style }}
      data-open={opened ? 'true' : 'false'}
    >
      <canvas
        ref={canvasRef}
        className="passage-gallery__canvas"
        role="img"
        aria-label={ariaLabel}
      />

      {children ? <div className="passage-gallery__lead">{children}</div> : null}

      {opened ? (
        <>
          <button
            type="button"
            className="passage-gallery__backdrop"
            aria-label="Close photo"
            onClick={close}
          />
          <div ref={cardRef} className="passage-gallery__card">
            <img src={opened.item.src} alt={opened.item.alt} draggable={false} />
          </div>
          {captions ? (
            <div ref={captionRef} className="passage-gallery__caption mono">
              <span>{opened.item.title || opened.item.alt}</span>
              <span>
                {String(opened.index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
              </span>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
