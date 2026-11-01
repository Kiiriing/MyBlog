/* 黑胶播放器的音频引擎。
   曲目现在是真实音频：每首歌是 public/art/music 下的 mp3，
   先用 HTMLAudioElement 解码，再经 MediaElementSource → 母带增益 → 频谱分析 → 输出。
   这样播放 / 暂停 / 换曲 / 音量 / 进度都和真唱片一致，频谱柱状图读到的也是真实波形；
   换曲时把母带增益压下去再拉起，听感上像把唱针抬起又落下。

   曲目表按站点的气质排成一张「唱片」，side 里的编号就是曲序。
   现在放了十首真实文件，后面的位置先空着：
   有新歌时把 mp3 放进 public/art/music（封面可放 public/art/music/covers），
   再往 vinylTracks 里补一个 { file, cover, duration } 即可。

   素材文件名里不要出现 #：它会被当成 URL fragment，静态服务器只会把请求打到目录上。
   中文、emoji 与空格交给 musicAsset() 的 encodeURIComponent 转义即可。 */

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
    cover: '/art/music/covers/cover-1.jpg',
    duration: 117.13
  },
  {
    title: 'Cry For Me',
    cn: 'feat. 愛海 · Michita',
    side: 'SIDE A · 02',
    file: 'CryForMe.Feat.愛海.-Michita.mp3',
    cover: '/art/music/covers/cover-2.jpg',
    duration: 303.05
  },
  {
    /* 文件名是这首歌唯一能读到的信息（mp3 里没写 ID3 标签） */
    title: '溯',
    cn: 'Sù',
    side: 'SIDE A · 03',
    file: '溯.mp3',
    cover: '/art/music/covers/cover-3.jpg',
    duration: 192.03
  },
  {
    title: 'SPECIALZ',
    cn: 'King Gnu',
    side: 'SIDE A · 04',
    file: 'SPECIALZ-King+Gnu.mp3',
    cover: '/art/music/covers/cover-4.jpg',
    duration: 239.28
  },
  {
    title: 'You Got Me (Mashup)',
    cn: 'MaiGet',
    side: 'SIDE A · 05',
    file: 'MaiGet - You Got Me (Mashup).mp3',
    cover: '/art/music/covers/cover-5.jpg',
    duration: 128.94
  },
  {
    title: 'Turning Around',
    cn: '鸣潮先约电台 · Grabbitz',
    side: 'SIDE A · 06',
    file: 'Turning Around (余烬重燃)-Grabbitz.mp3',
    cover: '/art/music/covers/cover-6.jpg',
    duration: 247.88
  },
  {
    title: '远航星的告别',
    cn: '鸣潮先约电台',
    side: 'SIDE A · 07',
    file: '远航星的告别-鸣潮先约电台.mp3',
    cover: '/art/music/covers/cover-7.jpg',
    duration: 225.07
  },
  {
    title: '小小奇迹',
    cn: '鸣潮先约电台',
    side: 'SIDE A · 08',
    file: '小小奇迹-鸣潮先约电台.mp3',
    cover: '/art/music/covers/cover-8.png',
    duration: 262.74
  },
  {
    title: '反乌托邦 × 拼接遗憾',
    cn: 'Vince丷',
    side: 'SIDE A · 09',
    file: '反乌托邦.拼接遗憾.mp3',
    cover: '/art/music/covers/cover-9.jpg',
    duration: 113.74
  },
  {
    /* 这首的 mp3 里没写 ID3 标签，歌名只能从文件名与封面读出来 */
    title: '人间白首',
    cn: '狐妖小红娘 · 竹业篇插曲',
    side: 'SIDE A · 10',
    file: '人间白首..狐妖小红娘.竹业篇插曲10.mp3',
    cover: '/art/music/covers/cover-10.jpg',
    duration: 252.79
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
  private volume = 0.15
  private playing = false
  private loadedFile = ''
  private switchTimer = 0
  /* 换曲淡出期间旧曲还在响：进度与长度都先按「新曲刚开始」算，
     否则轮询会把旧曲末尾误判成新曲播完，连着跳两首 */
  private switching = false
  private bins: Uint8Array | null = null
  private unlock: (() => void) | null = null
  /* 被自动播放策略拦下后，改成静音起播：时间轴照常走，等手势再把声音接回来 */
  private silent = false
  /* 静音元素也被拦（Chrome 对 <audio> 更严格）时，界面改用本地时钟推进：
     唱片、进度与自动切歌照常走，第一次手势再把声音接到当前位置 */
  private virtual = false
  private virtualBase = 0
  private virtualSince = 0
  private virtualTimer = 0
  /* 本地时钟播放中被暂停时记下的位置，下次起播从这里接上 */
  private resumeAt = 0

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
    const total = this.duration
    if (this.virtual) {
      const at = this.virtualAt()
      return Math.max(0, total > 0 ? Math.min(total, at) : at)
    }
    const audio = this.audio
    if (!audio) return 0
    const at = Number.isFinite(audio.currentTime) ? audio.currentTime : 0
    return Math.max(0, total > 0 ? Math.min(total, at) : at)
  }

  /** 换曲：播放中先把母带压下去，等 0.18s 再换源、起播、把音量拉回来 */
  setTrack(index: number) {
    this.clearSwitch()
    const next = Math.max(0, Math.min(vinylTracks.length - 1, index))
    this.index = next
    /* 换曲时暂停点与本地时钟都归零，新曲从 0:00 开始 */
    this.resumeAt = 0
    if (this.virtual) {
      this.virtualBase = 0
      this.virtualSince = performance.now()
    }

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

  /** 预加载首曲：挂载时就把音频元素与下载 / 解码排进队列，
      预加载结束再 play() 时不用等文件，开声不会先卡一下 */
  preload(index = 0) {
    this.clearSwitch()
    this.index = Math.max(0, Math.min(vinylTracks.length - 1, index))
    this.ensureAudio()
    this.load()
  }

  /** 预热音频图：提前建好 AudioContext、媒体源、频谱与底噪（母带增益为 0，不出声）。
      intro 开始的那一刻只剩 play() 与音量拉起，避免在标题动画启动时再创建音频节点造成卡顿 */
  warm() {
    this.ensure()
    const ctx = this.ctx
    if (!ctx) return
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {
        /* 没有用户手势时上下文会保持 suspended，等 armUnlock 再恢复 */
      })
    }
    this.startNoise()
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
    /* 本地时钟期间音频没在播，把指针挪到本地时钟上即可 */
    if (this.virtual) {
      this.virtualBase = target
      this.virtualSince = performance.now()
      return
    }
    if (this.resumeAt > 0) {
      this.resumeAt = target
      return
    }
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

    /* 之前被策略逼成了静音起播：这次起播多半来自按钮点击，
       在手势里把静音摘掉，声音就能直接接上 */
    const audio = this.audio
    if (audio && audio.muted) {
      audio.muted = false
      this.silent = false
    }

    /* 没有用户手势时浏览器只允许建上下文、不放声：录一次手势，之后自动接上 */
    if (ctx.state === 'suspended') {
      void ctx.resume()
      this.armUnlock(ctx)
    }

    this.master.gain.setTargetAtTime(this.volume, ctx.currentTime, 0.18)
    this.startNoise()
    this.load()

    /* 上次在本地时钟上暂停过：把播放头挪到那个位置再起播 */
    if (this.resumeAt > 0) {
      const at = this.resumeAt
      this.resumeAt = 0
      if (audio) {
        try {
          audio.currentTime = at
        } catch {
          /* 元数据没到就从头放 */
        }
      }
    }

    this.startAudio()
  }

  pause() {
    if (!this.playing) return
    /* 本地时钟播放中暂停：记下当前位置，恢复时从这里接上 */
    if (this.virtual) {
      this.resumeAt = this.virtualAt()
      this.stopVirtual()
    }
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
    this.stopVirtual()
    this.playing = false
    this.silent = false
    this.resumeAt = 0

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
        /* 被自动播放策略拦下：退回静音起播，进度与唱片照常从这一刻走 */
        this.startSilent()
      })
    }
  }

  /** 浏览器不允许有声自动播放时，先试静音起播：
      静音元素能播的话，时间轴照样从加载结束那一刻走，第一次手势再摘掉静音。 */
  private startSilent() {
    const audio = this.audio
    if (!audio || !this.playing || audio.muted) return

    this.silent = true
    audio.muted = true

    const ctx = this.ctx
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
      this.armUnlock(ctx)
    }

    const started = audio.play()
    const fallback = () => {
      /* Chrome 对 <audio> 很严格，静音也可能被拦：这时改走本地时钟 */
      if (this.playing && this.audio === audio && audio.paused) this.beginVirtual()
    }
    if (started && typeof started.catch === 'function') started.catch(fallback)
    else fallback()

    if (this.virtualTimer) window.clearTimeout(this.virtualTimer)
    this.virtualTimer = window.setTimeout(fallback, 500)
  }

  /** 本地时钟：音频真的放不出来时，用 performance.now() 推播放头。
      唱片、进度与自动切歌和真播放一模一样，手势解锁后再把声音接到这个位置。 */
  private virtualAt() {
    return Math.max(0, this.virtualBase + (performance.now() - this.virtualSince) / 1000)
  }

  private beginVirtual() {
    if (this.virtual) return
    this.virtual = true
    this.virtualBase = 0
    this.virtualSince = performance.now()

    const ctx = this.ctx
    if (ctx) this.armUnlock(ctx)
  }

  private stopVirtual() {
    this.virtual = false
    this.virtualBase = 0
    this.virtualSince = 0
    if (this.virtualTimer) window.clearTimeout(this.virtualTimer)
    this.virtualTimer = 0
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
      const audio = this.audio
      /* 手势里允许有声播放：先把静音摘掉，再恢复上下文，声音从当前位置接上 */
      if (audio && this.silent) {
        audio.muted = false
        this.silent = false
      }
      /* 本地时钟期间音频其实没播过：先把界面上的位置写进播放头 */
      if (audio && this.virtual) {
        const total = this.duration
        const at = this.virtualAt()
        try {
          audio.currentTime = total > 0 ? Math.min(Math.max(0, at), Math.max(0, total - 0.08)) : at
        } catch {
          /* 元数据没到就从头放 */
        }
        this.stopVirtual()
      }
      if (ctx.state === 'suspended') void ctx.resume()
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
