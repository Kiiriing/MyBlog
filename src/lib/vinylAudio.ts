/* 黑胶播放器的音频引擎。
   曲目现在是真实音频：每首歌是 public/art/music 下的 mp3，
   先用 HTMLAudioElement 解码，再经 MediaElementSource → 母带增益 → 频谱分析 → 输出。
   这样播放 / 暂停 / 换曲 / 音量 / 进度都和真唱片一致，频谱柱状图读到的也是真实波形；
   换曲时把母带增益压下去再拉起，听感上像把唱针抬起又落下。

   曲目表按站点的气质排成一张「唱片」，side 里的编号就是曲序。
   现在放了三首真实文件，后面的位置先空着：
   有新歌时把 mp3 放进 public/art/music（封面可放 public/art/music/covers），
   再往 vinylTracks 里补一个 { file, cover, duration } 即可。

   注意文件名里的 # 会被当成 URL fragment，中文与 emoji 也要转义，
   所以统一交给 musicAsset() 做 encodeURIComponent。 */

export type VinylTrack = {
  title: string
  cn?: string
  side: string
  /** public/art/music 下的文件名 */
  file: string
  /** 内圈标签上的封面（public 下的完整路径）；没有就退回原来的编号标签 */
  cover?: string
  /** 元数据加载前的兜底长度（秒）：让进度条一开始就有刻度 */
  duration?: number
}

const MUSIC_DIR = '/art/music/'

export function musicAsset(file: string) {
  return MUSIC_DIR + encodeURIComponent(file)
}

export const vinylTracks: VinylTrack[] = [
  {
    title: '☔️',
    cn: 'Radiax',
    side: 'SIDE A · 01',
    file: 'Radiax - ☔️.mp3',
    cover: '/art/music/covers/radiax-umbrella.jpg',
    duration: 117.13
  },
  {
    title: 'Cry For Me',
    cn: 'feat. 愛海 · Michita',
    side: 'SIDE A · 02',
    file: 'CryForMe.Feat.愛海.-Michita#2CbowT.mp3',
    cover: '/art/music/covers/cry-for-me.svg',
    duration: 303.05
  },
  {
    /* 文件名是这首歌唯一能读到的信息（mp3 里没写 ID3 标签），封面也是照着同一个气质画的 */
    title: '溯',
    cn: 'Sù',
    side: 'SIDE A · 03',
    file: '溯.mp3',
    cover: '/art/music/covers/su.svg',
    duration: 192.03
  }
  /* 后面的曲位先空着：加歌时在这里补 { title, cn, side, file, cover, duration } */
]

export class VinylEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaElementAudioSourceNode | null = null
  private noise: GainNode | null = null
  private audio: HTMLAudioElement | null = null

  private index = 0
  private volume = 0.7
  private playing = false
  private loadedFile = ''
  private switchTimer = 0
  /* 换曲淡出期间旧曲还在响：进度与长度都先按「新曲刚开始」算，
     否则轮询会把旧曲末尾误判成新曲播完，连着跳两首 */
  private switching = false
  private bins: Uint8Array | null = null
  private unlock: (() => void) | null = null

  /** 真实音频读到元数据后把长度报给组件，进度与时间显示据此换成实际的时长 */
  onDuration: ((seconds: number) => void) | null = null

  constructor() {
    this.handleDuration = this.handleDuration.bind(this)
  }

  get isPlaying() {
    return this.playing
  }

  get trackIndex() {
    return this.index
  }

  /** 当前曲子的长度（秒）：元数据没到之前先用曲目表里的兜底值 */
  get duration() {
    if (this.switching) return vinylTracks[this.index]?.duration ?? 0
    const audio = this.audio
    if (audio && Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration
    return vinylTracks[this.index]?.duration ?? 0
  }

  /** 浏览器自动播放策略会让 AudioContext 停在 suspended；true 表示声音真的在出 */
  get audible() {
    const audio = this.audio
    return Boolean(
      this.ctx &&
        this.ctx.state === 'running' &&
        audio &&
        !audio.paused &&
        audio.readyState >= 2
    )
  }

  /** 当前播放到的秒数（暂停时停在暂停点） */
  position() {
    if (this.switching) return 0
    const audio = this.audio
    if (!audio) return 0
    const total = this.duration
    const at = Number.isFinite(audio.currentTime) ? audio.currentTime : 0
    return Math.max(0, total > 0 ? Math.min(total, at) : at)
  }

  /** 换曲：播放中先把母带压下去，等 0.18s 再换源、起播、把音量拉回来 */
  setTrack(index: number) {
    this.clearSwitch()
    const next = Math.max(0, Math.min(vinylTracks.length - 1, index))
    this.index = next

    const audio = this.ensureAudio()
    if (!audio) return

    if (!this.playing) {
      this.load()
      return
    }

    const ctx = this.ctx
    if (ctx && this.master) this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.06)
    this.switching = true
    this.switchTimer = window.setTimeout(() => {
      this.switchTimer = 0
      this.switching = false
      const audioEl = this.audio
      const track = vinylTracks[this.index]
      /* 又切回同一首时源没变，手动把旧曲的播放头归零，否则会接着上一轮的位置继续 */
      if (audioEl && track && this.loadedFile === track.file) {
        try {
          audioEl.currentTime = 0
        } catch {
          /* 元数据还没就绪时交给后续的 load 处理 */
        }
      }
      this.load()
      this.startAudio()
      const current = this.ctx
      if (current && this.master) {
        this.master.gain.setTargetAtTime(this.volume, current.currentTime, 0.14)
      }
    }, 180)
  }

  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value))
    if (!this.ctx || !this.master) return
    this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.12)
  }

  /** 拖动进度条：写 currentTime，元数据还没到时先忽略 */
  seek(value: number) {
    const audio = this.audio
    if (!audio) return
    const total = this.duration
    const target = Math.max(0, total > 0 ? Math.min(value, Math.max(0, total - 0.08)) : value)
    try {
      audio.currentTime = target
    } catch {
      return
    }
    if (this.playing && audio.paused) this.startAudio()
  }

  play() {
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    if (this.playing) return

    this.playing = true
    this.clearSwitch()

    /* 没有用户手势时浏览器只允许建上下文、不放声：录一次手势，之后自动接上 */
    if (ctx.state === 'suspended') {
      void ctx.resume()
      this.armUnlock(ctx)
    }

    this.master.gain.setTargetAtTime(this.volume, ctx.currentTime, 0.18)
    this.startNoise()
    this.load()
    this.startAudio()
  }

  pause() {
    if (!this.playing) return
    this.playing = false
    this.clearSwitch()
    this.audio?.pause()

    const ctx = this.ctx
    if (ctx && this.master) this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.12)
    if (ctx && this.noise) this.noise.gain.setTargetAtTime(0, ctx.currentTime, 0.16)
  }

  /* 频谱：供组件画柱状图。返回的数组是复用的，调用方只读不存。 */
  levels() {
    const analyser = this.analyser
    if (!analyser) return null
    if (!this.bins || this.bins.length !== analyser.frequencyBinCount) {
      this.bins = new Uint8Array(analyser.frequencyBinCount)
    }
    analyser.getByteFrequencyData(this.bins as unknown as Uint8Array<ArrayBuffer>)
    return this.bins
  }

  dispose() {
    this.clearSwitch()
    this.dropUnlock()
    this.playing = false

    const audio = this.audio
    if (audio) {
      audio.pause()
      audio.removeEventListener('loadedmetadata', this.handleDuration)
      audio.removeEventListener('durationchange', this.handleDuration)
      audio.removeAttribute('src')
      audio.load()
    }

    this.source?.disconnect()
    this.noise?.disconnect()
    this.master?.disconnect()
    this.source = null
    this.noise = null
    this.audio = null
    this.loadedFile = ''

    const ctx = this.ctx
    this.ctx = null
    this.master = null
    this.analyser = null
    this.bins = null
    void ctx?.close()
  }

  /* Internals ------------------------------------------------------------- */

  private ensure() {
    if (this.ctx) return this.ctx
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null

    const ctx = new Ctor()
    const master = ctx.createGain()
    master.gain.value = 0

    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.82

    master.connect(analyser)
    analyser.connect(ctx.destination)

    const audio = this.ensureAudio()
    if (audio) {
      const source = ctx.createMediaElementSource(audio)
      source.connect(master)
      this.source = source
    }

    this.ctx = ctx
    this.master = master
    this.analyser = analyser
    return ctx
  }

  private ensureAudio() {
    if (this.audio) return this.audio
    const audio = new Audio()
    audio.preload = 'auto'
    audio.volume = 1
    audio.addEventListener('loadedmetadata', this.handleDuration)
    audio.addEventListener('durationchange', this.handleDuration)
    this.audio = audio
    this.load()
    return audio
  }

  private handleDuration() {
    const total = this.duration
    if (total > 0) this.onDuration?.(total)
  }

  /** 换源：同一个文件不重复 load，避免白白重解码一遍 */
  private load() {
    const audio = this.audio
    const track = vinylTracks[this.index]
    if (!audio || !track) return
    if (this.loadedFile === track.file) return
    this.loadedFile = track.file
    audio.src = musicAsset(track.file)
    audio.load()
    /* 换源后把播放头钉回开头：新源在元数据到达前可能沿用旧曲的 currentTime，
       轮询就会把新曲当成「已经播完」，连着跳两首 */
    try {
      audio.currentTime = 0
    } catch {
      /* 元数据还没到，忽略即可 */
    }
    this.handleDuration()
  }

  private startAudio() {
    const audio = this.audio
    if (!audio) return

    const ctx = this.ctx
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume()
      this.armUnlock(ctx)
    }

    const started = audio.play()
    if (started && typeof started.catch === 'function') {
      started.catch(() => {
        /* 被自动播放策略拦下：等一次手势，再试一次 */
        if (this.ctx) this.armUnlock(this.ctx)
      })
    }
  }

  private clearSwitch() {
    if (this.switchTimer) window.clearTimeout(this.switchTimer)
    this.switchTimer = 0
    this.switching = false
  }

  /** 浏览器要求先有一次用户手势才允许出声，这里等第一次点击 / 按键 */
  private armUnlock(ctx: AudioContext) {
    if (this.unlock) return
    const unlock = () => {
      this.dropUnlock()
      if (ctx.state === 'suspended') void ctx.resume()
      const audio = this.audio
      if (this.playing && audio && audio.paused) void audio.play().catch(() => {})
    }
    this.unlock = unlock
    window.addEventListener('pointerdown', unlock, { passive: true })
    window.addEventListener('keydown', unlock)
    window.addEventListener('touchstart', unlock, { passive: true })
  }

  private dropUnlock() {
    const unlock = this.unlock
    if (!unlock) return
    this.unlock = null
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
    window.removeEventListener('touchstart', unlock)
  }

  private startNoise() {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return

    if (!this.noise) {
      const source = ctx.createBufferSource()
      source.buffer = this.noiseBuffer(ctx)
      source.loop = true

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 2400
      filter.Q.value = 0.4

      const gain = ctx.createGain()
      gain.gain.value = 0

      source.connect(filter)
      filter.connect(gain)
      gain.connect(master)
      source.start()

      this.noise = gain
    }

    this.noise.gain.setTargetAtTime(0.5, ctx.currentTime, 0.3)
  }

  /** 黑胶底噪：连续的低幅噪声 + 稀疏的针脚噼啪 */
  private noiseBuffer(ctx: AudioContext) {
    const length = Math.floor(ctx.sampleRate * 1.8)
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.012
    }

    for (let i = 0; i < 40; i += 1) {
      const at = Math.floor(Math.random() * length)
      const amp = 0.06 + Math.random() * 0.18
      for (let j = 0; j < 36; j += 1) {
        const k = at + j
        if (k >= length) break
        data[k] += amp * Math.exp(-j / 8) * (Math.random() * 2 - 1)
      }
    }

    return buffer
  }
}
